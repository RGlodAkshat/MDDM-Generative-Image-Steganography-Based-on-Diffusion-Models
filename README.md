# MDDM: Generative Image Steganography Based on Diffusion Models

This repo contains a **transparent, cell‑by‑cell Jupyter notebook** implementation of the paper:
**"MDDM: Practical Message‑Driven Generative Image Steganography Based on Diffusion Models"**.

The notebook walks through the full pipeline:
1. Define a human‑readable secret message and convert it to bits.
2. Encode bits into Gaussian noise using a Cardan grille and truncated tails.
3. Validate noise distributions and tail separation.
4. Generate a stego image using Stable Diffusion (DDIM).
5. Perform DDIM inversion to recover the noise.
6. Compare original vs recovered noise.
7. Decode the message and verify accuracy.

## Files
- `model.ipynb` — main notebook (fully annotated, step‑by‑step).

## Environment
Tested locally on Windows with:
- Python 3.10
- torch + CUDA (GPU optional but recommended)
- diffusers, transformers, accelerate, scipy, safetensors

## Setup
Create and activate a virtual environment, then install dependencies:

```bash
python -m venv mddm_env
mddm_env\Scripts\activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate scipy safetensors matplotlib
```

## Model Access
The default model is `runwayml/stable-diffusion-v1-5`. If the model is gated:
- set `HF_TOKEN` or `HUGGINGFACE_TOKEN` in your environment, **or**
- change the model ID in the notebook.

## Running the Notebook
Open `model.ipynb` and run **top‑to‑bottom**. Each cell corresponds to a clear step in the paper.

## Notes
- DDIM inversion requires `DDIMInverseScheduler` (available in recent diffusers versions).
- Outputs like `mddm_stego.png` are generated at runtime.

## License
For academic use and experimentation. Please cite the original paper if you publish results.
