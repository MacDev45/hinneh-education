import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# ─── Dossiers d'upload ──────────────────────────────────────────────────────
BASE_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

# Photos élèves / personnel
PHOTO_DIR = os.path.join(BASE_UPLOAD_DIR, "photos")

# Assets école : logos, signatures, cachets  (utilisés dans les bulletins & reçus)
LOGO_DIR      = os.path.join(BASE_UPLOAD_DIR, "school_assets", "logos")
SIGNATURE_DIR = os.path.join(BASE_UPLOAD_DIR, "school_assets", "signatures")
CACHET_DIR    = os.path.join(BASE_UPLOAD_DIR, "school_assets", "cachets")

for d in [PHOTO_DIR, LOGO_DIR, SIGNATURE_DIR, CACHET_DIR]:
    os.makedirs(d, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 Mo


# ─── Utilitaire ─────────────────────────────────────────────────────────────
async def _save_file(file: UploadFile, dest_dir: str, url_prefix: str) -> dict:
    """Valide et enregistre un fichier image, retourne l'URL relative."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorisé : {file.content_type}. Formats acceptés : JPG, PNG, WebP."
        )
    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Fichier trop volumineux. Taille maximale : 5 Mo."
        )
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(dest_dir, unique_name)
    with open(dest_path, "wb") as f:
        f.write(contents)
    return {"url": f"{url_prefix}/{unique_name}", "filename": unique_name}


def _delete_file(directory: str, filename: str):
    """Supprime un fichier en toute sécurité."""
    safe_name = os.path.basename(filename)
    file_path = os.path.join(directory, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier introuvable.")
    os.remove(file_path)


# ════════════════════════════════════════════════════════════════════════════
#  PHOTOS élèves / personnel
# ════════════════════════════════════════════════════════════════════════════

@router.post("/photo")
async def upload_photo(file: UploadFile = File(...)):
    """Upload une photo d'élève ou de personnel."""
    result = await _save_file(file, PHOTO_DIR, "/api/uploads/photos")
    return JSONResponse(content=result)


@router.delete("/photo/{filename}")
async def delete_photo(filename: str):
    """Supprime une photo d'élève ou de personnel."""
    _delete_file(PHOTO_DIR, filename)
    return JSONResponse(content={"message": "Photo supprimée avec succès."})


# ════════════════════════════════════════════════════════════════════════════
#  LOGOS école  (bulletin, reçu de paiement…)
# ════════════════════════════════════════════════════════════════════════════

@router.post("/school/logo")
async def upload_logo(file: UploadFile = File(...)):
    """
    Upload le logo d'un établissement.
    L'URL retournée peut être intégrée directement dans les bulletins et reçus.
    """
    result = await _save_file(file, LOGO_DIR, "/api/uploads/school_assets/logos")
    return JSONResponse(content=result)


@router.delete("/school/logo/{filename}")
async def delete_logo(filename: str):
    """Supprime un logo d'établissement."""
    _delete_file(LOGO_DIR, filename)
    return JSONResponse(content={"message": "Logo supprimé avec succès."})


# ════════════════════════════════════════════════════════════════════════════
#  SIGNATURES (directeur, comptable…)
# ════════════════════════════════════════════════════════════════════════════

@router.post("/school/signature")
async def upload_signature(file: UploadFile = File(...)):
    """
    Upload une image de signature (directeur, comptable…).
    Utilisée en bas des bulletins et reçus de paiement.
    """
    result = await _save_file(file, SIGNATURE_DIR, "/api/uploads/school_assets/signatures")
    return JSONResponse(content=result)


@router.delete("/school/signature/{filename}")
async def delete_signature(filename: str):
    """Supprime une signature."""
    _delete_file(SIGNATURE_DIR, filename)
    return JSONResponse(content={"message": "Signature supprimée avec succès."})


# ════════════════════════════════════════════════════════════════════════════
#  CACHETS / TAMPONS officiels
# ════════════════════════════════════════════════════════════════════════════

@router.post("/school/cachet")
async def upload_cachet(file: UploadFile = File(...)):
    """
    Upload un cachet / tampon officiel de l'établissement.
    Utilisé sur les bulletins et reçus de paiement.
    """
    result = await _save_file(file, CACHET_DIR, "/api/uploads/school_assets/cachets")
    return JSONResponse(content=result)


@router.delete("/school/cachet/{filename}")
async def delete_cachet(filename: str):
    """Supprime un cachet."""
    _delete_file(CACHET_DIR, filename)
    return JSONResponse(content={"message": "Cachet supprimé avec succès."})


# ════════════════════════════════════════════════════════════════════════════
#  LISTE des assets disponibles par type
# ════════════════════════════════════════════════════════════════════════════

@router.get("/school/assets")
async def list_school_assets():
    """
    Retourne la liste de tous les assets école disponibles
    (logos, signatures, cachets) avec leurs URLs.
    """
    def _list(directory: str, url_prefix: str):
        if not os.path.isdir(directory):
            return []
        return [
            {"filename": f, "url": f"{url_prefix}/{f}"}
            for f in os.listdir(directory)
            if os.path.isfile(os.path.join(directory, f))
        ]

    return JSONResponse(content={
        "logos":      _list(LOGO_DIR,      "/api/uploads/school_assets/logos"),
        "signatures": _list(SIGNATURE_DIR, "/api/uploads/school_assets/signatures"),
        "cachets":    _list(CACHET_DIR,    "/api/uploads/school_assets/cachets"),
    })
