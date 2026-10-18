import logging
import os
from functools import lru_cache
from pathlib import Path

import chromadb

from data_prep import build_embedding_context

# Traces sans emoji ni accent : une console Windows en cp1252 ne sait pas les encoder.
logger = logging.getLogger(__name__)

COLLECTION_NAME = "sap_tickets"
# Par défaut : dossier chroma_db à côté de ce fichier (indépendant du dossier courant)
DEFAULT_CHROMA_DB_PATH = Path(__file__).resolve().parent / "chroma_db"


class KnowledgeBaseUnavailable(RuntimeError):
    """La base vectorielle (dossier ou collection) n'existe pas encore."""


def get_chroma_db_path():
    """Chemin de la base ChromaDB : variable CHROMA_DB_PATH, sinon DEFAULT_CHROMA_DB_PATH."""
    return Path(os.getenv("CHROMA_DB_PATH") or DEFAULT_CHROMA_DB_PATH)


@lru_cache(maxsize=1)
def get_collection():
    """
    Connexion paresseuse à la collection, ouverte au premier appel puis mise en cache.
    Un échec n'est pas mis en cache : une fois la base construite, l'appel suivant réussit.
    """
    path = get_chroma_db_path()
    # PersistentClient créerait un dossier vide : on vérifie d'abord qu'il existe.
    if not path.is_dir():
        raise KnowledgeBaseUnavailable(
            f"Base vectorielle introuvable ({path}) : lancez « python build_vector_db.py »."
        )
    client = chromadb.PersistentClient(path=str(path))
    try:
        return client.get_collection(name=COLLECTION_NAME)
    except Exception as exc:  # NotFoundError / ValueError selon la version de ChromaDB
        raise KnowledgeBaseUnavailable(
            f"Collection « {COLLECTION_NAME} » absente de {path} : "
            "lancez « python build_vector_db.py »."
        ) from exc


def retrieve_similar_tickets(new_ticket_text, n_results=2):
    """
    Cherche les N tickets les plus similaires dans ChromaDB.
    ChromaDB s'occupe de vectoriser la requête "à la volée".
    """
    results = get_collection().query(
        query_texts=[new_ticket_text],
        n_results=n_results
    )
    return results

def build_rag_prompt(new_ticket_subject, new_ticket_description):
    """
    Exécute le pipeline complet pour préparer la requête au LLM.
    """
    # Même prétraitement que les tickets indexés (data_prep.build_embedding_context)
    query_text = build_embedding_context(new_ticket_subject, new_ticket_description)
    
    logger.info("Recherche dans la base de connaissances pour : '%s'", new_ticket_subject)
    
    # Étape 1 : Retrieval
    retrieved_data = retrieve_similar_tickets(query_text)
    
    # Étape 2 : Construction du contexte
    context = ""
    logger.info("--- Tickets historiques trouves ---")
    
    # ChromaDB renvoie des listes imbriquées, on boucle sur le premier résultat
    for i in range(len(retrieved_data['documents'][0])):
        doc = retrieved_data['documents'][0][i]
        metadata = retrieved_data['metadatas'][0][i]
        distance = retrieved_data['distances'][0][i] 
        # Note : Plus la distance est proche de 0, plus la similarité sémantique est forte
        
        logger.info("Match %s (Distance: %.4f)", i + 1, distance)
        logger.info("   Ancien Ticket ID : %s", metadata["Ticket_ID"])
        logger.info("   Probleme : %s", doc)
        logger.info("   Resolution appliquee : %s", metadata["Resolution"])
        
        context += f"[Ancien Ticket]\nProblème: {doc}\nRésolution appliquée: {metadata['Resolution']}\n\n"
        
    # Étape 3 : Création du Prompt Augmenté
    prompt = f"""Tu es un assistant support IT expert sur les environnements SAP.
Ton rôle est d'analyser le nouveau ticket ci-dessous et de proposer une procédure de résolution (Runbook) étape par étape.
Pour t'aider, voici l'historique des tickets similaires déjà résolus par l'équipe :

Historique (Contexte) :
{context}

Nouveau problème à résoudre :
Sujet : {new_ticket_subject}
Description : {new_ticket_description}

Rédige la résolution technique suggérée :"""

    logger.info("--- Prompt final genere (pret pour le LLM) ---\n%s", prompt)
    
    # Dans la version finale de l'API, on retournerait ce prompt ou on appellerait directement l'API d'un LLM ici.
    return prompt

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    # Testons le pipeline avec la simulation d'un nouveau ticket entrant
    nouveau_sujet = "Erreur 500 sur la prod SAP"
    nouvelle_description = "Bonjour, impossible d'accéder à SAP ECC ce matin, la page charge dans le vide puis affiche un code 500."
    
    build_rag_prompt(nouveau_sujet, nouvelle_description)