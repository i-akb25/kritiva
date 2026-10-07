# Hosted AI setup for KRITIVA

This guide enables anonymous online image generation on a Vercel deployment, keeps image-to-3D local, and documents NVIDIA's temporary text-to-3D prototype. KRITIVA does not add user accounts in any mode.

## Mode boundaries

| Deployment mode | Available tools | Runs where | User account |
| --- | --- | --- | --- |
| `cloudflare-images` | Prompt-to-image, backgrounds, illustrations and icon concepts | Vercel → Cloudflare Workers AI | Not required |
| `local-compute` | One-image-to-GLB reconstruction | The user's own computer | Not required |
| `nvidia-prototype` | Temporary text-to-GLB prototype | Vercel → NVIDIA trial API | Not required |
| `gateway` | Custom provider contract | Your own compatible service | Not required by KRITIVA |

Only one `KRITIVA_AI_MODE` can be active in a deployment. The public Vercel deployment should use `cloudflare-images`. Developers can switch their local `.env.local` to `local-compute` when testing image-to-3D.

## A. Enable online image generation on Vercel

### 1. Create the Cloudflare owner credentials

Only the KRITIVA deployment owner needs a Cloudflare account. Website visitors do not need Cloudflare or KRITIVA accounts.

1. Sign in to the Cloudflare dashboard.
2. Open **Workers AI**.
3. Select **Use REST API**.
4. Select **Create a Workers AI API Token** and use Cloudflare's prefilled token template.
5. Copy the API token once and store it securely.
6. Copy the Cloudflare **Account ID**.
7. Create or open an AI Gateway and note its gateway ID. `default` is used only when that is the actual ID shown in your dashboard.

If you create a custom token instead of using Cloudflare's template, Cloudflare currently requires `Workers AI - Read` and `Workers AI - Edit` account permissions.

### 2. Add the Vercel environment variables

In Vercel, open the KRITIVA project and go to **Settings → Environment Variables**. Add each variable separately for **Production**. Add them to Preview only if you intentionally want preview deployments to consume the same quota.

```dotenv
KRITIVA_AI_MODE=cloudflare-images
CLOUDFLARE_ACCOUNT_ID=your-32-character-account-id
CLOUDFLARE_API_TOKEN=your-workers-ai-api-token
CLOUDFLARE_AI_GATEWAY_ID=your-cloudflare-ai-gateway-id
KRITIVA_CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-4b
KRITIVA_AI_RETENTION=KRITIVA does not store generated images
KRITIVA_AI_TRAINING_POLICY=Review Cloudflare and model-provider terms before use
```

Do not add quotation marks. Do not expose these values with a `NEXT_PUBLIC_` prefix. Never commit the real API token.

### 3. Redeploy and verify

Environment changes do not alter an already completed deployment. In Vercel, redeploy the latest `main` commit after saving the variables.

Then open:

```text
https://kritiva.vercel.app/tools/ai
```

The page should show **Provider ready** and list only the online image tasks. Test with a short prompt, tick the consent box, generate one image, preview it, and download it.

If the page still shows **Provider not configured**, verify that:

- `KRITIVA_AI_MODE` is exactly `cloudflare-images`.
- The Account ID is the 32-character Cloudflare ID, not an email or zone ID.
- All variables were added to the environment used by the current deployment.
- You redeployed after saving the variables.

## Public-use controls

KRITIVA requires no account, but anonymous AI cannot honestly be unlimited. The application applies a best-effort per-IP limit of five requests per ten minutes. Vercel instances are distributed, so this limit is not a complete abuse-control system.

Configure a durable request limit and usage alerts in the selected Cloudflare AI Gateway. When the free Workers AI allocation is exhausted, generation fails until the quota resets or the owner enables paid usage. The rest of KRITIVA continues working.

Prompt requests are proxied through KRITIVA's server route. Cloudflare credentials never reach the browser. KRITIVA does not create an image library, database record or user profile. The generated image exists in the browser response until the user downloads it or leaves the page.

## B. Keep image-to-3D local

Do not put these values in Vercel:

```dotenv
KRITIVA_AI_MODE=local-compute
KRITIVA_LOCAL_CONNECTOR_URL=http://127.0.0.1:8787
```

They belong in a developer's local `.env.local`. Vercel cannot reach a connector on somebody's laptop. Follow [`instructions.md`](instructions.md) to install Stable Fast 3D and open KRITIVA at `http://localhost:3000/tools/ai`.

Local mode currently uses one front image. It estimates hidden geometry and must not be presented as measurement-accurate reconstruction.

## C. Try NVIDIA text-to-3D temporarily

Use a separate Vercel Preview deployment or a local development environment. Do not replace the production Cloudflare image mode merely to test NVIDIA.

```dotenv
KRITIVA_AI_MODE=nvidia-prototype
NVIDIA_API_KEY=your-nvidia-api-key
```

Redeploy that preview and open `/tools/ai`. Only **Text to 3D prototype** is exposed. The mode is temporary, depends on NVIDIA trial availability and terms, and must not be advertised as a permanent free service. It does not accept personal image uploads in KRITIVA.

## Recommended production arrangement

- Production Vercel: `cloudflare-images`
- Local developer machine: `local-compute`
- Temporary Vercel Preview: `nvidia-prototype`
- No KRITIVA accounts, database or saved generation history

This separation prevents a temporary trial or an unreachable localhost service from breaking the public image-generation experience.
