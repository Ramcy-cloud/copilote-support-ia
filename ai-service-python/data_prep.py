import math
import os
import re
from pathlib import Path

# Colonnes attendues dans le fichier de tickets réels.
COLONNES_REQUISES = ("Ticket_ID", "Sujet", "Description", "Resolution")

# Emplacement par défaut, à côté du code : le script d'indexation fonctionne
# quel que soit le dossier courant.
CHEMIN_CSV_DEFAUT = Path(__file__).resolve().parent / "tickets.csv"


def clean_text(text):
    """
    Nettoyage appliqué au texte AVANT vectorisation (stopwords, ponctuation, casse).
    Utilisé à la fois à l'indexation (ci-dessous) et pour la requête utilisateur
    (rag_pipeline.py) : les deux doivent rester strictement identiques.
    """
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return ""
    text = str(text).lower()
    # On conserve les lettres, chiffres et caractères accentués français
    text = re.sub(r'[^a-z0-9\séàèùâêîôûç]', ' ', text)
    # Suppression des espaces multiples
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def build_embedding_context(sujet, description):
    """Texte vectorisé : même format pour les tickets indexés et pour la requête."""
    return f"sujet: {clean_text(sujet)} | description: {clean_text(description)}"


def chemin_csv():
    """
    Emplacement du fichier de tickets : TICKETS_CSV si définie, sinon
    tickets.csv à côté du code.
    """
    brut = os.environ.get("TICKETS_CSV", "").strip()
    return Path(brut).expanduser() if brut else CHEMIN_CSV_DEFAUT


def tickets_exemple():
    """
    Les 4 tickets fictifs du PoC. Ils servent uniquement de repli quand aucun
    historique réel n'est fourni : les réponses obtenues n'ont alors aucune
    valeur opérationnelle.
    """
    return {
        'Ticket_ID': ['INC001', 'INC002', 'INC003', 'INC004'],
        'Sujet': [
            'Erreur connexion SAP ECC',
            'Mot de passe SAP oublié',
            'Lenteur S/4HANA Finance',
            'Bug affichage SAP Fiori',
        ],
        'Description': [
            "Impossible de se connecter à l'environnement de PROD, code erreur 500.",
            "J'ai bloqué mon compte après 3 tentatives sur le portail...",
            "Les extractions de données sur le module FI prennent plus de 10 minutes.",
            "L'interface est complètement décalée sur Google Chrome v120.",
        ],
        'Resolution': [
            "Redémarrage de l'instance d'authentification et purge des logs.",
            "Déblocage du compte via la transaction SU01.",
            "Optimisation de l'index de la table BSEG dans la base HANA.",
            "Vidage du cache navigateur côté client et application de la note SAP 234567.",
        ],
    }


def lire_csv_tickets(chemin):
    """
    Lit un historique réel de tickets et écarte les lignes inexploitables.

    Lève une exception plutôt que de se rabattre sur les exemples : un fichier
    present mais illisible doit être signalé, pas remplacé en silence par des
    données fictives qui donneraient l'illusion d'un index réel.
    """
    import pandas as pd

    # dtype=str : un Ticket_ID numérique ne doit pas devenir un flottant,
    # et keep_default_na=False évite de transformer un champ vide en NaN.
    df = pd.read_csv(chemin, dtype=str, keep_default_na=False)

    manquantes = [c for c in COLONNES_REQUISES if c not in df.columns]
    if manquantes:
        raise ValueError(
            f"{chemin} : colonnes absentes {manquantes}. "
            f"Colonnes requises : {list(COLONNES_REQUISES)}. "
            f"Colonnes trouvees : {list(df.columns)}."
        )

    df = df[list(COLONNES_REQUISES)].copy()
    for colonne in COLONNES_REQUISES:
        df[colonne] = df[colonne].fillna("").astype(str).str.strip()

    total = len(df)

    # Un ticket sans identifiant ne peut pas etre indexe (l'ID sert de cle
    # d'upsert ChromaDB) ; sans resolution il n'apprend rien au LLM ; sans
    # sujet ni description il n'est retrouvable par aucune recherche.
    df = df[df['Ticket_ID'] != ""]
    df = df[df['Resolution'] != ""]
    df = df[(df['Sujet'] != "") | (df['Description'] != "")]
    ecartes = total - len(df)

    # Les ID servent de cle d'upsert : un doublon ecraserait le precedent.
    avant_dedoublonnage = len(df)
    df = df.drop_duplicates(subset='Ticket_ID', keep='first')
    doublons = avant_dedoublonnage - len(df)

    if df.empty:
        raise ValueError(
            f"{chemin} : aucune ligne exploitable sur {total}. "
            "Chaque ticket doit avoir un Ticket_ID, une Resolution, "
            "et un Sujet ou une Description."
        )

    print(f"--- Historique reel : {chemin} ---")
    print(f"{len(df)} tickets retenus sur {total} lignes lues.")
    if ecartes:
        print(f"{ecartes} ligne(s) ecartee(s) : identifiant, resolution ou texte manquant.")
    if doublons:
        print(f"{doublons} doublon(s) de Ticket_ID ecarte(s) (premiere occurrence conservee).")

    return df.reset_index(drop=True)


def load_and_clean_data():
    """
    Charge les tickets puis applique le nettoyage NLP attendu par l'architecture RAG.

    Source : le CSV designe par TICKETS_CSV (ou tickets.csv a cote du code) s'il
    existe ; sinon les 4 tickets d'exemple du PoC.
    """
    # pandas n'est nécessaire qu'à l'indexation (requirements-data.txt), pas au service.
    import pandas as pd

    chemin = chemin_csv()
    if chemin.is_file():
        df = lire_csv_tickets(chemin)
    else:
        # Sans emoji : une console Windows en cp1252 ne sait pas les encoder.
        print(f"--- ATTENTION : aucun historique reel ({chemin} absent) ---")
        print("Repli sur les 4 tickets d'exemple : les reponses produites sont")
        print("illustratives et n'ont aucune valeur operationnelle.")
        print("Deposez un CSV (colonnes : " + ", ".join(COLONNES_REQUISES) + ")")
        print("a cet emplacement, ou pointez TICKETS_CSV vers le votre.")
        df = pd.DataFrame(tickets_exemple())
        print("\n--- Donnees Brutes ---")
        print(df[['Ticket_ID', 'Sujet']].head(), "\n")

    # Nettoyage du texte : voir clean_text() en haut du module
    cols_to_clean = ['Sujet', 'Description', 'Resolution']
    for col in cols_to_clean:
        df[f'{col}_Clean'] = df[col].apply(clean_text)

    # CRÉATION DE LA COLONNE RAG
    # C'est cette colonne fusionnée que nous allons vectoriser plus tard.
    # Elle contient tout le contexte du problème.
    df['Contexte_Pour_Embedding'] = [
        build_embedding_context(sujet, description)
        for sujet, description in zip(df['Sujet'], df['Description'])
    ]

    print("--- Apercu de la colonne preparee pour le modele IA ---")
    for _, row in df.head(5).iterrows():
        print(f"[{row['Ticket_ID']}] -> {row['Contexte_Pour_Embedding']}")
    if len(df) > 5:
        print(f"... et {len(df) - 5} autre(s) ticket(s).")

    return df


if __name__ == "__main__":
    cleaned_df = load_and_clean_data()
