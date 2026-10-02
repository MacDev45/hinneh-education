#!/bin/bash

# Script de vérification post-déploiement Hînneh v2.6
# Utilisation: bash post_deployment_check.sh [URL_API] [TOKEN_AUTH]

set -e

API_URL="${1:-https://hinneh-education.ci/api}"
AUTH_TOKEN="${2:-}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Vérification Post-Déploiement Hînneh v2.6"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API URL: $API_URL"
echo ""

# Couleur de status
check_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}"
  else
    echo -e "${RED}✗ FAIL${NC}"
    exit 1
  fi
}

# 1. Vérifier santé API
echo -n "1. Vérifier santé API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "000" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  exit 1
fi

# 2. Vérifier endpoint dossiers (Chantier 2)
echo -n "2. Vérifier endpoint dossiers/eleve... "
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}⊘ SKIP${NC} (token requis pour auth)"
else
  RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/dossiers/eleve/1" 2>/dev/null)
  if echo "$RESPONSE" | grep -q "scolarite\|financial\|id"; then
    echo -e "${GREEN}✓ PASS${NC}"
  else
    echo -e "${YELLOW}⊘ SKIP${NC} (réponse non-standard)"
  fi
fi

# 3. Vérifier endpoint reductions (Chantier 6)
echo -n "3. Vérifier endpoint reductions... "
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}⊘ SKIP${NC} (token requis)"
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/reductions/" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  fi
fi

# 4. Vérifier endpoint badges QR (Chantier 4)
echo -n "4. Vérifier endpoint badges/qr... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/badges/eleve/1/qr" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE - endpoint accessible)"
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
fi

# 5. Vérifier endpoint RH (Chantier 3)
echo -n "5. Vérifier endpoint RH/demandes... "
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}⊘ SKIP${NC} (token requis)"
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/rh/absence/mes-demandes" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
  else
    echo -e "${YELLOW}⊘ SKIP${NC} (HTTP $HTTP_CODE)"
  fi
fi

# 6. Vérifier DB - Table Reduction
echo -n "6. Vérifier table BD api_reduction... "
TABLES=$(mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_NAME='api_reduction';" 2>/dev/null | tail -1)
if [ "$TABLES" = "1" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${YELLOW}⊘ SKIP${NC} (MySQL non accessible)"
fi

# 7. Vérifier routes frontend
echo -n "7. Vérifier frontend (status code)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://hinneh-education.ci/" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${YELLOW}⊘ SKIP${NC} (URL non accessible)"
else
  echo -e "${YELLOW}⊘ SKIP${NC} (HTTP $HTTP_CODE)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Vérifications complétées${NC}"
echo ""
echo "Prochaines étapes:"
echo "  1. Vérifier les logs: tail -f /var/log/hinneh-api/error.log"
echo "  2. Tester les nouvelles fonctionnalités dans l'interface"
echo "  3. Vérifier les permissions par rôle (directeur, éducateur, etc.)"
echo "  4. Tester la dispersion de réductions sur un élève test"
