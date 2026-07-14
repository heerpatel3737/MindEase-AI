# MindEase AI

**Cognitive Operating System & Emotional Companion** — a full-stack SaaS platform that helps users manage decision fatigue, overthinking, burnout, and social anxiety through adaptive AI personas, memory-aware responses, and a brutalist editorial UI.
Production-ready AI SaaS built with Next.js, FastAPI, Gemini, Groq, semantic memory, SSE streaming, JWT authentication, and multi-provider orchestration to deliver personalized emotional intelligence experiences.

![Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini-blue?style=flat-square&logo=google)
![Groq](https://img.shields.io/badge/Groq-LLM-orange?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)
---
## Why MindEase AI?

MindEase AI is designed to tackle everyday cognitive overload by combining emotional intelligence with practical decision support. Rather than acting as a generic chatbot, it adapts its responses based on the selected Focus Mode, previous interactions, and user context to deliver personalized, actionable guidance across multiple mental wellness scenarios.
---

## Features

- **Overthink Translator** — reframe anxious thoughts into clear, actionable messages
- **Reply Generator** — tone-aware message suggestions for difficult conversations
- **Decision Engine** — priority-based decision queue with schedule optimization
- **Venting Journal** — mood-tagged entries with AI summaries and voice input
- **Social Confidence Simulator** — practice high-stakes conversations (salary, boundaries, etc.)
- **Burnout Monitor** — stress scoring, history charts, breathing exercises
- **10 AI Personas** — Calm Therapist, Best Friend, Logical Analyst, and more
- **Semantic Memory** — context retrieval across sessions for personalized responses
- **Multi-Provider AI** — Gemini → Groq → OpenRouter → local fallback chain
- **SSE Streaming** — real-time AI response generation
- **Voice Input** — Groq Whisper transcription (when API key configured)

---
## Key Highlights

- 🧠 AI-first emotional intelligence platform
- 💬 Personalized responses using contextual memory
- 🔄 Multi-provider AI orchestration with automatic fallback
- ⚡ Real-time AI response streaming using Server-Sent Events (SSE)
- 🔐 Secure JWT authentication and protected routes
- 🎙️ Voice-enabled interactions with speech-to-text
- 📊 Interactive dashboard with personalized insights
- 🎨 Responsive full-stack application with modern editorial UI

--- 

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend                       │
│  React 19 · Zustand · Tailwind v4 · Recharts · Web Audio    │
│                    http://localhost:3000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + JWT Bearer + SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  Auth · AI Orchestrator · Memory · Voice · Safety           │
│                    http://127.0.0.1:8000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         SQLite (dev)  ·  PostgreSQL/Supabase (prod)         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│   Gemini · Groq · OpenRouter  (free-tier AI providers)      │
└─────────────────────────────────────────────────────────────┘
```

---
## AI Workflow

```text
User Input
      │
      ▼
Focus Mode Selection
      │
      ▼
Prompt Builder
      │
      ▼
Gemini
      │
      ├── Success → AI Response
      │
      └── Failure
             │
             ▼
Groq
             │
             ▼
Offline Heuristic Fallback
             │
             ▼
Response Personalization
             │
             ▼
Semantic Memory Update
             │
             ▼
Dashboard & Conversation History
```
## Quick Start

### Prerequisites

- **Node.js** 20+
- **Python** 3.10+
- **Git**

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/mindease-ai.git
cd mindease-ai
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# Edit .env with your API keys
python main.py
```

Backend runs at **http://127.0.0.1:8000** · API docs at **http://127.0.0.1:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## Configuration

See [backend/.env.example](backend/.env.example) for all environment variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Recommended | Primary AI text + embeddings |
| `GROQ_API_KEY` | Recommended | Voice transcription + fallback |
| `JWT_SECRET_KEY` | **Production** | JWT signing secret |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `CORS_ORIGINS` | Production | Allowed frontend origins |

Without API keys, the app runs in **offline heuristic mode** (functional but less intelligent).

---

## Tech Stack

**Frontend:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Framer Motion · Recharts · Lucide React

**Backend:** FastAPI · Uvicorn · SQLAlchemy · bcrypt · python-jose · pg8000

**AI:** Google Gemini · Groq · OpenRouter · Local heuristic fallback

**Database:** SQLite (development) · designed for future PostgreSQL/Supabase migration.

---

## Project Structure

```
mindease-ai/
├── backend/          # FastAPI REST API + AI orchestrator
│   ├── ai/           # LLM, memory, voice, personas, safety
│   ├── main.py       # All API routes
│   ├── models.py     # SQLAlchemy schema
│   └── auth.py       # JWT + bcrypt auth
├── frontend/         # Next.js SPA
│   ├── app/          # App Router (single page)
│   ├── components/   # Feature views
│   ├── store/        # Zustand global state
│   └── lib/          # SSE + voice utilities
└── docs/             # Audit & deployment guides
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
---

## Author

**Heer Patel**

Computer Science Undergraduate | Full Stack Developer | AI Enthusiast
---


## Support

If you found this project useful or interesting, consider giving it a ⭐ on GitHub. Your support helps the project reach more developers and motivates future improvements.



