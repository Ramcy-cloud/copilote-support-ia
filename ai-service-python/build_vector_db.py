import chromadb
# On importe ta fonction depuis le script précédent
from data_prep import load_and_clean_data

def setup_vector_db():
    print("1. Récupération des données nettoyées...")
    # On exécute ton nettoyage en mémoire
    df = load_and_clean_data()
    
    print("\n2. Initialisation de ChromaDB...")
    # On crée un stockage persistant local dans le dossier courant
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # On crée une collection (l'équivalent d'une table pour les bases vectorielles)
    collection = client.get_or_create_collection(name="sap_tickets")
    
    print("3. Vectorisation et insertion dans la base (cela peut prendre quelques secondes au premier lancement pour télécharger le modèle d'embedding)...")
    
    # Préparation des données pour l'insertion
    documents = df['Contexte_Pour_Embedding'].tolist()
    # On garde la résolution et l'ID en métadonnées pour les récupérer plus tard
    metadatas = df[['Ticket_ID', 'Resolution']].to_dict(orient='records') 
    ids = df['Ticket_ID'].tolist()
    
    # Ajout à la collection ChromaDB
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    
    print("\n✅ Base de données vectorielle créée avec succès !")
    print(f"📁 Les données sont sauvegardées dans le dossier : ./chroma_db")
    print(f"📊 Nombre de tickets indexés : {collection.count()}")

if __name__ == "__main__":
    setup_vector_db()