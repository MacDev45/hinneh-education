#!/bin/bash

# Script de rollback pour Hinneh Education
# Revient à la version précédente en cas de problème

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$DEPLOYMENT_DIR/docker"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⏮️  Rollback Hinneh Education${NC}"

# Vérifier si les conteneurs tournent
if ! docker ps --format '{{.Names}}' | grep -q hinneh-education; then
    echo -e "${RED}❌ Aucun conteneur Hinneh actif${NC}"
    exit 1
fi

# Sauvegarder la version courante
echo -e "${YELLOW}💾 Sauvegarde de la version actuelle...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$DEPLOYMENT_DIR/backups"
docker-compose -f "$DOCKER_DIR/docker-compose.yml" down
tar -czf "$DEPLOYMENT_DIR/backups/backup_$TIMESTAMP.tar.gz" "$DEPLOYMENT_DIR" || true

# Récupérer la dernière image valide
echo -e "${YELLOW}🔍 Recherche de la dernière version valide...${NC}"
LAST_IMAGE=$(docker images --filter=reference="hinneh-education-app" --format "table {{.Repository}}:{{.Tag}}" | tail -n 2 | head -n 1)

if [ -z "$LAST_IMAGE" ]; then
    echo -e "${RED}❌ Aucune image de secours trouvée${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Utilisation de l'image: $LAST_IMAGE${NC}"

# Redémarrer avec l'image précédente
echo -e "${YELLOW}⏳ Redémarrage des services...${NC}"
cd "$DOCKER_DIR"
docker-compose up -d

# Health check
echo -e "${YELLOW}🏥 Vérification de la santé...${NC}"
sleep 5

if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rollback réussi!${NC}"
    docker-compose logs --tail=10 app
else
    echo -e "${RED}❌ Rollback échoué - Application non accessible${NC}"
    exit 1
fi
