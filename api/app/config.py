from pydantic_settings import BaseSettings
from typing import List, Union
import json
import os

# Candidate root directories (app dir, api dir, project root, cwd)
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
CANDIDATE_ROOTS = [
    os.path.abspath(os.path.join(THIS_DIR, "..")),       # api / backend root (highest priority)
    os.path.abspath(os.path.join(THIS_DIR, "..", "..")), # project root (fullstack)
    os.getcwd(),                                         # current working directory
    THIS_DIR                                             # app directory
]
BACKEND_ROOT = CANDIDATE_ROOTS[0] # api root

def get_env_files() -> List[str]:
    app_env = os.getenv("APP_ENV", "production")
    files = []
    
    # Priority order for Pydantic Settings (later files override earlier ones):
    # 1. Project-level .env / .env.production
    # 2. Backend-level .env / .env.production
    # 3. .env.local (always highest priority for local testing/overrides)
    ordered_roots = [
        os.path.abspath(os.path.join(THIS_DIR, "..", "..")),
        os.path.abspath(os.path.join(THIS_DIR, "..")),
        os.getcwd(),
        THIS_DIR
    ]
    for root in ordered_roots:
        for fname in [".env", f".env.{app_env}", ".env.production"]:
            env_path = os.path.join(root, fname)
            if os.path.exists(env_path) and env_path not in files:
                files.append(env_path)
                
    for root in ordered_roots:
        local_path = os.path.join(root, ".env.local")
        if os.path.exists(local_path) and local_path not in files:
            files.append(local_path)

    if not files:
        files = [os.path.join(CANDIDATE_ROOTS[0], ".env")]
    return files

import urllib.parse
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "INSIGHTS VIEW EDUCATION API"
    API_STR: str = "/api"
    
    # Paramètres MySQL directs (format standard cPanel)
    DB_NAME: Optional[str] = "insights_central"
    DB_USER: Optional[str] = "insights_dbuser"
    DB_PASSWORD: Optional[str] = "Code@96*macsys"
    DB_HOST: Optional[str] = "10.10.10.100"
    DB_PORT: Union[int, str, None] = 3306
    
    DATABASE_URL: Optional[str] = "mysql+pymysql://insights_dbuser:Code%4096%2Amacsys@10.10.10.100:3306/insights_central"
    SECRET_KEY: str = "fastapi-jwt-secret-key-hinneh-education-production-2026-x89a7f21b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600
    
    ALLOWED_ORIGINS: Union[List[str], str] = ["*"]
    PORT: Union[int, str, None] = 8020
    HOST: Union[str, None] = "127.0.0.1"

    # Prise de rendez-vous en ligne : plage horaire et quotas.
    # Les créneaux vont de RDV_HEURE_DEBUT à RDV_HEURE_FIN inclus, par pas de
    # RDV_PAS_MINUTES (08:45 → 15:00 toutes les 15 min = 26 créneaux).
    RDV_HEURE_DEBUT: str = "08:45"
    RDV_HEURE_FIN: str = "15:00"
    RDV_PAS_MINUTES: Union[int, str] = 15
    # Nombre maximum de rendez-vous par école et par journée.
    RDV_CAPACITE_JOUR: Union[int, str] = 100
    # Sous-quota par créneau. Laisser vide pour répartir automatiquement le
    # quota journalier sur les créneaux (100 / 26 → 4 places par créneau).
    RDV_CAPACITE_CRENEAU: Union[int, str, None] = None
    # Journées d'ouverture proposées dans la liste déroulante du formulaire.
    # Bornes incluses ; RDV_JOURS_FERMES liste les jours de la semaine exclus
    # (0 = lundi … 6 = dimanche).
    RDV_DATE_DEBUT: str = "2026-09-01"
    RDV_DATE_FIN: str = "2026-09-30"
    RDV_JOURS_FERMES: str = "6"

    @property
    def database_url(self) -> str:
        if self.DB_NAME and self.DB_USER:
            pwd = urllib.parse.quote_plus(str(self.DB_PASSWORD or ""))
            host = self.DB_HOST or "10.10.10.100"
            port = self.DB_PORT or 3306
            db_name = self.DB_NAME or "insights_central"
            return f"mysql+pymysql://{self.DB_USER}:{pwd}@{host}:{port}/{db_name}"
        if self.DATABASE_URL:
            raw_url = self.DATABASE_URL.strip()
            # Nettoyer et encoder les caractères spéciaux si le mot de passe est brut
            try:
                # Format mysql+pymysql://user:pass@host:port/db
                if "://" in raw_url and "@" in raw_url:
                    prefix, rest = raw_url.split("://", 1)
                    # Le dernier @ sépare user:pass de host:port/db
                    auth_part, host_db_part = rest.rsplit("@", 1)
                    if ":" in auth_part:
                        u_name, u_pass = auth_part.split(":", 1)
                        # Ne pas ré-encoder si déjà encodé
                        unquoted_pass = urllib.parse.unquote(u_pass)
                        safe_pass = urllib.parse.quote_plus(unquoted_pass)
                        return f"{prefix}://{u_name}:{safe_pass}@{host_db_part}"
            except Exception:
                pass
            return raw_url
        return "mysql+pymysql://insights_dbuser:Code%4096%2Amacsys@10.10.10.100:3306/insights_central"

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            try:
                return json.loads(self.ALLOWED_ORIGINS)
            except Exception:
                return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return self.ALLOWED_ORIGINS

    class Config:
        env_file = get_env_files()
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

settings = Settings()

