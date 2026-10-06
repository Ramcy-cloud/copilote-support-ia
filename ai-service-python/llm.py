import os

import httpx

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
DEFAULT_MODEL = "mistral-small-latest"
SYSTEM_PROMPT = "Tu es un expert du support SAP."

SIMULATION = (
    "[SIMULATION LLM] : Basé sur l'historique, je recommande de vérifier l'instance "
    "d'authentification ECC. \n1. Connectez-vous au serveur.\n2. Purgez les logs.\n"
    "3. Redémarrez le service."
)


class LLMError(Exception):
    """Échec de l'appel au LLM (message sûr à exposer, sans détail sensible)."""


async def generate_resolution(prompt: str, transport: httpx.AsyncBaseTransport | None = None) -> str:
    """Appelle Mistral si MISTRAL_API_KEY est défini, sinon renvoie la réponse simulée."""
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        return SIMULATION

    payload = {
        "model": os.getenv("MISTRAL_MODEL", DEFAULT_MODEL),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,  # basse : réponses techniques précises
    }
    try:
        async with httpx.AsyncClient(timeout=30, transport=transport) as client:
            response = await client.post(
                MISTRAL_URL,
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as exc:
        raise LLMError(f"Mistral a répondu {exc.response.status_code}") from exc
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        raise LLMError("Réponse Mistral inexploitable ou service injoignable") from exc
