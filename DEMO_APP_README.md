# MDDM Demo App (FastAPI + Next.js)

This project adds a local presentation demo around your existing MDDM pipeline.

## Structure

- `backend/` -> FastAPI API service (MDDM encode/decode + attacks + provenance)
- `frontend/` -> Next.js + Tailwind research-style demo UI

## Features

1. Encode & Decode (main flow)
2. Diversity Test (same secret, different visuals)
3. Tamper Check (attack + decode)
4. Provenance (structured metadata payload)
5. About / Method page

## Backend Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

Environment variables (optional):

- `SD_MODEL_ID` (default: `runwayml/stable-diffusion-v1-5`)
- `HF_TOKEN` or `HUGGINGFACE_TOKEN` for model access

Run backend:

```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

API health check: `http://localhost:8000/health`

Static images are served from `http://localhost:8000/static/images/...`

## Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

Open: `http://localhost:3000`

## Demo Flow for Presentation

1. Encode & Decode: prompt + hidden message -> generate -> decode -> metrics
2. Diversity Test: same message, two prompts/seeds -> side-by-side decode
3. Tamper Check: attack dropdown -> original vs attacked -> decode metrics
4. Provenance: structured metadata embed/recover

## Notes

- GPU is assumed available for smooth demo performance.
- Backend handles model loading once at startup.
- If VRAM is limited, reduce `num_steps` in requests.
- The scheduler warning about `skip_prk_steps` is suppressed in backend inversion config.

## Priority Status

- Priority 1 implemented: Encode/Decode + stable API + clean UI
- Priority 2 implemented: Diversity + Tamper
- Priority 3 implemented: Provenance + Method page
