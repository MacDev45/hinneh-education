"""
timezone_utils.py
Gestion centralisée de l'heure officielle pour la Côte d'Ivoire (Africa/Abidjan = GMT+0).
Garantit que même sur un serveur hébergé en Europe (UTC+1 / UTC+2), toutes les opérations
d'encaissement, de journal et de reçus utilisent l'heure exacte de Côte d'Ivoire.
"""
from datetime import datetime, timezone, date
from typing import Optional

ABIDJAN_TZ = timezone.utc

def now_abidjan() -> datetime:
    """Retourne l'heure courante en fuseau Côte d'Ivoire (GMT+0, sans tzinfo pour compatibilité BD)."""
    return datetime.now(ABIDJAN_TZ).replace(tzinfo=None)

def today_abidjan() -> date:
    """Retourne la date du jour en fuseau Côte d'Ivoire."""
    return datetime.now(ABIDJAN_TZ).date()

def parse_client_date_abidjan(date_str: Optional[str] = None) -> datetime:
    """
    Parse une date ISO envoyée par le navigateur client et la convertit en heure officielle Africa/Abidjan (GMT+0).
    Si non fournie ou invalide, retombe sur l'heure courante Côte d'Ivoire.
    """
    if not date_str:
        return now_abidjan()
    try:
        clean_str = str(date_str).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return now_abidjan()

def format_time_abidjan(dt: datetime = None) -> str:
    """Retourne l'heure formatée HH:MM:SS."""
    if dt is None:
        dt = now_abidjan()
    return dt.strftime("%H:%M:%S")

def format_datetime_abidjan(dt: datetime = None, fmt: str = "%d/%m/%Y %H:%M") -> str:
    """Retourne la date et heure formatée selon fmt."""
    if dt is None:
        dt = now_abidjan()
    return dt.strftime(fmt)

