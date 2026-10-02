"""Créneaux horaires et quotas de la prise de rendez-vous en ligne.

Les rendez-vous publics sont ouverts sur une plage horaire fixe découpée en
créneaux réguliers : par défaut de 08:45 à 15:00 par pas de 15 minutes, soit
26 créneaux. Chaque école dispose d'un quota de ``RDV_CAPACITE_JOUR`` places
par journée (100). Ce quota est réparti entre les créneaux via un sous-quota
afin d'éviter que toutes les places de la journée partent sur le premier
créneau de la matinée.

Un rendez-vous annulé libère sa place : seuls les statuts listés dans
``STATUTS_OCCUPANTS`` sont décomptés.
"""
import math
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional

from ..config import settings

# Statuts qui consomment une place dans le décompte ('annule' la libère).
STATUTS_OCCUPANTS = ("en_attente", "traite")

# Types d'inscription proposés par le formulaire.
TYPES_DEMARCHE = ("inscription", "reinscription")

# ─────────────────────────────────────────────────────────────────────────────
# Niveaux proposés dans « NIVEAU CONCERNÉ », par type d'inscription.
#
# ⚠ Liste de travail reconstituée à partir de la grille tarifaire HÎnneh
# (api_grille_tarifaire) : c'est ici, et nulle part ailleurs, qu'il faut
# corriger les libellés officiels de l'établissement.
# ─────────────────────────────────────────────────────────────────────────────
NIVEAUX_PAR_CYCLE: List[tuple] = [
    ("Maternelle", [
        "Petite section",
        "Moyenne section",
        "Grande section",
    ]),
    ("Primaire", [
        "CP1",
        "CP2",
        "CE1",
        "CE2",
        "CM1",
        "CM2",
    ]),
    ("Collège 1er cycle", [
        # L'entrée en 6ème dépend du statut d'affectation et du test d'entrée :
        # ces variantes correspondent aux lignes de la grille tarifaire.
        "6ème Affectés ayant fait le test",
        "6ème Affectés n'ayant pas fait le test",
        "6ème Affectés venant du CM2 HÎnneh",
        "6ème Non affectés",
        "6ème Redoublants",
        "5ème",
        "4ème",
        "3ème",
    ]),
    ("Collège 2nd cycle", [
        "2nde",
        "1ère A",
        "1ère C",
        "1ère D",
        "Tle A",
        "Tle C",
        "Tle D",
    ]),
]

_JOURS_FR = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
_MOIS_FR = ("janvier", "février", "mars", "avril", "mai", "juin",
            "juillet", "août", "septembre", "octobre", "novembre", "décembre")


class RendezVousIndisponibleError(Exception):
    """Créneau invalide, complet, ou quota journalier atteint."""
    pass


def _parse_heure(valeur, defaut: str) -> time:
    """Lit une heure de configuration 'HH:MM', avec repli sur `defaut`."""
    try:
        morceaux = str(valeur).strip().split(":")
        return time(int(morceaux[0]), int(morceaux[1]))
    except (ValueError, IndexError, TypeError, AttributeError):
        heures, minutes = defaut.split(":")
        return time(int(heures), int(minutes))


def _parse_entier(valeur, defaut: int) -> int:
    try:
        return int(valeur)
    except (ValueError, TypeError):
        return defaut


def generer_creneaux() -> List[str]:
    """Liste ordonnée des créneaux au format 'HH:MM', bornes incluses."""
    debut = _parse_heure(settings.RDV_HEURE_DEBUT, "08:45")
    fin = _parse_heure(settings.RDV_HEURE_FIN, "15:00")
    pas = max(_parse_entier(settings.RDV_PAS_MINUTES, 15), 1)

    reference = datetime(2000, 1, 1)
    courant = datetime.combine(reference, debut)
    borne = datetime.combine(reference, fin)

    creneaux: List[str] = []
    while courant <= borne:
        creneaux.append(courant.strftime("%H:%M"))
        courant += timedelta(minutes=pas)
    return creneaux


def capacite_jour(jour: Optional[date] = None) -> int:
    """Nombre maximum de rendez-vous par école et par journée.
    Si jour est un jeudi (weekday() == 3), quota fixé à 0 pour test du quota atteint.
    """
    if jour is not None and jour.weekday() == 3:  # Jeudi
        return 0
    return max(_parse_entier(settings.RDV_CAPACITE_JOUR, 100), 0)


