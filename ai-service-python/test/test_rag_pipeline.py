import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock

import chromadb
import pytest

import data_prep
import rag_pipeline


@pytest.fixture(autouse=True)
def cache_vide():
    rag_pipeline.get_collection.cache_clear()
    yield
    rag_pipeline.get_collection.cache_clear()


@pytest.fixture
def client_mock(monkeypatch):
    client = MagicMock()
    factory = MagicMock(return_value=client)
    monkeypatch.setattr(chromadb, "PersistentClient", factory)
    return factory, client


# --- a) connexion paresseuse --------------------------------------------------


def test_import_sans_base_ne_plante_pas(tmp_path):
    """Importer le service sans base construite ne plante pas et ne crée rien sur le disque."""
    absent = tmp_path / "absent"
    # Sous-processus : un import « neuf », sans recharger le module partagé par les autres tests
    code = "import main, rag_pipeline; assert not rag_pipeline.get_collection.cache_info().currsize"
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=Path(rag_pipeline.__file__).resolve().parent,
        env={**os.environ, "CHROMA_DB_PATH": str(absent)},
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert not absent.exists()


def test_chemin_par_defaut_a_cote_du_code(monkeypatch):
    monkeypatch.delenv("CHROMA_DB_PATH", raising=False)
    attendu = Path(rag_pipeline.__file__).resolve().parent / "chroma_db"
    assert rag_pipeline.get_chroma_db_path() == attendu


def test_chemin_configurable_par_variable(monkeypatch, tmp_path):
    monkeypatch.setenv("CHROMA_DB_PATH", str(tmp_path))
    assert rag_pipeline.get_chroma_db_path() == tmp_path


def test_dossier_absent_erreur_claire(monkeypatch, tmp_path, client_mock):
    factory, _ = client_mock
    monkeypatch.setenv("CHROMA_DB_PATH", str(tmp_path / "absent"))

    with pytest.raises(rag_pipeline.KnowledgeBaseUnavailable, match="build_vector_db.py"):
        rag_pipeline.get_collection()
    # Aucun dossier vide créé par ChromaDB
    factory.assert_not_called()
    assert not (tmp_path / "absent").exists()


def test_collection_absente_erreur_claire(monkeypatch, tmp_path, client_mock):
    _, client = client_mock
    client.get_collection.side_effect = ValueError("Collection sap_tickets does not exist")
    monkeypatch.setenv("CHROMA_DB_PATH", str(tmp_path))

    with pytest.raises(rag_pipeline.KnowledgeBaseUnavailable, match="sap_tickets"):
        rag_pipeline.get_collection()


def test_collection_mise_en_cache_et_echec_non_memorise(monkeypatch, tmp_path, client_mock):
    factory, client = client_mock
    monkeypatch.setenv("CHROMA_DB_PATH", str(tmp_path))
    collection = MagicMock()
    client.get_collection.side_effect = [ValueError("absente"), collection]

    with pytest.raises(rag_pipeline.KnowledgeBaseUnavailable):
        rag_pipeline.get_collection()
    # Une fois la base construite, l'appel suivant réussit puis est mis en cache
    assert rag_pipeline.get_collection() is collection
    assert rag_pipeline.get_collection() is collection
    assert factory.call_count == 2
    client.get_collection.assert_called_with(name="sap_tickets")


# --- c) même prétraitement qu'à l'indexation ---------------------------------


def test_requete_nettoyee_comme_les_donnees_indexees(fake_collection):
    sujet = "Erreur 500 sur la PROD SAP !"
    description = "Bonjour, impossible d'accéder à SAP ECC ; la page charge... puis code 500."

    rag_pipeline.build_rag_prompt(sujet, description)

    query = fake_collection.query.call_args.kwargs["query_texts"]
    assert query == [data_prep.build_embedding_context(sujet, description)]
    assert query == [
        "sujet: erreur 500 sur la prod sap | description: "
        "bonjour impossible d accéder à sap ecc la page charge puis code 500"
    ]


def test_indexation_utilise_la_meme_fonction():
    pytest.importorskip("pandas")
    df = data_prep.load_and_clean_data()
    for _, row in df.iterrows():
        assert row["Contexte_Pour_Embedding"] == data_prep.build_embedding_context(
            row["Sujet"], row["Description"]
        )
        assert row["Contexte_Pour_Embedding"] == (
            f"sujet: {row['Sujet_Clean']} | description: {row['Description_Clean']}"
        )


def test_clean_text_valeurs_vides():
    assert data_prep.clean_text(None) == ""
    assert data_prep.clean_text(float("nan")) == ""
