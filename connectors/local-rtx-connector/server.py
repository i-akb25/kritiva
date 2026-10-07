"""Private loopback adapter between KRITIVA and a local 3D model engine."""

import base64
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

TOKEN = os.environ.get("KRITIVA_LOCAL_CONNECTOR_TOKEN") or os.environ.get("KRITIVA_RTX_CONNECTOR_TOKEN", "")
NIM_URL = os.environ.get("TRELLIS_NIM_URL", "http://127.0.0.1:8000/v1/infer")
ENGINE = os.environ.get("KRITIVA_LOCAL_ENGINE", "auto")
SF3D_REPO = Path(os.environ.get("SF3D_REPO_PATH", "")).expanduser()
SF3D_PYTHON = os.environ.get("SF3D_PYTHON", sys.executable)
ALLOWED_ORIGINS = [item.strip() for item in os.environ.get("KRITIVA_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if item.strip()]
MAX_IMAGE_BYTES = 12 * 1024 * 1024

app = FastAPI(title="KRITIVA Local Compute Connector", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def authorize(authorization: str | None) -> None:
    if not TOKEN or authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid connector token")


def gpu_name() -> str | None:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            check=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() or None
    except (FileNotFoundError, subprocess.SubprocessError):
        return None


def selected_engine() -> str:
    if ENGINE != "auto":
        return ENGINE
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        return "sf3d-mps"
    if gpu_name():
        return "sf3d-cuda"
    return "sf3d-cpu"


@app.get("/health")
async def health(authorization: Annotated[str | None, Header()] = None):
    authorize(authorization)
    gpu = gpu_name()
    engine = selected_engine()
    runner_ready = engine == "nvidia-nim" or (SF3D_REPO / "run.py").is_file()
    return {
        "status": "ready" if runner_ready else "setup-required",
        "engine": engine,
        "gpu": gpu,
        "system": f"{platform.system()} {platform.machine()}",
    }


async def run_nvidia_nim(payload: dict[str, object]) -> str:
    try:
        async with httpx.AsyncClient(timeout=600) as client:
            response = await client.post(NIM_URL, json=payload, headers={"Accept": "application/json"})
            response.raise_for_status()
            result = response.json()
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f"Local TRELLIS NIM failed: {error}") from error
    output = result.get("output", result) if isinstance(result, dict) else {}
    artifact = output.get("glb") if isinstance(output, dict) else None
    if not isinstance(artifact, str) or not artifact:
        raise HTTPException(status_code=502, detail="Trellis NIM returned no GLB artifact")
    return artifact


def run_sf3d(image_bytes: bytes, suffix: str, engine: str) -> str:
    runner = SF3D_REPO / "run.py"
    if not runner.is_file():
        raise HTTPException(status_code=503, detail="Set SF3D_REPO_PATH to an installed Stable Fast 3D repository")
    device = {"sf3d-cuda": "cuda", "sf3d-mps": "mps", "sf3d-cpu": "cpu"}.get(engine)
    if device is None:
        raise HTTPException(status_code=503, detail=f"Unsupported local engine: {engine}")
    with tempfile.TemporaryDirectory(prefix="kritiva-") as temporary:
        work = Path(temporary)
        source_path = work / f"source{suffix}"
        output_path = work / "output"
        source_path.write_bytes(image_bytes)
        command = [
            SF3D_PYTHON, str(runner), str(source_path), "--output-dir", str(output_path),
            "--device", device, "--texture-resolution", "1024",
        ]
        environment = os.environ.copy()
        if device == "mps":
            environment["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
        if device == "cpu":
            environment["SF3D_USE_CPU"] = "1"
        try:
            completed = subprocess.run(
                command, cwd=SF3D_REPO, env=environment, capture_output=True, text=True,
                timeout=1800, check=False,
            )
        except subprocess.TimeoutExpired as error:
            raise HTTPException(status_code=504, detail="Stable Fast 3D exceeded the 30-minute local limit") from error
        except OSError as error:
            raise HTTPException(status_code=503, detail=f"Could not start SF3D_PYTHON: {error}") from error
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "Stable Fast 3D failed")[-800:]
            raise HTTPException(status_code=502, detail=detail)
        models = list(output_path.rglob("*.glb"))
        if not models:
            raise HTTPException(status_code=502, detail="Stable Fast 3D produced no GLB file")
        return base64.b64encode(models[0].read_bytes()).decode("ascii")


@app.post("/generate")
async def generate(
    task: Annotated[str, Form()],
    prompt: Annotated[str, Form()] = "",
    front: Annotated[UploadFile | None, File()] = None,
    source: Annotated[UploadFile | None, File()] = None,
    authorization: Annotated[str | None, Header()] = None,
):
    authorize(authorization)
    if task not in {"image-to-3d", "text-to-3d"}:
        raise HTTPException(status_code=400, detail="The local connector only supports 3D generation")

    engine = selected_engine()
    payload: dict[str, object] = {"output_format": "glb", "samples": 1, "seed": 0}
    selected = front or source
    if task == "image-to-3d":
        if selected is None or selected.content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise HTTPException(status_code=400, detail="A PNG, JPEG or WebP front image is required")
        content = await selected.read(MAX_IMAGE_BYTES + 1)
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds the 12 MB limit")
        payload.update({"mode": "image", "image": f"data:{selected.content_type};base64,{base64.b64encode(content).decode('ascii')}"})
    else:
        if not prompt.strip():
            raise HTTPException(status_code=400, detail="A prompt is required")
        payload.update({"mode": "text", "prompt": prompt.strip()[:77]})

    if engine == "nvidia-nim":
        artifact = await run_nvidia_nim(payload)
    else:
        if task != "image-to-3d" or selected is None:
            raise HTTPException(status_code=400, detail="Stable Fast 3D supports image-to-3D only")
        suffix = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}[selected.content_type]
        artifact = run_sf3d(content, suffix, engine)
    return {
        "status": "succeeded",
        "artifactBase64": artifact,
        "mimeType": "model/gltf-binary",
        "message": f"Local reconstruction completed with {engine}.",
    }
