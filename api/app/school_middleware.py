"""Établissement actif : contexte de requête.

Toute écriture en base doit porter le code de l'établissement sous lequel l'action
a été faite. Le mécanisme d'estampillage vit dans `database.py` (listener
`before_flush`) : il complète `ET_CODEETABLISSEMENT` et `ecole_id` sur chaque objet
créé ou modifié, en les déduisant d'abord des entités liées (élève, classe,
personnel…), et à défaut de l'établissement actif de la requête.

Ce module fournit cet établissement actif. Il l'installe pour **toutes** les
requêtes, y compris celles dont la route n'utilise pas la dépendance
`get_school_scope` — sans quoi une écriture partant d'un routeur qui gère lui-même
son authentification repartirait sans code d'établissement.

Deux niveaux se superposent volontairement :

1. cet intercepteur pose une valeur de base, lue dans le jeton et les en-têtes,
   sans le moindre accès à la base de données ;
2. `get_school_scope`, quand la route en dépend, la remplace par la résolution
   complète (personnel rattaché, élève connecté, école choisie par un
   administrateur global).

L'intercepteur remet aussi le contexte à zéro avant et après chaque requête : les
routes synchrones de FastAPI s'exécutent sur un pool de threads réutilisés, et un
contexte résiduel estampillerait les écritures d'une requête avec le code de
l'école de la précédente.
"""

from typing import Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .database import reset_active_school, set_active_school


def _entier(valeur: Optional[str]) -> Optional[int]:
    if valeur and str(valeur).strip().lstrip("-").isdigit():
        return int(valeur)
    return None


def etablissement_demande(request: Request) -> Tuple[Optional[int], Optional[str]]:
    """Établissement désigné par la requête elle-même (en-têtes ou paramètres).

    Le frontend transmet l'école courante via `X-School-Id` / `X-School-Code`, et
    certains écrans la passent en paramètre d'URL. Ces indications priment sur le
    jeton, car elles reflètent l'école que l'utilisateur consulte à cet instant.
    """
    code = (
        request.headers.get("X-School-Code")
        or request.query_params.get("code_etablissement")
        or request.query_params.get("code_ecole")
    )
    ecole_id = _entier(request.headers.get("X-School-Id")) or _entier(request.query_params.get("ecole_id"))
    return ecole_id, (code.strip() if code else None)


def etablissement_du_jeton(request: Request) -> Tuple[Optional[int], Optional[str]]:
    """Établissement porté par le jeton d'authentification, sans accès à la base."""
    entete = request.headers.get("Authorization") or ""
    if not entete.lower().startswith("bearer "):
        return None, None

    # Import tardif : `routers.auth` importe la base et les modèles, ce module est
    # chargé au démarrage de l'application.
    from .routers.auth import _decode_token

    charge = _decode_token(entete[7:].strip())
    if not charge:
        return None, None

    code = charge.get("ecole_code") or charge.get("code_etablissement")
    ecole_id = charge.get("ecole_id")
    return (int(ecole_id) if isinstance(ecole_id, int) else _entier(str(ecole_id) if ecole_id else None)), (
        str(code).strip() if code else None
    )


class EtablissementActifMiddleware(BaseHTTPMiddleware):
    """Installe l'établissement actif pour la durée de la requête."""

    async def dispatch(self, request: Request, call_next):
        reset_active_school()
        try:
            ecole_id, code = etablissement_demande(request)
            if not ecole_id and not code:
                ecole_id, code = etablissement_du_jeton(request)

            # On ne pose rien quand la requête ne désigne aucune école : le listener
            # se rabattra sur les entités liées, et laissera les colonnes vides
            # plutôt que de rattacher l'écriture à un établissement arbitraire.
            if ecole_id or code:
                set_active_school(ecole_id, code)

            return await call_next(request)
        finally:
            reset_active_school()
