"""Badges QR pour élèves — génération de codes QR avec infos élève."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    qrcode = None
    HAS_QRCODE = False

from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..routers.auth import get_school_scope, SchoolScope

router = APIRouter(prefix="/badges", tags=["Badges QR"])


@router.get("/eleve/{eleve_id}/qr")
async def generer_badge_qr(
    eleve_id: int,
    scope: SchoolScope = Depends(get_school_scope),
    db: Session = Depends(get_db),
):
    """Retourne le QR code d'un élève au format PNG.

    Accès : directeur, éducateur, enseignant, ou l'élève/parent pour lui-même
    """
    if not HAS_QRCODE:
        raise HTTPException(
            status_code=503,
            detail="Le module qrcode n'est pas installé sur le serveur (pip install qrcode pillow)."
        )

    eleve = db.query(models.Eleve).filter(models.Eleve.id == eleve_id).first()
    if not eleve:
        raise HTTPException(status_code=404, detail="Élève introuvable.")

    # Vérification des permissions
    is_student_or_parent = (
        scope.role in ("eleve", "parent") and scope.student and scope.student.id == eleve_id
    )
    can_access = scope.role in ("directeur_ecole", "educateur", "enseignant", "admin", "direction_fondation") or is_student_or_parent
    if not can_access and not scope.is_global:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce badge.")

    # Vérifier l'école si utilisateur non-global
    if scope.ecole_id and eleve.ecole_id and eleve.ecole_id != scope.ecole_id:
        if not scope.is_global:
            raise HTTPException(status_code=403, detail="Élève d'une autre école.")

    # Récupérer la classe pour affichage
    classe = db.query(models.Classe).filter(models.Classe.id == eleve.classe_id).first()
    classe_nom = classe.CE_LIBELLE if classe else "—"

    # Format du contenu QR : pipe-délimité
    contenu = f"ELEVE|{eleve.id}|{eleve.AU_MATRICULE or f'MAT-{eleve.id}'}|{eleve.AU_NOM or '—'}|{eleve.AU_PRENOM or '—'}|{classe_nom}|{eleve.ET_CODEETABLISSEMENT or '—'}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(contenu)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convertir en bytes
    img_io = io.BytesIO()
    img.save(img_io)
    img_io.seek(0)

    return StreamingResponse(img_io, media_type="image/png")

