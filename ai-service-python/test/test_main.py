import sys
import os

# Cette ligne magique force Python à inclure le dossier parent dans sa recherche
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app  # Maintenant, il trouvera main.py sans problème !

# On crée un client de test
client = TestClient(app)

def test_ask_copilot_valide():
    """Test vérifiant que l'API répond 200 OK avec des données correctes"""
    
    # 1. Préparation (Arrange) : Les données qu'on va envoyer
    payload = {
        "sujet": "Erreur connexion test",
        "description": "Impossible de me connecter à SAP ce matin."
    }
    
    # 2. Action (Act) : On simule une requête POST
    response = client.post("/ask-copilot", json=payload)
    
    # 3. Vérification (Assert) : On vérifie les résultats
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert "resolution_suggeree" in data
    assert "prompt_utilise" in data
    print("\n✅ Le test d'intégration FastAPI a réussi !")

def test_ask_copilot_donnees_manquantes():
    """Test vérifiant que l'API bloque les requêtes incomplètes (Code 422)"""
    
    # On envoie un ticket sans description
    payload = {
        "sujet": "Juste un sujet"
    }
    
    response = client.post("/ask-copilot", json=payload)
    
    assert response.status_code == 422
    print("✅ Le test de rejet d'erreur (422) a réussi !")