"""Adaptateur générique vers la plateforme financière externe (banque).

Ce module isole tous les appels réseau vers le service financier tiers afin que
la logique métier de l'application reste indépendante du fournisseur.
Quand les spécifications réelles de l'API seront communiquées, seules les
fonctions de ce fichier ont besoin d'être ajustées.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

import httpx

# Correspondance des statuts fournisseur -> statuts internes
STATUT_MAPPING = {
    "success": "reussi",
    "successful": "reussi",
    "succeeded": "reussi",
    "completed": "reussi",
    "paid": "reussi",
    "settled": "reussi",
    "reussi": "reussi",
    "pending": "en_attente",
    "processing": "en_attente",
    "initiated": "en_attente",
    "en_attente": "en_attente",
    "failed": "echoue",
    "error": "echoue",
    "declined": "echoue",
    "echoue": "echoue",
    "cancelled": "annule",
    "canceled": "annule",
    "annule": "annule",
    "refunded": "rembourse",
    "reversed": "rembourse",
    "rembourse": "rembourse",
}

CANAL_MAPPING = {
    "bank_transfer": "virement",
    "transfer": "virement",
    "virement": "virement",
    "card": "carte",
    "carte": "carte",
    "mobile_money": "mobile_money",
    "momo": "mobile_money",
    "wallet": "mobile_money",
    "cash": "guichet",
    "counter": "guichet",
    "guichet": "guichet",
}


class BankGatewayError(Exception):
    """Erreur de communication ou de configuration de la passerelle bancaire."""


def _first(payload: Dict[str, Any], keys: List[str]) -> Optional[Any]:
    """Retourne la première valeur non vide trouvée parmi une liste de clés."""
    for key in keys:
        if key in payload and payload[key] not in (None, ""):
            return payload[key]
    return None


def normalize_statut(value: Optional[Any]) -> str:
    if value is None:
        return "en_attente"
    return STATUT_MAPPING.get(str(value).strip().lower(), "en_attente")


def normalize_canal(value: Optional[Any]) -> Optional[str]:
    if value is None:
        return None
    return CANAL_MAPPING.get(str(value).strip().lower(), str(value).strip().lower())


def normalize_montant(value: Optional[Any]) -> Decimal:
    if value is None:
        return Decimal("0.00")
    try:
        return Decimal(str(value).replace(" ", "").replace(",", "."))
    except (InvalidOperation, ValueError):
        return Decimal("0.00")


def normalize_date(value: Optional[Any]) -> datetime:
    if not value:
        return datetime.utcnow()
    raw = str(value).strip().replace("Z", "+00:00")
    for parser in (
        lambda v: datetime.fromisoformat(v),
        lambda v: datetime.strptime(v, "%Y-%m-%d %H:%M:%S"),
        lambda v: datetime.strptime(v, "%Y-%m-%d"),
        lambda v: datetime.strptime(v, "%d/%m/%Y %H:%M:%S"),
        lambda v: datetime.strptime(v, "%d/%m/%Y"),
    ):
        try:
            parsed = parser(raw)
            return parsed.replace(tzinfo=None)
        except (ValueError, TypeError):
            continue
    return datetime.utcnow()


def normalize_transaction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convertit une transaction brute du fournisseur en structure interne.

    Les noms de champs les plus courants sont acceptés afin que le module reste
    fonctionnel quelle que soit la convention du fournisseur.
    """
    reference = _first(payload, [
        "reference", "reference_externe", "transaction_id", "transactionId",
        "id", "external_id", "externalId", "operation_id",
    ])
    matricule = _first(payload, [
        "matricule", "matricule_eleve", "student_matricule", "studentId",
        "student_id", "customer_reference", "customerReference", "student_code",
    ])
    return {
        "reference_externe": str(reference) if reference is not None else None,
        "reference_interne": _first(payload, ["reference_interne", "merchant_reference", "merchantReference", "order_id", "orderId"]),
        "montant": normalize_montant(_first(payload, ["montant", "amount", "value", "amount_paid", "amountPaid"])),
        "devise": str(_first(payload, ["devise", "currency", "currency_code"]) or "XOF"),
        "statut": normalize_statut(_first(payload, ["statut", "status", "state", "transaction_status"])),
        "canal": normalize_canal(_first(payload, ["canal", "channel", "payment_method", "paymentMethod", "mode"])),
        "motif": str(_first(payload, ["motif", "purpose", "reason", "fee_type", "description"]) or "scolarite")[:50],
        "payeur_nom": _first(payload, ["payeur_nom", "payer_name", "payerName", "customer_name", "customerName", "sender_name"]),
        "payeur_telephone": _first(payload, ["payeur_telephone", "payer_phone", "payerPhone", "msisdn", "phone", "customer_phone"]),
        "matricule_eleve": str(matricule) if matricule is not None else None,
        "date_transaction": normalize_date(_first(payload, ["date_transaction", "date", "created_at", "createdAt", "paid_at", "paidAt", "timestamp"])),
        "message_erreur": _first(payload, ["message_erreur", "error_message", "errorMessage", "failure_reason", "message"]),
        "payload_brut": payload,
    }


