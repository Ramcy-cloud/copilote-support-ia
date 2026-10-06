from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from rag_pipeline import build_rag_prompt
from llm import LLMError, generate_resolution

# Charge ai-service-python/.env (MISTRAL_API_KEY, MISTRAL_MODEL)
load_dotenv(Path(__file__).parent / ".env")

# Initialisation de l'API FastAPI
app = FastAPI(title="Copilote Support IA", version="1.0")

# Définition du format de la requête attendue
class TicketRequest(BaseModel):
    sujet: str
    description: str

# Définition de la route principale
@app.post("/ask-copilot")
async def ask_copilot(ticket: TicketRequest):
    try:
        # 1. Génération du prompt enrichi via ton RAG
        prompt = build_rag_prompt(ticket.sujet, ticket.description)
        
        # 2. Appel à Mistral (ou réponse simulée si MISTRAL_API_KEY n'est pas défini)
        resolution_generee = await generate_resolution(prompt)

        # 3. Renvoi de la réponse au format JSON
        return {
            "status": "success",
            "sujet_analyse": ticket.sujet,
            "resolution_suggeree": resolution_generee,
            "prompt_utilise": prompt # Utile pour le debug
        }

    except LLMError as e:
        print(f"Erreur LLM : {e}")
        raise HTTPException(status_code=502, detail="Erreur du service LLM")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur sur le port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)