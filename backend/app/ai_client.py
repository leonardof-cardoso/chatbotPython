from typing import Iterable

import httpx

from .config import settings
from .models import Message


SYSTEM_PROMPT = (
    "Voce e um assistente util, claro e amigavel. "
    "Responda em portugues do Brasil, salvo se o usuario pedir outro idioma."
)


def _map_role(role: str) -> str:
    if role == "assistant":
        return "model"
    return "user"


def _extract_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        return "O Gemini nao retornou candidatos nesta resposta."

    content = candidates[0].get("content") or {}
    parts = content.get("parts") or []
    texts = [part.get("text", "") for part in parts if part.get("text")]

    if texts:
        return "\n".join(texts).strip()

    return "O Gemini respondeu sem texto utilizavel."


async def generate_ai_reply(messages: Iterable[Message]) -> str:
    if not settings.gemini_api_key:
        return (
            "A integracao com a IA ainda nao esta configurada. "
            "Defina GEMINI_API_KEY no arquivo .env do backend."
        )

    payload_messages = [
        {
            "role": _map_role(message.role),
            "parts": [{"text": message.content}],
        }
        for message in messages
    ]

    url = (
        f"{settings.gemini_base_url.rstrip('/')}/models/"
        f"{settings.gemini_model}:generateContent"
    )
    headers = {
        "x-goog-api-key": settings.gemini_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": payload_messages,
        "generationConfig": {
            "temperature": 0.7,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        return _extract_text(data)
    except httpx.HTTPError:
        return (
            "Nao consegui falar com a API do Gemini agora. "
            "Confira a chave, o modelo configurado e a conectividade da aplicacao."
        )
