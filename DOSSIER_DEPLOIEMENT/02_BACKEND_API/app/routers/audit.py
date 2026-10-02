from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_
from typing import List, Optional, Any, Dict
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import csv
import io
import json

from ..database import get_db
from .. import crud, schemas, models
from ..timezone_utils import now_abidjan, today_abidjan, format_datetime_abidjan
from .auth import get_school_scope, SchoolScope

router = APIRouter(
    prefix="/audit",
    tags=["Audit & Sécurité"]
)


class AuditLogCreate(BaseModel):
    action: str
    module: str
    detail: Optional[str] = None
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    statut: Optional[str] = "SUCCES"
    user_id: Optional[int] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    ecole_id: Optional[int] = None
    ET_CODEETABLISSEMENT: Optional[str] = None
    ville: Optional[str] = None


def get_client_ip(request: Optional[Request]) -> str:
    """Extrait l'adresse IP réelle du client depuis la requête HTTP."""
    if not request:
        return "127.0.0.1"
    
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    if request.client and request.client.host:
        return request.client.host
    
    return "127.0.0.1"


def get_user_agent(request: Optional[Request]) -> str:
    """Extrait l'User-Agent du client."""
    if not request:
        return "System"
    return request.headers.get("User-Agent", "Inconnu")[:500]