def extract_transactions(body: Any) -> List[Dict[str, Any]]:
    """Extrait la liste des transactions depuis une réponse d'API arbitraire."""
    if isinstance(body, list):
        return [item for item in body if isinstance(item, dict)]
    if isinstance(body, dict):
        for key in ("data", "results", "transactions", "items", "content", "records", "payments"):
            value = body.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
            if isinstance(value, dict):
                nested = value.get("transactions") or value.get("items") or value.get("data")
                if isinstance(nested, list):
                    return [item for item in nested if isinstance(item, dict)]
        if any(k in body for k in ("reference", "transaction_id", "id", "amount", "montant")):
            return [body]
    return []


def build_headers(config: Any) -> Dict[str, str]:
    """Construit les en-têtes d'authentification selon le type configuré."""
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    auth_type = (config.auth_type or "api_key").lower()
    api_key = config.api_key or ""
    api_secret = config.api_secret or ""

    if not api_key and auth_type != "basic":
        return headers

    if auth_type == "bearer":
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_type == "basic":
        token = base64.b64encode(f"{api_key}:{api_secret}".encode("utf-8")).decode("utf-8")
        headers["Authorization"] = f"Basic {token}"
    elif auth_type == "oauth2":
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers["X-API-Key"] = api_key
        if api_secret:
            headers["X-API-Secret"] = api_secret

    if config.merchant_id:
        headers["X-Merchant-Id"] = config.merchant_id
    return headers


def _build_url(config: Any, endpoint: str) -> str:
    if not config.base_url:
        raise BankGatewayError("L'URL de base de la plateforme bancaire n'est pas configurée.")
    return f"{config.base_url.rstrip('/')}/{(endpoint or '').lstrip('/')}"


def request(config: Any, method: str, endpoint: str, *, params: Optional[Dict[str, Any]] = None,
            json_body: Optional[Dict[str, Any]] = None) -> Any:
    """Exécute un appel HTTP vers la plateforme bancaire et retourne le corps JSON."""
    url = _build_url(config, endpoint)
    timeout = float(config.timeout_secondes or 20)
    try:
        response = httpx.request(
            method.upper(), url,
            headers=build_headers(config),
            params=params,
            json=json_body,
            timeout=timeout,
        )
    except httpx.TimeoutException as exc:
        raise BankGatewayError(f"Délai dépassé lors de l'appel à {url}.") from exc
    except httpx.HTTPError as exc:
        raise BankGatewayError(f"Impossible de joindre la plateforme bancaire : {exc}") from exc

    if response.status_code >= 400:
        raise BankGatewayError(
            f"La plateforme bancaire a répondu {response.status_code} : {response.text[:300]}"
        )
    try:
        return response.json()
    except ValueError as exc:
        raise BankGatewayError("La réponse de la plateforme bancaire n'est pas du JSON valide.") from exc


def verify_webhook_signature(secret: Optional[str], raw_body: bytes, signature: Optional[str]) -> bool:
    """Vérifie la signature HMAC-SHA256 d'une notification entrante."""
    if not secret:
        return True
    if not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    provided = signature.strip()
    if provided.lower().startswith("sha256="):
        provided = provided.split("=", 1)[1]
    return hmac.compare_digest(expected, provided.lower())
