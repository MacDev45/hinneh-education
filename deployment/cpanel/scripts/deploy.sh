#!/bin/bash

# Script de déploiement cPanel pour Hinneh Education
# Usage: ./deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOYMENT_DIR")"
APP_DIR="$HOME/public_html/hinneh-education.ci"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Déploiement cPanel - Hinneh Education${NC}"

# Vérifications
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ Répertoire app non trouvé: $APP_DIR${NC}"
    exit 1
fi

if [ ! -f "$APP_DIR/.env.production" ]; then
    echo -e "${RED}❌ Fichier .env.production manquant${NC}"
    exit 1
fi

# Backup
echo -e "${YELLOW}💾 Création d'un backup...${NC}"
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/hinneh_$TIMESTAMP.tar.gz" \
    -C "$HOME/public_html" hinneh-education.ci \
    --exclude=node_modules \
    --exclude=.git 2>/dev/null || true

# Pull & Installer
echo -e "${YELLOW}📦 Mise à jour du code...${NC}"
cd "$APP_DIR"
git pull origin main || true

echo -e "${YELLOW}📥 Installation des dépendances...${NC}"
npm ci --only=production

# Build
echo -e "${YELLOW}🔨 Build React...${NC}"
npm run build

# .htaccess
echo -e "${YELLOW}⚙️  Configuration Apache...${NC}"
cp "$DEPLOYMENT_DIR/htaccess/.htaccess.production" "$APP_DIR/.htaccess"

# Permissions
echo -e "${YELLOW}🔐 Correction des permissions...${NC}"
chmod 755 "$APP_DIR"
chmod 644 "$APP_DIR/.htaccess"
chmod 600 "$APP_DIR/.env.production"

# Redémarrage (Passenger)
echo -e "${YELLOW}🔄 Redémarrage l'application...${NC}"
mkdir -p "$APP_DIR/tmp"
touch "$APP_DIR/tmp/restart.txt"

# Health check
echo -e "${YELLOW}🏥 Vérification de la santé...${NC}"
sleep 5

if curl -sf https://hinneh-education.ci/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Déploiement réussi!${NC}"
    echo -e "${GREEN}   URL: https://hinneh-education.ci${NC}"
else
    echo -e "${YELLOW}⚠️  Vérification de la santé échouée (normal au premier déploiement)${NC}"
    echo -e "${YELLOW}   Attendez quelques minutes et vérifiez manuellement${NC}"
fi

echo -e "${YELLOW}📊 Commandes utiles:${NC}"
echo "   Logs:       tail -f $APP_DIR/logs/out.log"
echo "   Redémarrer: touch $APP_DIR/tmp/restart.txt"
echo "   Vérifier:   curl https://hinneh-education.ci/health"
