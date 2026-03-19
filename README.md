# Chatbot com IA

Projeto full-stack no estilo ChatGPT com:

- Backend em Python com FastAPI
- Frontend em HTML, CSS e JavaScript
- Integracao com API do Gemini
- Historico de conversas salvo em SQLite
- Autenticacao de usuario com JWT

## Estrutura

```text
backend/
  app/
frontend/
.env.example
README.md
```

## Como rodar

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload
```

API disponivel em `http://127.0.0.1:8000`.

### 2. Frontend

Abra `frontend/index.html` com uma extensao como Live Server, ou sirva a pasta com qualquer servidor estatico.

O frontend espera a API em `http://127.0.0.1:8000`.

## Variaveis de ambiente

Preencha no `backend/.env`:

```env
SECRET_KEY=troque-por-uma-chave-segura
GEMINI_API_KEY=sua-chave
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

Crie a chave no Google AI Studio e use essa chave no `GEMINI_API_KEY`.

## Endpoints principais

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /conversations`
- `GET /conversations`
- `GET /conversations/{id}`
- `POST /conversations/{id}/messages`