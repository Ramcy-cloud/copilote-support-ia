"""Chargement de l'historique de tickets : CSV reel ou repli sur les exemples."""
import os
import sys

import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import data_prep

# pandas n'est installe que pour l'indexation (requirements-data.txt).
pytest.importorskip("pandas", reason="pandas n'est requis qu'a l'indexation")

EN_TETE = "Ticket_ID,Sujet,Description,Resolution\n"


@pytest.fixture
def sans_csv(tmp_path, monkeypatch):
    """Garantit qu'aucun historique reel n'est visible, meme si le poste en a un."""
    monkeypatch.setenv("TICKETS_CSV", str(tmp_path / "absent.csv"))


def ecrire_csv(tmp_path, monkeypatch, contenu):
    chemin = tmp_path / "tickets.csv"
    chemin.write_text(contenu, encoding="utf-8")
    monkeypatch.setenv("TICKETS_CSV", str(chemin))
    return chemin


def test_repli_sur_les_exemples_sans_fichier(sans_csv, capsys):
    df = data_prep.load_and_clean_data()
    assert len(df) == 4
    assert list(df["Ticket_ID"]) == ["INC001", "INC002", "INC003", "INC004"]
    # Le repli doit etre visible : sinon on croit indexer de vraies donnees.
    assert "ATTENTION" in capsys.readouterr().out


def test_charge_un_historique_reel(tmp_path, monkeypatch):
    ecrire_csv(
        tmp_path,
        monkeypatch,
        EN_TETE
        + "INC100,Export FI bloque,Le batch de nuit echoue,Relance du job RSBTCDEL\n"
        + "INC101,Lenteur MM,Les transactions MM rament,Reindexation de la table EKPO\n",
    )
    df = data_prep.load_and_clean_data()

    assert list(df["Ticket_ID"]) == ["INC100", "INC101"]
    assert df.loc[0, "Resolution"] == "Relance du job RSBTCDEL"
    # Aucun ticket d'exemple ne doit subsister.
    assert "INC001" not in set(df["Ticket_ID"])


def test_la_colonne_rag_reste_coherente_avec_la_requete(tmp_path, monkeypatch):
    ecrire_csv(
        tmp_path,
        monkeypatch,
        EN_TETE + "INC200,Erreur 500,Page blanche puis code 500,Redemarrage\n",
    )
    df = data_prep.load_and_clean_data()
    # Meme fonction qu'a la recherche : sinon l'index et la requete divergent.
    assert df.loc[0, "Contexte_Pour_Embedding"] == data_prep.build_embedding_context(
        "Erreur 500", "Page blanche puis code 500"
    )


def test_colonnes_absentes_echoue_sans_repli_silencieux(tmp_path, monkeypatch):
    ecrire_csv(tmp_path, monkeypatch, "id,titre\n1,oups\n")
    with pytest.raises(ValueError) as erreur:
        data_prep.load_and_clean_data()
    message = str(erreur.value)
    assert "Resolution" in message and "Ticket_ID" in message


@pytest.mark.parametrize(
    "ligne,motif",
    [
        (",Sujet,Description,Resolution\n", "identifiant manquant"),
        ("INC300,Sujet,Description,\n", "resolution manquante"),
        ("INC301,,,Resolution\n", "ni sujet ni description"),
    ],
)
def test_ecarte_les_lignes_inexploitables(tmp_path, monkeypatch, ligne, motif):
    ecrire_csv(
        tmp_path,
        monkeypatch,
        EN_TETE + "INC100,Valide,Description valide,Resolution valide\n" + ligne,
    )
    df = data_prep.load_and_clean_data()
    assert list(df["Ticket_ID"]) == ["INC100"], motif


def test_ecarte_les_doublons_didentifiant(tmp_path, monkeypatch):
    ecrire_csv(
        tmp_path,
        monkeypatch,
        EN_TETE
        + "INC400,Premier,Description A,Resolution A\n"
        + "INC400,Second,Description B,Resolution B\n",
    )
    df = data_prep.load_and_clean_data()
    # Un doublon d'ID ecraserait le precedent a l'upsert ChromaDB.
    assert len(df) == 1
    assert df.loc[0, "Sujet"] == "Premier"


def test_fichier_sans_aucune_ligne_exploitable(tmp_path, monkeypatch):
    ecrire_csv(tmp_path, monkeypatch, EN_TETE + "INC500,Sujet,Description,\n")
    with pytest.raises(ValueError, match="aucune ligne exploitable"):
        data_prep.load_and_clean_data()


def test_identifiant_numerique_reste_du_texte(tmp_path, monkeypatch):
    ecrire_csv(
        tmp_path, monkeypatch, EN_TETE + "12345,Sujet,Description,Resolution\n"
    )
    df = data_prep.load_and_clean_data()
    # Sans dtype=str, pandas en ferait un entier puis un flottant ("12345.0").
    assert df.loc[0, "Ticket_ID"] == "12345"


def test_tickets_csv_vide_retombe_sur_le_chemin_par_defaut(monkeypatch):
    monkeypatch.setenv("TICKETS_CSV", "   ")
    assert data_prep.chemin_csv() == data_prep.CHEMIN_CSV_DEFAUT
