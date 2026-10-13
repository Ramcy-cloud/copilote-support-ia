import chromadb
# On importe ta fonction depuis le script précédent
from data_prep import load_and_clean_data
from rag_pipeline import COLLECTION_NAME, get_chroma_db_path

def setup_vector_db():
    print("1. Récupération des données nettoyées...")
    # On exécute ton nettoyage en mémoire
    df = load_and_clean_data()
    
    print("\n2. Initialisation de ChromaDB...")
    # Stockage persistant local : même chemin que le service (CHROMA_DB_PATH ou ./chroma_db
    # à côté du code), quel que soit le dossier courant
    db_path = get_chroma_db_path()
    client = chromadb.PersistentClient(path=str(db_path))
    
    # On crée une collection (l'équivalent d'une table pour les bases vectorielles)
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    
    print("3. Vectorisation et insertion dans la base (cela peut prendre quelques secondes au premier lancement pour télécharger le modèle d'embedding)...")
    
    # Préparation des données pour l'insertion
    documents = df['Contexte_Pour_Embedding'].tolist()
    # On garde la résolution et l'ID en métadonnées pour les récupérer plus tard
    metadatas = df[['Ticket_ID', 'Resolution']].to_dict(orient='records') 
    ids = df['Ticket_ID'].tolist()
    
    # Ajout à la collection ChromaDB
    # upsert (et non add) : relancer le script met à jour les tickets existants
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    
    print("\n✅ Base de données vectorielle créée avec succès !")
    print(f"📁 Les données sont sauvegardées dans le dossier : {db_path}")
    print(f"📊 Nombre de tickets indexés : {collection.count()}")

if __name__ == "__main__":
    setup_vector_db()