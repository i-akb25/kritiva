# KRITIVA Local Compute Connector

This optional personal connector gives KRITIVA a common local API for NVIDIA, Apple Silicon, Intel and AMD computers. It binds to loopback only, requires a bearer token, and does not make the model service public.

## Choose an engine

| Computer | Engine | Acceleration | Boundary |
| --- | --- | --- | --- |
| NVIDIA RTX | `nvidia-nim` | CUDA / TRELLIS NIM | 12 GB VRAM minimum; 24 GB recommended |
| NVIDIA GPU | `sf3d-cuda` | CUDA / Stable Fast 3D | About 6 GB VRAM at default settings |
| Apple Silicon Mac | `sf3d-mps` | Metal / MPS | Experimental; 32 GB unified memory recommended |
| Intel computer | `sf3d-cpu` | CPU | Compatible but considerably slower |
| AMD Ryzen computer | `sf3d-cpu` | CPU | Compatible but considerably slower; no ROCm claim |

`auto` selects MPS on Apple Silicon, CUDA when `nvidia-smi` is available, and CPU otherwise. Stable Fast 3D reconstructs from one image. The NVIDIA NIM engine also supports text-to-3D.

The Stable Fast 3D weights are gated on Hugging Face. Accept its terms and authenticate locally before the first run. Model licenses and terms remain your responsibility.

## Install a model engine first

For Stable Fast 3D, follow its official installation instructions, then set `SF3D_REPO_PATH` to that repository. For `nvidia-nim`, install and start NVIDIA's TRELLIS NIM at the configured URL.

## Run the connector

```bash
cd connectors/local-rtx-connector
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export KRITIVA_LOCAL_CONNECTOR_TOKEN="your-long-random-token"
export KRITIVA_LOCAL_ENGINE="auto"
export SF3D_REPO_PATH="/absolute/path/to/stable-fast-3d"
uvicorn server:app --host 127.0.0.1 --port 8787
```

In KRITIVA's `.env.local`, use the same token:

```dotenv
KRITIVA_AI_MODE=local-compute
KRITIVA_LOCAL_PROFILE=auto
KRITIVA_LOCAL_CONNECTOR_URL=http://127.0.0.1:8787
KRITIVA_LOCAL_CONNECTOR_TOKEN=your-long-random-token
```

Run KRITIVA locally with `pnpm dev`. A Vercel server cannot reach a connector on your personal computer. The older `local-rtx` variable names remain accepted for backward compatibility.
