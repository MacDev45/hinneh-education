# ============================================================================
# Dockerfile - Groupe Scolaire Hînneh API
# ============================================================================

FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements.txt
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copier le code source
COPY . .

# Créer le répertoire pour les uploads
RUN mkdir -p /app/api/uploads && \
    chmod 755 /app/api/uploads

# Exposer le port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Commande de démarrage
CMD ["uvicorn", "api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
