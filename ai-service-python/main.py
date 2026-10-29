import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from rag_pipeline import KnowledgeBaseUnavailable, build_rag_prompt
from llm import LLMError, generate_resolution, llm_configured

# Charge ai-service-python/.env (MISTRAL_API_KEY, MISTRAL_MODEL)
load_dotenv(Path(__file__).parent / ".env")

# Initialisation de l'API FastAPI
app = FastAPI(title="Copilote Support IA", version="1.0")

logger = logging.getLogger("copilote")

# Définition du format de la requête attendue
# Longueurs bornées : le texte part dans le prompt du LLM (coût et abus)
class TicketRequest(BaseModel):
    sujet: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)

def simulation_autorisee() -> bool:
    """ALLOW_SIMULATION=false : sans clé Mistral, le service refuse au lieu de servir un faux texte."""
    return os.getenv("ALLOW_SIMULATION", "true").strip().lower() != "false"


# Définition de la route principale
@app.post("/ask-copilot")
async def ask_copilot(ticket: TicketRequest):
    simulated = not llm_configured()
    if simulated and not simulation_autorisee():
        logger.error("MISTRAL_API_KEY absente et ALLOW_SIMULATION=false")
        raise HTTPException(status_code=503, detail="LLM non configuré")

    try:
        # 1. Génération du prompt enrichi via le RAG. La recherche (ChromaDB + embeddings)
        # est bloquante : exécutée dans un thread pour ne pas figer les autres requêtes.
        prompt = await run_in_threadpool(
            build_rag_prompt, ticket.sujet, ticket.description
        )
        
        # 2. Appel à Mistral (ou réponse simulée si MISTRAL_API_KEY n'est pas défini)
        resolution_generee = await generate_resolution(prompt)

        # 3. Renvoi de la réponse au format JSON
        return {
            "status": "success",
            "sujet_analyse": ticket.sujet,
            "resolution_suggeree": resolution_generee,
            "simulated": simulated,  # vrai = texte d'exemple, pas une vraie réponse IA
            "prompt_utilise": prompt # Utile pour le debug
        }

    except KnowledgeBaseUnavailable as e:
        logger.error("Base de connaissances indisponible : %s", e)
        raise HTTPException(
            status_code=503, detail="Base de connaissances non initialisée"
        )
    except LLMError as e:
        logger.error("Erreur LLM : %s", e)
        raise HTTPException(status_code=502, detail="Erreur du service LLM")
    except Exception:
        # Le détail (message + trace) reste dans les logs serveur : il peut contenir
        # des chemins, des requêtes ou des informations internes à ne pas exposer.
        logger.exception("Erreur inattendue lors du traitement de /ask-copilot")
        raise HTTPException(status_code=500, detail="Erreur interne du service IA")

if __name__ == "__main__":
    import uvicorn
    # Service interne, appelé uniquement par NestJS : écoute en local par défaut.
    # AI_SERVICE_HOST=0.0.0.0 seulement dans un conteneur derrière un réseau privé.
    uvicorn.run(
        app,
        host=os.getenv("AI_SERVICE_HOST", "127.0.0.1"),
        port=int(os.getenv("AI_SERVICE_PORT", "8000")),
    )