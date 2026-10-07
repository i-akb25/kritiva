# KRITIVA

**Create once. Export everything.**

KRITIVA is a private, project-aware workspace for preparing production-ready website assets. It standardizes formats, dimensions, filenames and file-weight targets, then performs supported image work locally in the browser.

## Current release 

- Batch image processing with fault isolation, automated naming and ZIP export
- Iterative WebP/JPEG optimization to a maximum file-size target
- Multi-output recipes, focal-point crop controls and local JSON presets
- Project asset-package checklists for portfolios, web apps, PWAs and articles
- Strict SVG sanitization, recoloring, variants, viewBox tightening and React output
- Local social-cover and screenshot composition with exact-size WebP export
- ZIP/folder asset audits with dimension, naming, duplicate and privacy checks
- Interactive GLB preview, statistics, validation, optimization, poster and package export
- Optional, consent-gated AI gateway plus single-image local 2D-to-3D reconstruction
- Personal local-compute choices for NVIDIA, Apple Silicon, Intel and AMD, plus a clearly labelled NVIDIA hosted prototype adapter
- Searchable asset specifications and the original image/icon preparation tools
- Responsive layouts for phone, tablet, laptop and large desktop
- No accounts, database, analytics or advertising cookies

## Architecture

- Next.js 16 App Router
- React 19 and strict TypeScript
- Plain CSS design system
- JSZip for in-browser packages
- Browser Canvas API for raster processing
- Three.js for GLB preview, local mesh simplification and standards-compliant binary re-export

The core studios run in the browser. Optional AI tasks are deliberately separated and use server-side proxy routes only after explicit consent. AI is disabled unless a deployment owner configures a named compatible gateway.

## Local development

Requirements: Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the final production origin before deployment. This value is used for `robots.txt` and the sitemap. The AI variables are optional.

## Optional AI gateway

KRITIVA does not bundle a paid AI service or claim that reconstruction happens locally. A compatible gateway must expose:

- `POST {KRITIVA_AI_PROVIDER_URL}/generate` accepting multipart fields `task`, `prompt`, and one to five named image files
- `GET {KRITIVA_AI_PROVIDER_URL}/jobs/:id`
- Bearer authentication using `KRITIVA_AI_API_KEY`
- JSON responses using `status` (`queued`, `processing`, `succeeded`, or `failed`), optional `jobId`, HTTPS `outputUrl`, `mimeType`, and `message`

Configure the provider name, retention statement and training policy as environment variables. They are displayed before the user can consent. The included in-memory request limiter is a best-effort abuse control; production deployments should also use durable edge rate limiting.

### Personal local-compute and NVIDIA prototype modes

Set `KRITIVA_AI_MODE=nvidia-prototype` with a private server-side `NVIDIA_API_KEY` to try NVIDIA's hosted TRELLIS endpoint. This mode is deliberately labelled development-only and currently exposes text-to-3D only: NVIDIA's hosted preview API does not accept arbitrary personal image uploads. Never commit the key or expose this mode as a public unlimited service.

Set `KRITIVA_AI_MODE=local-compute` to use the private adapter in [`connectors/local-rtx-connector`](connectors/local-rtx-connector). Both KRITIVA and the connector must run on the same computer; Vercel cannot reach services on a user's localhost. The connector binds to `127.0.0.1`, requires a bearer token and can use NVIDIA TRELLIS NIM or Stable Fast 3D.

Follow [`instructions.md`](instructions.md) for the complete NVIDIA, Apple Silicon, Intel and AMD setup.

Stable Fast 3D provides CUDA acceleration, experimental Apple Silicon MPS support and a CPU fallback for Intel and AMD machines. CPU generation is substantially slower. AMD ROCm acceleration is not advertised because Stable Fast 3D does not officially validate it. NVIDIA currently documents 12 GB VRAM as the minimum and 24 GB as recommended for TRELLIS NIM on Ampere-or-newer GPUs running Linux or WSL2.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Privacy and security decisions

- Files selected in local studios are processed using browser APIs and are not uploaded.
- AI requests require a visible consent checkbox for every transfer.
- Provider keys remain server-side, file count/type/size is validated, and output URLs must use HTTPS.
- File previews use temporary object URLs that are revoked when replaced or unmounted.
- Raster export is re-encoded rather than copying source bytes.
- Files larger than 25 MB are rejected by the image preparer to reduce accidental browser-memory exhaustion.
- Security headers disable framing, object embedding and unnecessary device permissions.
- External links are clearly separated from the local workspace.
- Support uses email rather than a server-side contact form.

Browser-based metadata removal is not forensic sanitisation. Colour-profile handling and codec support vary between browsers. Users should review outputs and independently inspect highly sensitive files.

## Product boundaries

KRITIVA does not store project libraries, transcode video or modify PDFs. AI quality, cost and retention depend on the separately configured provider. A single-view 2D-to-3D result estimates unseen surfaces; multiple views improve the source evidence but do not guarantee geometric accuracy.

## Support

Contact [akbsupportinfo@gmail.com](mailto:akbsupportinfo@gmail.com).

## Repository

Public source: <https://github.com/i-akb25/kritiva>
