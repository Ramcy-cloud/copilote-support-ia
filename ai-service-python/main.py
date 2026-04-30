from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
from rag_pipeline import build_rag_prompt

# Initialisation de l'API FastAPI
app = FastAPI(title="Copilote Support IA", version="1.0")

# TODO: Insère ta clé API ici pour tester en conditions réelles
# openai.api_key = "sk-ta-cle-api-ici" 

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
        
        # 2. Appel au modèle de langage (LLM)
        # Remarque : Pour valoriser ton profil, tu pourras argumenter plus tard 
        # sur le choix du modèle (comparaison de performance entre GPT-3.5, GPT-4, ou des modèles open-source)
        
        """ 
        # Décommente cette section quand tu auras une clé API OpenAI valide
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Tu es un expert du support SAP."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3 # Température basse pour des réponses techniques précises
        )
        resolution_generee = response.choices[0].message.content
        """

        # Simulation de la réponse du LLM pour que tu puisses tester l'API sans payer
        resolution_generee = "[SIMULATION LLM] : Basé sur l'historique, je recommande de vérifier l'instance d'authentification ECC. \n1. Connectez-vous au serveur.\n2. Purgez les logs.\n3. Redémarrez le service."

        # 3. Renvoi de la réponse au format JSON
        return {
            "status": "success",
            "sujet_analyse": ticket.sujet,
            "resolution_suggeree": resolution_generee,
            "prompt_utilise": prompt # Utile pour le debug
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur sur le port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)