"""Planificateur de synchronisation automatique des paiements bancaires.

Interroge périodiquement la plateforme financière, enregistre les transactions
puis impute automatiquement les montants aux échéanciers : les montants restant
à payer au Guichet sont ainsi toujours à jour sans intervention manuelle.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from ..database import SessionLocal

logger = logging.getLogger("bank.scheduler")

_task: Optional[asyncio.Task] = None
_dernier_resultat: Dict[str, Any] = {
    "derniere_execution": None,
    "succes": None,
    "message": "Planificateur non encore exécuté.",
}

INTERVALLE_PAR_DEFAUT_MINUTES = 10
INTERVALLE_VERIFICATION_SECONDES = 30


def dernier_resultat() -> Dict[str, Any]:
    return dict(_dernier_resultat)


def _executer_cycle() -> None:
    """Exécute un cycle de synchronisation dans une session dédiée."""
    from ..models import BankConfig
    from ..routers import bank

    session = SessionLocal()
    try:
        try:
            config = session.query(BankConfig).order_by(BankConfig.id.asc()).first()
        except Exception as tbl_err:
            session.rollback()
            return

        if not config or not config.actif or not config.sync_auto:
            return
        if not config.base_url or not config.api_key:
            return

        intervalle = max(1, config.sync_intervalle_minutes or INTERVALLE_PAR_DEFAUT_MINUTES)
        if config.date_derniere_sync:
            ecoule = (datetime.utcnow() - config.date_derniere_sync).total_seconds() / 60
            if ecoule < intervalle:
                return

        resultat = bank.run_sync(session)
        _dernier_resultat.update({
            "derniere_execution": datetime.utcnow().isoformat(),
            "succes": True,
            "message": resultat.get("message"),
            "creees": resultat.get("creees"),
            "mises_a_jour": resultat.get("mises_a_jour"),
            "rapprochees": resultat.get("rapprochees"),
        })
        logger.info("Synchronisation bancaire automatique : %s", resultat.get("message"))
    except Exception as exc:  # noqa: BLE001 - le planificateur ne doit jamais s'arrêter
        session.rollback()
        _dernier_resultat.update({
            "derniere_execution": datetime.utcnow().isoformat(),
            "succes": False,
            "message": str(exc),
        })
        logger.warning("Échec de la synchronisation bancaire automatique : %s", exc)
    finally:
        session.close()


async def _boucle() -> None:
    while True:
        try:
            await asyncio.to_thread(_executer_cycle)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("Erreur inattendue du planificateur bancaire : %s", exc)
        await asyncio.sleep(INTERVALLE_VERIFICATION_SECONDES)


def demarrer() -> None:
    """Démarre la boucle de synchronisation si elle n'est pas déjà active."""
    global _task
    if _task and not _task.done():
        return
    try:
        _task = asyncio.get_running_loop().create_task(_boucle())
        logger.info("Planificateur de synchronisation bancaire démarré.")
    except RuntimeError:
        logger.warning("Aucune boucle asyncio active : planificateur bancaire non démarré.")


async def arreter() -> None:
    """Arrête proprement la boucle de synchronisation."""
    global _task
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = None
