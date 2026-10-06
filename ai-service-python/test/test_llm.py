import asyncio
import json
import os
import sys

import httpx
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm import LLMError, SIMULATION, generate_resolution


@pytest.fixture(autouse=True)
def sans_cle(monkeypatch):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    monkeypatch.delenv("MISTRAL_MODEL", raising=False)


def run(coro):
    return asyncio.run(coro)


def test_sans_cle_renvoie_la_simulation():
    assert run(generate_resolution("prompt")) == SIMULATION


def test_avec_cle_appelle_mistral(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "cle-de-test")
    vu = {}

    def handler(request: httpx.Request) -> httpx.Response:
        vu["auth"] = request.headers["authorization"]
        vu["body"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Étapes IA"}}]})

    result = run(generate_resolution("mon prompt", transport=httpx.MockTransport(handler)))

    assert result == "Étapes IA"
    assert vu["auth"] == "Bearer cle-de-test"
    assert vu["body"]["model"] == "mistral-small-latest"
    assert vu["body"]["messages"][-1] == {"role": "user", "content": "mon prompt"}


def test_erreur_http_leve_llmerror_sans_fuite_de_la_cle(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "cle-secrete")
    transport = httpx.MockTransport(lambda r: httpx.Response(401, json={"message": "Unauthorized"}))

    with pytest.raises(LLMError) as exc:
        run(generate_resolution("p", transport=transport))
    assert "401" in str(exc.value)
    assert "cle-secrete" not in str(exc.value)


def test_reponse_inattendue_leve_llmerror(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "k")
    transport = httpx.MockTransport(lambda r: httpx.Response(200, json={"choices": []}))

    with pytest.raises(LLMError):
        run(generate_resolution("p", transport=transport))