def log_audit(
    db: Session,
    action: str,
    module: str,
    detail: Optional[str] = None,
    user: Optional[Any] = None,
    username: Optional[str] = None,
    role: Optional[str] = None,
    ecole_id: Optional[int] = None,
    code_etablissement: Optional[str] = None,
    ville: Optional[str] = None,
    target_id: Optional[Any] = None,
    target_name: Optional[str] = None,
    statut: str = "SUCCES",
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request: Optional[Request] = None
) -> Optional[models.AuditLog]:
    """
    Fonction utilitaire globale pour enregistrer un événement dans le journal d'audit de sécurité.
    Exécutée de manière sécurisée (ne lève pas d'exception bloquante en cas d'erreur).
    """
    try:
        # Résolution de l'identité utilisateur
        eff_user_id = None
        eff_username = username
        eff_role = role
        eff_ecole_id = ecole_id
        eff_code = code_etablissement
        eff_ville = ville

        if user:
            eff_user_id = getattr(user, "id", None)
            if not eff_username:
                first = getattr(user, "first_name", "") or ""
                last = getattr(user, "last_name", "") or ""
                nom_complet = f"{first} {last}".strip()
                eff_username = nom_complet or getattr(user, "username", None) or getattr(user, "email", "Utilisateur")
            if not eff_role:
                eff_role = getattr(user, "PROFIL", None) or ("superuser" if getattr(user, "is_superuser", False) else "utilisateur")
            if not eff_code:
                eff_code = getattr(user, "ET_CODEETABLISSEMENT", None)
            if not eff_ville:
                eff_ville = getattr(user, "ville", None)

        # Extraction réseau
        eff_ip = ip_address or get_client_ip(request)
        eff_ua = user_agent or get_user_agent(request)

        # Création de l'entrée d'audit
        audit_entry = models.AuditLog(
            timestamp=datetime.utcnow(),
            user_id=eff_user_id,
            username=eff_username or "Système",
            user_role=eff_role or "system",
            ecole_id=eff_ecole_id,
            ET_CODEETABLISSEMENT=eff_code,
            ville=eff_ville,
            action=action.strip().upper(),
            module=module.strip().upper(),
            target_id=str(target_id) if target_id is not None else None,
            target_name=target_name,
            detail=detail,
            statut=statut.strip().upper(),
            ip_address=eff_ip,
            user_agent=eff_ua
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        print(f"[AUDIT LOG ERROR] Impossible d'enregistrer l'audit log: {e}")
        return None


@router.get("/logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    username: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    ville: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope),
):
    """
    Récupère la liste filtrée et paginée du journal d'audit de sécurité.
    Applique automatiquement le périmètre de sécurité de l'utilisateur connecté.
    """
    query = db.query(models.AuditLog)

    # Filtrage périmètre école (sauf si rôle global superuser / direction fondation)
    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        conds = []
        if auth_ids:
            conds.append(models.AuditLog.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(models.AuditLog.ET_CODEETABLISSEMENT.in_(auth_codes))
        if scope.ville:
            conds.append(func.lower(models.AuditLog.ville) == scope.ville.lower().strip())
        if conds:
            query = query.filter(or_(*conds))

    # Filtres explicites
    if ecole_id:
        query = query.filter(models.AuditLog.ecole_id == ecole_id)
    if code_etablissement:
        query = query.filter(func.upper(models.AuditLog.ET_CODEETABLISSEMENT) == code_etablissement.strip().upper())
    if ville:
        query = query.filter(func.lower(models.AuditLog.ville) == ville.strip().lower())
    if module and module != "tous" and module != "all":
        query = query.filter(func.upper(models.AuditLog.module) == module.strip().upper())
    if action and action != "tous" and action != "all":
        query = query.filter(func.upper(models.AuditLog.action) == action.strip().upper())
    if statut and statut != "tous" and statut != "all":
        query = query.filter(func.upper(models.AuditLog.statut) == statut.strip().upper())
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if username:
        query = query.filter(models.AuditLog.username.ilike(f"%{username.strip()}%"))
    if role and role != "tous" and role != "all":
        query = query.filter(func.lower(models.AuditLog.user_role) == role.strip().lower())

    # Filtres dates
    if date_debut:
        try:
            d_start = datetime.strptime(date_debut.strip(), "%Y-%m-%d")
            query = query.filter(models.AuditLog.timestamp >= d_start)
        except Exception:
            pass
    if date_fin:
        try:
            d_end = datetime.strptime(date_fin.strip(), "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.AuditLog.timestamp < d_end)
        except Exception:
            pass

    # Recherche plein texte
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.AuditLog.username.ilike(s),
                models.AuditLog.action.ilike(s),
                models.AuditLog.module.ilike(s),
                models.AuditLog.detail.ilike(s),
                models.AuditLog.target_name.ilike(s),
                models.AuditLog.target_id.ilike(s),
                models.AuditLog.ip_address.ilike(s),
                models.AuditLog.ET_CODEETABLISSEMENT.ilike(s),
                models.AuditLog.ville.ilike(s),
            )
        )

    total = query.count()
    items = (
        query.order_by(desc(models.AuditLog.timestamp), desc(models.AuditLog.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    pages = (total + page_size - 1) // page_size if page_size > 0 else 1

    formatted_items = []
    for item in items:
        formatted_items.append({
            "id": item.id,
            "timestamp": item.timestamp.isoformat() if item.timestamp else None,
            "user_id": item.user_id,
            "username": item.username or "Système",
            "user_role": item.user_role or "system",
            "ecole_id": item.ecole_id,
            "code_etablissement": item.ET_CODEETABLISSEMENT,
            "ville": item.ville,
            "action": item.action,
            "module": item.module,
            "target_id": item.target_id,
            "target_name": item.target_name,
            "detail": item.detail,
            "statut": item.statut or "SUCCES",
            "ip_address": item.ip_address or "127.0.0.1",
            "user_agent": item.user_agent,
        })

    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope),
    ecole_id: Optional[int] = Query(None),
    code_etablissement: Optional[str] = Query(None),
    ville: Optional[str] = Query(None),
):
    """
    Fournit les indicateurs clés de sécurité et de traçabilité en temps réel.
    """
    query = db.query(models.AuditLog)

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        conds = []
        if auth_ids:
            conds.append(models.AuditLog.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(models.AuditLog.ET_CODEETABLISSEMENT.in_(auth_codes))
        if scope.ville:
            conds.append(func.lower(models.AuditLog.ville) == scope.ville.lower().strip())
        if conds:
            query = query.filter(or_(*conds))

    if ecole_id:
        query = query.filter(models.AuditLog.ecole_id == ecole_id)
    if code_etablissement:
        query = query.filter(func.upper(models.AuditLog.ET_CODEETABLISSEMENT) == code_etablissement.strip().upper())
    if ville:
        query = query.filter(func.lower(models.AuditLog.ville) == ville.strip().lower())

    total_logs = query.count()

    # Logs des dernières 24 heures
    since_24h = datetime.utcnow() - timedelta(hours=24)
    logs_24h = query.filter(models.AuditLog.timestamp >= since_24h).count()

    # Échecs et alertes
    failed_logins = query.filter(
        models.AuditLog.timestamp >= since_24h,
        or_(
            models.AuditLog.action == "TENTATIVE_ECHOUEE",
            models.AuditLog.action == "ECHEC_CONNEXION",
            models.AuditLog.statut == "ECHEC",
            models.AuditLog.statut == "ALERTE_SECURITE",
        )
    ).count()

    critical_actions = query.filter(
        or_(
            models.AuditLog.action.in_(["SUPPRESSION", "PURGE", "MODIFICATION_ROLE", "REINITIALISATION_MOT_DE_PASSE"]),
            models.AuditLog.statut == "ALERTE_SECURITE"
        )
    ).count()

    # Répartition par module
    by_module_raw = (
        db.query(models.AuditLog.module, func.count(models.AuditLog.id))
        .group_by(models.AuditLog.module)
        .order_by(desc(func.count(models.AuditLog.id)))
        .limit(10)
        .all()
    )
    by_module = {m: c for m, c in by_module_raw if m}

    # Répartition par statut
    by_statut_raw = (
        db.query(models.AuditLog.statut, func.count(models.AuditLog.id))
        .group_by(models.AuditLog.statut)
        .all()
    )
    by_statut = {s: c for s, c in by_statut_raw if s}

    return {
        "total_logs": total_logs,
        "logs_24h": logs_24h,
        "failed_logins_24h": failed_logins,
        "critical_actions": critical_actions,
        "by_module": by_module,
        "by_statut": by_statut,
    }


@router.post("/log")
def create_audit_event(
    event: AuditLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope),
):
    """
    Enregistre un événement d'audit explicite (ex: action UI frontend, impression de reçu, export).
    """
    eff_user = scope.user
    eff_username = event.username or (scope.username if scope.username else None)
    eff_role = event.user_role or (scope.role if scope.role else None)
    eff_ecole_id = event.ecole_id or scope.ecole_id
    eff_code = event.ET_CODEETABLISSEMENT or scope.code_etablissement
    eff_ville = event.ville or scope.ville

    entry = log_audit(
        db=db,
        action=event.action,
        module=event.module,
        detail=event.detail,
        user=eff_user,
        username=eff_username,
        role=eff_role,
        ecole_id=eff_ecole_id,
        code_etablissement=eff_code,
        ville=eff_ville,
        target_id=event.target_id,
        target_name=event.target_name,
        statut=event.statut or "SUCCES",
        request=request
    )

    if not entry:
        raise HTTPException(status_code=500, detail="Impossible d'enregistrer le log d'audit.")

    return {
        "id": entry.id,
        "message": "Événement d'audit consigné avec succès.",
        "timestamp": entry.timestamp.isoformat()
    }


@router.get("/export")
def export_audit_logs_csv(
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    date_debut: Optional[str] = Query(None),
    date_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    scope: SchoolScope = Depends(get_school_scope),
):
    """
    Exporte le journal d'audit au format CSV standard pour conformité et inspections administratives.
    """
    query = db.query(models.AuditLog)

    if not scope.is_global:
        auth_ids = scope.get_authorized_school_ids(db)
        auth_codes = scope.get_authorized_school_codes(db)
        conds = []
        if auth_ids:
            conds.append(models.AuditLog.ecole_id.in_(auth_ids))
        if auth_codes:
            conds.append(models.AuditLog.ET_CODEETABLISSEMENT.in_(auth_codes))
        if conds:
            query = query.filter(or_(*conds))

    if module and module != "tous":
        query = query.filter(func.upper(models.AuditLog.module) == module.strip().upper())
    if action and action != "tous":
        query = query.filter(func.upper(models.AuditLog.action) == action.strip().upper())
    if statut and statut != "tous":
        query = query.filter(func.upper(models.AuditLog.statut) == statut.strip().upper())

    if date_debut:
        try:
            d_start = datetime.strptime(date_debut.strip(), "%Y-%m-%d")
            query = query.filter(models.AuditLog.timestamp >= d_start)
        except Exception:
            pass
    if date_fin:
        try:
            d_end = datetime.strptime(date_fin.strip(), "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.AuditLog.timestamp < d_end)
        except Exception:
            pass

    logs = query.order_by(desc(models.AuditLog.timestamp)).limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "ID", "Horodatage (UTC)", "Utilisateur", "Rôle", "Établissement", "Ville",
        "Module", "Action", "Cible", "Détail", "Statut", "Adresse IP", "User-Agent"
    ])

    for l in logs:
        writer.writerow([
            l.id,
            l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "",
            l.username or "Système",
            l.user_role or "system",
            l.ET_CODEETABLISSEMENT or "",
            l.ville or "",
            l.module,
            l.action,
            f"{l.target_name or ''} ({l.target_id or ''})".strip(),
            l.detail or "",
            l.statut or "SUCCES",
            l.ip_address or "",
            (l.user_agent or "")[:150]
        ])

    csv_content = output.getvalue()
    filename = f"journal_audit_securite_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
