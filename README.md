# IE 663 Course Project: MDDM Diffusion Steganography and Robustness Evaluation

## Authors / Course Information
- Name: Akshat Kumar  
- Roll Number: 22B4513  
- Course Code: IE 663  
- Course Name: IE 663 Course Project

## Project Description
This project implements and evaluates **MDDM (Message-Driven Diffusion Model steganography)**.  
The core idea is to hide a payload inside diffusion latent noise, generate an image, and later recover the hidden message through DDIM inversion.

The repository contains:
- a full research notebook (`model.ipynb`) for method implementation and experiments,
- a FastAPI backend for API-based generation/decoding,
- a Next.js frontend for interactive demonstrations.

## Running Instructions
### 1. Environment Setup
Use Python 3.10 for backend compatibility.

```bash
python -m venv .venv
source .venv/Scripts/activate
```

### 2. Backend Setup and Run
From project root:

```bash
cd backend
pip install -r requirements.txt
cd ..
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup and Run
In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000` and communicates with backend REST endpoints (`http://localhost:8000` by default).

### 4. Running the Notebook
Open `model.ipynb` in Jupyter/VS Code and run top-to-bottom for full reproduction.

GPU note:
- Stable Diffusion generation/inversion is practical with CUDA GPU.
- CPU mode works but can be very slow (minutes per generation/inversion run).

## Overview of MDDM
Diffusion models synthesize images by gradually denoising latent noise into a final image.

MDDM leverages this process:
1. Convert a message to bits.
2. Embed bits into selected latent coordinates (Cardan grille) using sign-separated Gaussian tails.
3. Generate the image with Stable Diffusion (DDIM).
4. Invert the generated image with DDIM inversion to recover an estimate of the initial latent.
5. Decode bits from recovered latent signs and reconstruct the message.

Why this matters:
- watermarking and traceability,
- provenance/authentication metadata,
- covert communication in generated media.

## Features Implemented
- End-to-end MDDM pipeline
- Hidden message embedding into diffusion generation
- Message decoding using DDIM inversion
- ECC robustness extension (`none`, `rep3`, `hamming74` in notebook experiments)
- Evaluation suite with structured DataFrame-based reporting
- Image attack simulations (compression, blur, geometric and photometric distortions)
- Web demo interface (FastAPI + Next.js)
- BER and bit-accuracy measurement
- Diversity testing across prompts and seeds
- Runtime benchmarking by pipeline stage

## Project Structure
```text
.
├── model.ipynb
├── mddm_extracted.txt
├── README.md
├── DEMO_APP_README.md
├── backend/
│   ├── app.py
│   ├── pipeline.py
│   ├── attacks.py
│   ├── metrics.py
│   ├── schemas.py
│   ├── utils.py
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── EncodeDecodeTab.tsx
    │   ├── DiversityTab.tsx
    │   ├── TamperTab.tsx
    │   ├── ProvenanceTab.tsx
    │   ├── AboutTab.tsx
    │   └── ProgressPanel.tsx
    └── lib/
        ├── api.ts
        └── types.ts
```

Component roles:
- `model.ipynb`: primary research notebook (implementation + experiments + plots + interpretation).
- `backend/`: API layer exposing generation, decode, attack, compare, provenance, and health endpoints.
- `frontend/`: presentation-ready local UI for interactive demonstration.

## Evaluation Experiments
### Payload vs Accuracy Test
Measures how payload length affects recovery.  
Higher payload uses more embedding capacity and generally increases sensitivity to inversion noise, which can increase BER.

### Robustness Stress Test
Applies post-processing attacks to simulate real-world modifications and measures message recovery after inversion.

### Prompt / Seed Diversity Test
Uses the same hidden message with different prompts/seeds to show payload recovery is not tied to a single visual output.

### Inversion Sensitivity Test
Compares correct vs mismatched inversion conditions (prompt/step count) to quantify decoding sensitivity.

### Runtime Benchmark
Measures embedding, generation, inversion, and decoding time to identify practical bottlenecks.

## Image Attack Explanations
- **JPEG Compression**: removes high-frequency details and can disturb embedded latent signal consistency.
- **Image Resizing**: resampling changes pixel structure and can perturb inversion recovery.
- **Gaussian Blur**: smooths fine details and reduces high-frequency cues.
- **Brightness Adjustment**: shifts global intensity levels and can alter inversion behavior.
- **Contrast Adjustment**: changes intensity distribution and local dynamic range.
- **Rotation**: geometric transform can misalign learned structure and degrade recovery.
- **Cropping / Occlusion**: removes image regions, potentially deleting information needed for accurate inversion.

## Experimental Results and Observations
Representative notebook outputs show:
- **Payload vs Accuracy**: BER remained low overall; worst observed BER was `0.007812` at `512` bits in one run.
- **Robustness**: strongest failure mode was rotation (`rotation_3deg`) with BER around `0.433594`; JPEG at low quality introduced smaller but non-zero BER.
- **Prompt Diversity**: message recovery remained high across visually diverse outputs (mean bit accuracy about `0.998` in recorded runs).
- **Inversion Sensitivity**: wrong prompt increased BER (e.g., `0.003906`), while correct/blank prompt settings were often near perfect in these runs.
- **Runtime**: generation and inversion dominate compute, while embedding/decoding are lightweight.

These observations align with expected MDDM behavior: the method is accurate under matched conditions, but robustness degrades under strong geometric/transform attacks.

## Demo Application
The web demo provides an interactive way to showcase the method and evaluation ideas:

- **Encode & Decode**  
  Embed a hidden message in generation, then decode and report BER/accuracy.

- **Diversity Test**  
  Generate different images (different prompt/seed) with the same payload and compare recovery.

- **Tamper Check**  
  Apply distortions, decode from attacked images, and observe robustness degradation.

- **Provenance**  
  Embed structured metadata (experiment ID, team, date, model) and recover it later.

- **About / Method**  
  Concise explanation of MDDM mechanism and evaluation metrics.

## Key Achievements
- Implemented a complete end-to-end MDDM steganography pipeline.
- Demonstrated successful hidden message embedding and recovery.
- Added ECC-based robustness improvement for error correction.
- Built a structured evaluation suite with reproducible experiments.
- Tested resilience under multiple realistic image distortions.
- Developed an interactive local demo application (FastAPI + Next.js).
- Measured and analyzed BER, payload behavior, inversion sensitivity, and runtime bottlenecks.

## Citation
If you use this implementation, please cite the original MDDM paper and acknowledge this course project repository.
