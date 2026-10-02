"""Dossiers scolaires — consultation complète de chaque élève.

Endpoint : GET /api/dossiers/eleve/{eleve_id}
Accès : directeur, éducateur, superadmin
Retourne : infos élève + historique paiement + notes + moyennes + absences + sanctions
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta
from collections import defaultdict

from .. import models, schemas
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/dossiers", tags=["Dossiers Scolaires"])


class ResumePaiement(schemas.BaseModel):
    date: Optional[str]
    montant: float
    type_paiement: str
    mode: str
    statut: str


class ResumeNote(schemas.BaseModel):
    matiere: str
    note: float
    coefficient: float
    date: Optional[str]


class ResumeMoyenne(schemas.BaseModel):
    periode: str  # trimestre ou mois
    moyenne_generale: float
    rang: Optional[int] = None
    appreciation: Optional[str] = None


class ResumeAbsence(schemas.BaseModel):
    date: str
    justifiee: bool
    raison: Optional[str] = None


class ResumeMoyenneMatiere(schemas.BaseModel):
    matiere: str
    moyenne: float
    coefficient: float
    appreciation: str
    rang: Optional[int] = None


class DossierEleve(schemas.BaseModel):
    # Infos élève
    id: int
    matricule: str
    nom: str
    prenom: str
    date_naissance: Optional[str] = None
    lieu_naissance: Optional[str] = None
    genre: Optional[str] = "M"
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    nom_tuteur: Optional[str] = None
    telephone_tuteur: Optional[str] = None
    classe: str
    niveau: str
    cycle: Optional[str] = "Secondaire"
    ecole_nom: str
    ecole_code: str
    ecole_id: Optional[int] = None

    # Données spécifiques départ / radiation
    motif_depart: Optional[str] = None
    date_sortie: Optional[str] = None
    qualite_travail_depart: Optional[str] = None
    etat_conduite_depart: Optional[str] = None
    observations_depart: Optional[str] = None

    # Statut financier
    scolarite_due: float = 0.0
    total_verse: float = 0.0
    solde_reste: float = 0.0
    taux_recouvrement_pct: float = 0.0

    # Derniers paiements
    derniers_paiements: list[ResumePaiement] = []

    # Dernières notes
    dernieres_notes: list[ResumeNote] = []

    # Moyennes par période (Trimestres)
    moyennes: list[ResumeMoyenne] = []

    # Moyennes calculées par matière pour le livret
    moyennes_matieres: list[ResumeMoyenneMatiere] = []
    moyenne_annuelle: Optional[float] = None
    rang_annuel: Optional[int] = None
    effectif_classe: Optional[int] = None

    # Absences & Assiduité
    absences_recent: list[ResumeAbsence] = []
    absences_total_non_justifiees: int = 0
    absences_total_justifiees: int = 0
    retards_total: int = 0

    # Sanctions disciplinaires officielles
    sanctions_disciplinaires: list[str] = []


def _appreciation_for_moyenne(moy: float) -> str:
    if moy >= 16:
        return "Très Bien"
    elif moy >= 14:
        return "Bien"
    elif moy >= 12:
        return "Assez Bien"
    elif moy >= 10:
        return "Passable"
    elif moy >= 8.5:
        return "Faible"
    else:
        return "Très Insuffisant"


@router.get("/eleve/{eleve_id}", response_model=DossierEleve)
async def consulter_dossier_eleve(
    eleve_id: int,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Retourne le dossier scolaire complet d'un élève : état civil, moyennes, notes, sanctions et absences."""

    # ─── Lecture de l'élève ──────────────────────────────────────────────────
    eleve = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=404, detail="Élève introuvable.")

    # Vérification d'accès par établissement
    if scope.ecole_id and eleve.ecole_id and eleve.ecole_id != scope.ecole_id:
        if not scope.is_global and scope.role not in ("superuser", "direction_fondation", "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à cet élève."
            )

    # ─── Écheancier et finance ───────────────────────────────────────────────
    scolarite_due = float(eleve.AU_SCOLARITE or 0)
    total_verse = float(eleve.AU_TOTALDEPOT or 0)
    solde_reste = max(0.0, scolarite_due - total_verse)
    taux_recouvrement_pct = round((total_verse / scolarite_due * 100) if scolarite_due > 0 else 0.0, 1)

    paiements = db.query(models.Paiement).filter(
        models.Paiement.eleve_id == eleve_id,
        models.Paiement.statut != "annule"
    ).order_by(models.Paiement.date.desc()).limit(10).all()

    derniers_paiements = [
        ResumePaiement(
            date=p.date.isoformat() if p.date else None,
            montant=float(p.montant or 0),
            type_paiement=p.type or "autre",
            mode=p.mode or "—",
            statut=p.statut or "enregistré"
        )
        for p in paiements
    ]

    # ─── Évaluations, notes et moyennes calculées ─────────────────────────────
    evaluations = db.query(models.Evaluation).filter(
        models.Evaluation.eleve_id == eleve_id
    ).order_by(models.Evaluation.date.desc()).all()

    dernieres_notes = [
        ResumeNote(
            matiere=ev.matiere or "—",
            note=float(ev.note or 0),
            coefficient=float(ev.poids or 1),
            date=ev.date.isoformat() if ev.date else None
        )
        for ev in evaluations[:20]
    ]

    # ─── Calcul robuste des moyennes par période (Trimestres 1, 2, 3) ─────────
    moyennes: list[ResumeMoyenne] = []
    evals_by_trimester = defaultdict(list)
    for ev in evaluations:
        t = getattr(ev, "trimestre", None) or 1
        evals_by_trimester[int(t)].append(ev)

    for trim in sorted(evals_by_trimester.keys()):
        ev_list = evals_by_trimester[trim]
        total_poids = sum(float(e.poids or 1) for e in ev_list)
        total_points = sum(float(e.note or 0) * float(e.poids or 1) for e in ev_list)
        moy_trim = round(total_points / max(total_poids, 1.0), 2)
        moyennes.append(ResumeMoyenne(
            periode=f"Trimestre {trim}",
            moyenne_generale=moy_trim,
            rang=None,
            appreciation=_appreciation_for_moyenne(moy_trim)
        ))

    # ─── Calcul des moyennes par matière ──────────────────────────────────────
    evals_by_matiere = defaultdict(list)
    for ev in evaluations:
        m = (ev.matiere or "").strip()
        if m:
            evals_by_matiere[m].append(ev)

    moyennes_matieres: list[ResumeMoyenneMatiere] = []
    for mat in sorted(evals_by_matiere.keys()):
        m_list = evals_by_matiere[mat]
        total_p = sum(float(e.poids or 1) for e in m_list)
        total_pts = sum(float(e.note or 0) * float(e.poids or 1) for e in m_list)
        moy_mat = round(total_pts / max(total_p, 1.0), 2)
        avg_coeff = round(total_p / max(len(m_list), 1), 1)
        moyennes_matieres.append(ResumeMoyenneMatiere(
            matiere=mat,
            moyenne=moy_mat,
            coefficient=avg_coeff,
            appreciation=_appreciation_for_moyenne(moy_mat),
            rang=None
        ))

    # Moyenne annuelle globale
    moyenne_annuelle = None
    if evaluations:
        total_all_poids = sum(float(e.poids or 1) for e in evaluations)
        total_all_points = sum(float(e.note or 0) * float(e.poids or 1) for e in evaluations)
        moyenne_annuelle = round(total_all_points / max(total_all_poids, 1.0), 2)

    # ─── Assiduité & Retards ──────────────────────────────────────────────────
    date_limite = datetime.utcnow() - timedelta(days=30)

    presences_toutes = db.query(models.Presence).filter(
        models.Presence.eleve_id == eleve_id
    ).all()

    absences_recent = [
        ResumeAbsence(
            date=p.date.isoformat() if p.date else "—",
            justifiee=bool(p.justification),
            raison=p.justification or None
        )
        for p in presences_toutes
        if p.statut == "absent" and p.date and (
            (isinstance(p.date, datetime) and p.date >= date_limite) or
            (hasattr(p.date, "year") and p.date >= date_limite.date())
        )
    ]

    absences_annee = [p for p in presences_toutes if p.statut == "absent"]
    absences_justifiees = sum(1 for a in absences_annee if bool(a.justification))
    absences_non_justifiees = len(absences_annee) - absences_justifiees
    retards_total = sum(1 for p in presences_toutes if p.statut == "retard")

    # ─── Sanctions disciplinaires ─────────────────────────────────────────────
    sanctions: list[str] = []
    if absences_non_justifiees >= 30:
        sanctions.append(f"Blâme pour absences injustifiées répétées ({absences_non_justifiees} heures)")
    elif absences_non_justifiees >= 15:
        sanctions.append(f"Avertissement pour assiduité ({absences_non_justifiees} heures d'absences)")

    if retards_total >= 10:
        sanctions.append(f"Avertissement pour retards fréquents ({retards_total} retards)")

    if moyenne_annuelle is not None:
        if moyenne_annuelle < 8.5:
            sanctions.append("Avertissement pour travail très insuffisant")
        elif moyenne_annuelle < 10.0:
            sanctions.append("Mise en garde pour travail insuffisant")

    # Observations formelles de départ
    if getattr(eleve, "AU_ETATCONDUITEDEPART", None):
        sanctions.append(f"Observation de conduite : {eleve.AU_ETATCONDUITEDEPART}")

    if getattr(eleve, "AU_QUALITETRAVAILDEPART", None):
        sanctions.append(f"Appréciation de travail : {eleve.AU_QUALITETRAVAILDEPART}")

    if not sanctions:
        sanctions.append("Aucune sanction disciplinaire enregistrée — Conduite satisfaisante")

    # ─── Classe, Cycle et École ──────────────────────────────────────────────
    classe = db.query(models.Classe).filter(models.Classe.id == eleve.classe_id).first() if eleve.classe_id else None
    classe_nom = classe.CE_LIBELLE if classe else (getattr(eleve, "classe_nom", None) or "Non assignée")

    effectif_classe = None
    if eleve.classe_id:
        effectif_classe = db.query(models.Eleve).filter(
            models.Eleve.classe_id == eleve.classe_id,
            models.Eleve.statut == "actif"
        ).count()

    cycle_nom = "Secondaire"
    if classe and getattr(classe, "cycle", None):
        cycle_nom = getattr(classe.cycle, "libelle", None) or getattr(classe.cycle, "code", None) or "Secondaire"

    ecole = db.query(models.Etablissement).filter(
        models.Etablissement.IDETABLISSEMENT == eleve.ecole_id
    ).first() if eleve.ecole_id else None
    ecole_nom = ecole.ET_DENOMMINATION if ecole else "GROUPE SCOLAIRE HÎNNEH"
    ecole_code = ecole.ET_CODEETABLISSEMENT if ecole else "FHA"

    return DossierEleve(
        id=eleve.id,
        matricule=getattr(eleve, "matricule", None) or getattr(eleve, "AU_MATRICULE", None) or f"MAT-{eleve.id}",
        nom=getattr(eleve, "nom", None) or getattr(eleve, "AU_NOM", None) or "—",
        prenom=getattr(eleve, "prenom", None) or getattr(eleve, "AU_PRENOM", None) or "—",
        date_naissance=eleve.date_naissance.isoformat() if getattr(eleve, "date_naissance", None) else getattr(eleve, "AU_DATE_NAISSANCE", None),
        lieu_naissance=getattr(eleve, "AU_LIEU_NAISSANCE", None) or getattr(eleve, "lieu_naissance", None) or "",
        genre=getattr(eleve, "AU_GENRE", None) or getattr(eleve, "genre", None) or "M",
        email=getattr(eleve, "AU_E_MAIL", None) or getattr(eleve, "email", None),
        telephone=getattr(eleve, "AU_CONTACTS", None) or getattr(eleve, "telephone", None),
        adresse=getattr(eleve, "AU_ADRESSE", None) or getattr(eleve, "adresse", None) or "",
        nom_tuteur=getattr(eleve, "AU_TUTEURLEGAL", None) or getattr(eleve, "nom_parent", None) or getattr(eleve, "nom_tuteur", None),
        telephone_tuteur=getattr(eleve, "AU_TUTEURLEGALCONTACTS", None) or getattr(eleve, "contact_parent", None) or getattr(eleve, "telephone_tuteur", None),
        classe=classe_nom,
        niveau=getattr(classe, "niveau_code", None) or getattr(classe, "niveau", None) or "—",
        cycle=cycle_nom,
        ecole_nom=ecole_nom,
        ecole_code=ecole_code,
        ecole_id=eleve.ecole_id,
        motif_depart=getattr(eleve, "AU_RAISONDUDEPART", None),
        date_sortie=eleve.AU_DATESORTIE.isoformat() if getattr(eleve, "AU_DATESORTIE", None) else None,
        qualite_travail_depart=getattr(eleve, "AU_QUALITETRAVAILDEPART", None),
        etat_conduite_depart=getattr(eleve, "AU_ETATCONDUITEDEPART", None),
        observations_depart=getattr(eleve, "AU_OBSERVATION", None),
        scolarite_due=scolarite_due,
        total_verse=total_verse,
        solde_reste=solde_reste,
        taux_recouvrement_pct=taux_recouvrement_pct,
        derniers_paiements=derniers_paiements,
        dernieres_notes=dernieres_notes,
        moyennes=moyennes,
        moyennes_matieres=moyennes_matieres,
        moyenne_annuelle=moyenne_annuelle,
        rang_annuel=None,
        effectif_classe=effectif_classe,
        absences_recent=absences_recent,
        absences_total_non_justifiees=absences_non_justifiees,
        absences_total_justifiees=absences_justifiees,
        retards_total=retards_total,
        sanctions_disciplinaires=sanctions,
    )