def capacite_creneau(jour: Optional[date] = None) -> int:
    """Sous-quota par créneau, réparti automatiquement si non configuré."""
    if jour is not None and jour.weekday() == 3:  # Jeudi
        return 0
    configuree = settings.RDV_CAPACITE_CRENEAU
    if configuree not in (None, "", "0"):
        return max(_parse_entier(configuree, 0), 0)

    creneaux = generer_creneaux()
    if not creneaux:
        return 0
    return max(math.ceil(capacite_jour(jour) / len(creneaux)), 1)


def normaliser_heure(valeur: Optional[str]) -> Optional[str]:
    """Ramène '8:45', '08:45:00'… à la forme canonique 'HH:MM' d'un créneau.

    Retourne None si la valeur n'est pas une heure exploitable.
    """
    if not valeur:
        return None
    morceaux = str(valeur).strip().split(":")
    if len(morceaux) < 2:
        return None
    try:
        heures, minutes = int(morceaux[0]), int(morceaux[1])
    except ValueError:
        return None
    if not (0 <= heures <= 23 and 0 <= minutes <= 59):
        return None
    return "%02d:%02d" % (heures, minutes)


def _parse_date(valeur, defaut: str) -> date:
    """Lit une date de configuration 'AAAA-MM-JJ', avec repli sur `defaut`."""
    try:
        return datetime.strptime(str(valeur).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError, AttributeError):
        return datetime.strptime(defaut, "%Y-%m-%d").date()


def jours_fermes() -> set:
    """Jours de la semaine fermés (0 = lundi … 6 = dimanche)."""
    fermes = set()
    for morceau in str(settings.RDV_JOURS_FERMES or "").split(","):
        morceau = morceau.strip()
        if not morceau:
            continue
        try:
            jour = int(morceau)
        except ValueError:
            continue
        if 0 <= jour <= 6:
            fermes.add(jour)
    return fermes


def generer_journees() -> List[date]:
    """Journées d'ouverture proposées, dans l'ordre chronologique."""
    debut = _parse_date(settings.RDV_DATE_DEBUT, "2026-09-01")
    fin = _parse_date(settings.RDV_DATE_FIN, "2026-09-30")
    fermes = jours_fermes()

    journees: List[date] = []
    courant = debut
    while courant <= fin:
        if courant.weekday() not in fermes:
            journees.append(courant)
        courant += timedelta(days=1)
    return journees


def journee_ouverte(jour: Optional[date]) -> bool:
    return jour is not None and jour in set(generer_journees())


def formater_journee(jour: date) -> str:
    """Ex. 'samedi 5 septembre' — libellé affiché dans la liste déroulante."""
    return "%s %d %s" % (_JOURS_FR[jour.weekday()], jour.day, _MOIS_FR[jour.month - 1])


def niveaux_groupes() -> List[dict]:
    """Niveaux regroupés par cycle, pour l'affichage en liste déroulante."""
    return [{"cycle": cycle, "niveaux": list(niveaux)} for cycle, niveaux in NIVEAUX_PAR_CYCLE]


def tous_les_niveaux() -> List[str]:
    """Liste à plat, tous cycles confondus."""
    return [niveau for _, niveaux in NIVEAUX_PAR_CYCLE for niveau in niveaux]


def niveaux_pour(type_demarche: Optional[str]) -> List[str]:
    """Niveaux ouverts à une démarche.

    Les deux démarches donnent accès aux mêmes niveaux : c'est le choix
    « Inscription / Réinscription » qui distingue la nature du dossier, pas le
    niveau visé. Un nouvel élève peut entrer en petite section comme en
    terminale, et une réinscription concerne n'importe quel niveau.
    """
    if type_demarche not in TYPES_DEMARCHE:
        return []
    return tous_les_niveaux()


def libelle_plage() -> str:
    """Ex. 'de 08:45 à 15:00 par tranches de 15 minutes' (messages d'erreur)."""
    creneaux = generer_creneaux()
    if not creneaux:
        return "aucun créneau ouvert"
    pas = max(_parse_entier(settings.RDV_PAS_MINUTES, 15), 1)
    return "de %s à %s par tranches de %d minutes" % (creneaux[0], creneaux[-1], pas)
