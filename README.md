# KRITIVA

**Create once. Export everything.**

KRITIVA is a private, project-aware workspace for preparing production-ready website assets. It standardizes formats, dimensions, filenames and file-weight targets, then performs supported image work locally in the browser.

## Current release

- Searchable specifications for images, brand files, social previews, motion, 3D, documents and structured content
- Local PNG/JPEG/WebP inspection
- Local WebP resize, crop, compression and download
- Re-encoding that removes ordinary EXIF metadata
- File validation against the selected production specification
- Favicon, Apple Touch and PWA icon-pack generation
- ZIP export with an ICO file, manifest snippet and usage notes
- Responsive layouts for phone, tablet, laptop and large desktop
- No accounts, database, analytics, advertising cookies or file-upload API

## Architecture

- Next.js 16 App Router
- React 19 and strict TypeScript
- Plain CSS design system
- JSZip for in-browser packages
- Browser Canvas API for raster processing

The website is statically rendered. Source files are held in browser memory and are not intentionally sent to the application server. There is no server-side processing route in this repository.

## Local development

Requirements: Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the final production origin before deployment. This value is used for `robots.txt` and the sitemap.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Privacy and security decisions

- Uploaded files are processed using browser APIs.
- File previews use temporary object URLs that are revoked when replaced or unmounted.
- Raster export is re-encoded rather than copying source bytes.
- Files larger than 25 MB are rejected by the image preparer to reduce accidental browser-memory exhaustion.
- Security headers disable framing, object embedding and unnecessary device permissions.
- External links are clearly separated from the local workspace.
- Support uses email rather than a server-side contact form.

Browser-based metadata removal is not forensic sanitisation. Colour-profile handling and codec support vary between browsers. Users should review outputs and independently inspect highly sensitive files.

## Product boundaries

KRITIVA does not currently generate original AI artwork, edit SVG paths, transcode video, optimize GLB files, modify PDFs or store project libraries. The specification library covers these asset types, but the interface must not imply that unsupported processing is available.

## Support

Contact [akbsupportinfo@gmail.com](mailto:akbsupportinfo@gmail.com).

## Repository

Public source: <https://github.com/i-akb25/kritiva>
