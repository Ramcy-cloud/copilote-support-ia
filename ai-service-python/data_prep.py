import pandas as pd
import re

def load_and_clean_data():
    """
    Simule le chargement d'un dataset de tickets et applique un nettoyage 
    optimisé pour le NLP et l'architecture RAG.
    """
    
    # 1. Simulation des données brutes (En conditions réelles : pd.read_csv('tickets.csv'))
    raw_data = {
        'Ticket_ID': ['INC001', 'INC002', 'INC003', 'INC004'],
        'Sujet': ['Erreur connexion SAP ECC', 'Mot de passe SAP oublié', 'Lenteur S/4HANA Finance', 'Bug affichage SAP Fiori'],
        'Description': [
            "Impossible de se connecter à l'environnement de PROD, code erreur 500.",
            "J'ai bloqué mon compte après 3 tentatives sur le portail...",
            "Les extractions de données sur le module FI prennent plus de 10 minutes.",
            "L'interface est complètement décalée sur Google Chrome v120."
        ],
        'Resolution': [
            "Redémarrage de l'instance d'authentification et purge des logs.",
            "Déblocage du compte via la transaction SU01.",
            "Optimisation de l'index de la table BSEG dans la base HANA.",
            "Vidage du cache navigateur côté client et application de la note SAP 234567."
        ]
    }

    df = pd.DataFrame(raw_data)
    print("--- Données Brutes ---")
    print(df[['Ticket_ID', 'Sujet']].head(), "\n")

    # 2. Fonction de nettoyage de texte (Stopwords, ponctuation, casse)
    def clean_text(text):
        if pd.isna(text):
            return ""
        text = str(text).lower()
        # On conserve les lettres, chiffres et caractères accentués français
        text = re.sub(r'[^a-z0-9\séàèùâêîôûç]', ' ', text)
        # Suppression des espaces multiples
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    # 3. Application du nettoyage sur les colonnes clés
    cols_to_clean = ['Sujet', 'Description', 'Resolution']
    for col in cols_to_clean:
        df[f'{col}_Clean'] = df[col].apply(clean_text)

    # 4. CRÉATION DE LA COLONNE RAG
    # C'est cette colonne fusionnée que nous allons vectoriser plus tard. 
    # Elle contient tout le contexte du problème.
    df['Contexte_Pour_Embedding'] = (
        "sujet: " + df['Sujet_Clean'] + 
        " | description: " + df['Description_Clean']
    )

    print("--- Aperçu de la colonne préparée pour le modèle IA ---")
    for index, row in df.iterrows():
        print(f"[{row['Ticket_ID']}] -> {row['Contexte_Pour_Embedding']}")

    # 5. Sauvegarde du dataset propre (Décommente pour sauvegarder)
    # df.to_csv('data/cleaned_sap_tickets.csv', index=False)
    
    return df

if __name__ == "__main__":
    cleaned_df = load_and_clean_data()