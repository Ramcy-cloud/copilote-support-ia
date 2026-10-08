import os
import sys
from unittest.mock import MagicMock

import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rag_pipeline


@pytest.fixture
def fake_collection(monkeypatch):
    """Collection ChromaDB simulée : aucun accès disque ni modèle d'embedding."""
    collection = MagicMock()
    collection.query.return_value = {
        "documents": [["sujet: erreur connexion sap ecc | description: code erreur 500"]],
        "metadatas": [[{"Ticket_ID": "INC001", "Resolution": "Redémarrage de l'instance."}]],
        "distances": [[0.12]],
    }
    monkeypatch.setattr(rag_pipeline, "get_collection", lambda: collection)
    return collection
