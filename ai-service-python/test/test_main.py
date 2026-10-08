import sys
import os

# Cette ligne magique force Python à inclure le dossier parent dans sa recherche
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app  # Maintenant, il trouvera main.py sans problème !

# On crée un client de test
client = TestClient(app)

import pytest


@pytest.fixture(autouse=True)
def sans_cle_mistral(monkeypatch):
    """Les tests n'appellent jamais le vrai Mistral, même si un .env existe."""
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)


@pytest.fixture(autouse=True)
def base_vectorielle_simulee(fake_collection):
    """Les tests ne dépendent pas d'une base chroma_db construite (ChromaDB mocké)."""
    return fake_collection

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

def test_erreur_llm_renvoie_502(monkeypatch):
    import main

    async def echec(prompt):
        raise main.LLMError("Mistral a répondu 401")

    monkeypatch.setattr(main, "generate_resolution", echec)
    response = client.post("/ask-copilot", json={"sujet": "s", "description": "d"})
    assert response.status_code == 502


def test_erreur_inattendue_renvoie_500_generique_et_journalise(monkeypatch, caplog):
    import main

    def plantage(sujet, description):
        raise RuntimeError("détail interne : /srv/secret/chroma.sqlite3")

    monkeypatch.setattr(main, "build_rag_prompt", plantage)
    with caplog.at_level("ERROR", logger="copilote"):
        response = client.post("/ask-copilot", json={"sujet": "s", "description": "d"})

    assert response.status_code == 500
    assert response.json() == {"detail": "Erreur interne du service IA"}
    assert "secret" not in response.text
    # L'erreur complète (avec la trace) est conservée côté serveur
    assert any(r.exc_info and "secret" in str(r.exc_info[1]) for r in caplog.records)


def test_base_absente_renvoie_503(monkeypatch):
    import rag_pipeline

    def absente():
        raise rag_pipeline.KnowledgeBaseUnavailable("Base vectorielle introuvable (/x/chroma_db)")

    monkeypatch.setattr(rag_pipeline, "get_collection", absente)
    response = client.post("/ask-copilot", json={"sujet": "s", "description": "d"})

    assert response.status_code == 503
    assert response.json() == {"detail": "Base de connaissances non initialisée"}
