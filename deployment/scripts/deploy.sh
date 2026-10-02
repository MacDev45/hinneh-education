#!/bin/bash

# Script de déploiement pour Hinneh Education
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOYMENT_DIR")"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Déploiement Hinneh Education - Environnement: $ENVIRONMENT${NC}"

# Validation
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}❌ Environnement invalide. Utilisez: staging ou production${NC}"
    exit 1
fi

# Vérifications préalables
echo -e "${YELLOW}📋 Vérifications préalables...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Environnement
ENV_FILE="$DEPLOYMENT_DIR/env/.env.$ENVIRONMENT"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Fichier d'environnement manquant: $ENV_FILE${NC}"
    exit 1
fi

# Arrêter les conteneurs existants
echo -e "${YELLOW}🛑 Arrêt des conteneurs existants...${NC}"
cd "$DEPLOYMENT_DIR/docker"
docker-compose down --remove-orphans || true

# Build
echo -e "${YELLOW}🔨 Construction de l'image Docker...${NC}"
docker-compose build --no-cache

# Démarrage
echo -e "${YELLOW}⏳ Démarrage des services...${NC}"
docker-compose up -d

# Health check
echo -e "${YELLOW}🏥 Vérification de la santé des services...${NC}"
sleep 10

for i in {1..30}; do
    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application disponible${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Application non accessible après 30 tentatives${NC}"
        docker-compose logs app
        exit 1
    fi
    echo "  Tentative $i/30..."
    sleep 2
done

# Logs
echo -e "${YELLOW}📝 Logs de déploiement:${NC}"
docker-compose logs --tail=20 app

echo -e "${GREEN}✅ Déploiement réussi!${NC}"
echo -e "${GREEN}   URL: https://hinneh-education.ci${NC}"
echo -e "${YELLOW}📊 Commandes utiles:${NC}"
echo "   Logs:     docker-compose logs -f app"
echo "   Redémarrer: docker-compose restart"
echo "   Rollback: ./rollback.sh"
