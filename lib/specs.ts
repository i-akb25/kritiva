export type AssetCategory = "Images" | "Brand" | "Social" | "Motion & 3D" | "Documents" | "Data & content";

export type AssetSpec = {
  id: string;
  name: string;
  category: AssetCategory;
  format: string;
  dimensions: string;
  aspectRatio: string;
  targetSize: string;
  maxBytes?: number;
  maxSize: string;
  filename: string;
  notes: string[];
  width?: number;
  height?: number;
  quality?: number;
};

export const categories: Array<AssetCategory | "All"> = [
  "All",
  "Images",
  "Brand",
  "Social",
  "Motion & 3D",
  "Documents",
  "Data & content",
];

export const assetSpecs: AssetSpec[] = [
  {
    id: "project-cover", name: "Project cover", category: "Images", format: "WebP", dimensions: "1600 × 1200", aspectRatio: "4:3",
    targetSize: "150–350 KB", maxSize: "500 KB", maxBytes: 500_000, filename: "cover.webp", width: 1600, height: 1200, quality: 0.84,
    notes: ["sRGB colour profile", "Visually lossless compression", "Remove unnecessary metadata"],
  },
  {
    id: "project-thumbnail", name: "Project thumbnail", category: "Images", format: "WebP", dimensions: "1200 × 900", aspectRatio: "4:3",
    targetSize: "80–200 KB", maxSize: "300 KB", maxBytes: 300_000, filename: "thumbnail.webp", width: 1200, height: 900, quality: 0.82,
    notes: ["sRGB colour profile", "Use the same crop language as project covers"],
  },
  {
    id: "section-illustration", name: "Section illustration", category: "Images", format: "WebP", dimensions: "1600 × 1200", aspectRatio: "4:3",
    targetSize: "150–400 KB", maxSize: "600 KB", maxBytes: 600_000, filename: "section-name.webp", width: 1600, height: 1200, quality: 0.84,
    notes: ["1920 × 1080 is available as a 16:9 alternative", "sRGB colour profile"],
  },
  {
    id: "full-background", name: "Full-width background", category: "Images", format: "WebP", dimensions: "1920 × 1080", aspectRatio: "16:9",
    targetSize: "250–500 KB", maxSize: "750 KB", maxBytes: 750_000, filename: "background.webp", width: 1920, height: 1080, quality: 0.82,
    notes: ["Keep focal content clear of text-safe regions", "sRGB colour profile"],
  },
  {
    id: "transparent-asset", name: "Transparent image", category: "Images", format: "WebP", dimensions: "≤ 1600 px longest edge", aspectRatio: "Original",
    targetSize: "100–350 KB", maxSize: "500 KB", maxBytes: 500_000, filename: "asset-name.webp", width: 1600, quality: 0.88,
    notes: ["Preserve alpha channel", "Preserve the original aspect ratio", "sRGB colour profile"],
  },
  {
    id: "article-cover", name: "Journal / Knowledge cover", category: "Images", format: "WebP", dimensions: "1600 × 900", aspectRatio: "16:9",
    targetSize: "120–300 KB", maxSize: "450 KB", maxBytes: 450_000, filename: "cover.webp", width: 1600, height: 900, quality: 0.83,
    notes: ["sRGB colour profile", "Keep important content away from edges"],
  },
  {
    id: "article-image", name: "Article inline image", category: "Images", format: "WebP", dimensions: "≤ 1400 px width", aspectRatio: "Original",
    targetSize: "100–300 KB", maxSize: "450 KB", maxBytes: 450_000, filename: "descriptive-name.webp", width: 1400, quality: 0.84,
    notes: ["Preserve source aspect ratio", "Use a descriptive lowercase filename"],
  },
  {
    id: "screenshot", name: "Product screenshot", category: "Images", format: "WebP", dimensions: "≤ 1920 px width", aspectRatio: "Original",
    targetSize: "150–400 KB", maxSize: "600 KB", maxBytes: 600_000, filename: "feature-name.webp", width: 1920, quality: 0.86,
    notes: ["Prefer the native screenshot dimensions", "Check small text after compression"],
  },
  {
    id: "logo-wordmark", name: "Logo / wordmark", category: "Brand", format: "SVG", dimensions: "Scalable vector", aspectRatio: "Original",
    targetSize: "< 50 KB", maxSize: "100 KB", maxBytes: 100_000, filename: "brand-logo.svg",
    notes: ["Tight viewBox around artwork", "RGB colour mode", "Remove editor metadata"],
  },
  {
    id: "brand-mark", name: "Brand mark source", category: "Brand", format: "SVG", dimensions: "Scalable vector", aspectRatio: "1:1",
    targetSize: "< 30 KB", maxSize: "50 KB", maxBytes: 50_000, filename: "brand-mark.svg",
    notes: ["Square viewBox", "RGB colour mode", "Keep a monochrome variant"],
  },
  {
    id: "raster-logo", name: "Raster logo", category: "Brand", format: "PNG", dimensions: "1024 × 1024", aspectRatio: "1:1",
    targetSize: "100–300 KB", maxSize: "500 KB", maxBytes: 500_000, filename: "brand-logo.png", width: 1024, height: 1024,
    notes: ["Transparent background", "sRGB colour profile"],
  },
  {
    id: "favicon", name: "Favicon", category: "Brand", format: "ICO", dimensions: "16, 32 and 48 px embedded", aspectRatio: "1:1",
    targetSize: "< 50 KB", maxSize: "50 KB", maxBytes: 50_000, filename: "favicon.ico",
    notes: ["Test at 16 × 16", "Avoid fine details"],
  },
  {
    id: "favicon-png", name: "Standard favicon PNG", category: "Brand", format: "PNG", dimensions: "32 × 32", aspectRatio: "1:1",
    targetSize: "< 20 KB", maxSize: "20 KB", maxBytes: 20_000, filename: "favicon-32x32.png", width: 32, height: 32,
    notes: ["sRGB colour profile", "Transparent background when appropriate"],
  },
  {
    id: "apple-icon", name: "Apple Touch Icon", category: "Brand", format: "PNG", dimensions: "180 × 180", aspectRatio: "1:1",
    targetSize: "< 100 KB", maxSize: "100 KB", maxBytes: 100_000, filename: "apple-touch-icon.png", width: 180, height: 180,
    notes: ["Do not rely on transparency", "Keep artwork inside a safe margin"],
  },
  {
    id: "pwa-192", name: "PWA icon", category: "Brand", format: "PNG", dimensions: "192 × 192", aspectRatio: "1:1",
    targetSize: "< 100 KB", maxSize: "100 KB", maxBytes: 100_000, filename: "icon-192.png", width: 192, height: 192,
    notes: ["sRGB colour profile", "Standard icon purpose"],
  },
  {
    id: "pwa-512", name: "Large PWA icon", category: "Brand", format: "PNG", dimensions: "512 × 512", aspectRatio: "1:1",
    targetSize: "100–250 KB", maxSize: "400 KB", maxBytes: 400_000, filename: "icon-512.png", width: 512, height: 512,
    notes: ["sRGB colour profile", "Standard icon purpose"],
  },
  {
    id: "pwa-maskable", name: "Maskable PWA icon", category: "Brand", format: "PNG", dimensions: "512 × 512", aspectRatio: "1:1",
    targetSize: "100–250 KB", maxSize: "400 KB", maxBytes: 400_000, filename: "icon-maskable-512.png", width: 512, height: 512,
    notes: ["Keep primary artwork inside the central 80% safe area", "Use an opaque background"],
  },
  {
    id: "skill-icon", name: "Skill icon", category: "Brand", format: "SVG", dimensions: "Square vector", aspectRatio: "1:1",
    targetSize: "< 20 KB", maxSize: "50 KB", maxBytes: 50_000, filename: "skill-name.svg",
    notes: ["RGB colour mode", "Keep stroke weight consistent across the set"],
  },
  {
    id: "ui-icon", name: "UI icon", category: "Brand", format: "SVG", dimensions: "24 × 24 viewBox", aspectRatio: "1:1",
    targetSize: "< 10 KB", maxSize: "10 KB", maxBytes: 10_000, filename: "icon-name.svg",
    notes: ["Use a consistent stroke or fill system", "Include an accessible label only when the SVG is meaningful"],
  },
  {
    id: "og-image", name: "Open Graph image", category: "Social", format: "WebP / PNG", dimensions: "1200 × 630", aspectRatio: "1.91:1",
    targetSize: "150–350 KB", maxSize: "500 KB", maxBytes: 500_000, filename: "og-default.webp", width: 1200, height: 630, quality: 0.86,
    notes: ["Keep essential text inside the central safe region", "Create page-specific variants when useful"],
  },
  {
    id: "lottie", name: "Lottie animation", category: "Motion & 3D", format: "JSON", dimensions: "Responsive vector", aspectRatio: "Design-specific",
    targetSize: "< 200 KB", maxSize: "500 KB", maxBytes: 500_000, filename: "animation-name.json",
    notes: ["Prefer 30 fps unless 60 fps is visibly necessary", "Avoid unsupported effects and embedded raster assets"],
  },
  {
    id: "web-video", name: "Web video", category: "Motion & 3D", format: "WebM", dimensions: "≤ 1920 × 1080", aspectRatio: "16:9",
    targetSize: "2–4 MB", maxSize: "5 MB", maxBytes: 5_000_000, filename: "animation-name.webm",
    notes: ["VP9 or AV1 codec", "Remove audio when unnecessary", "Provide a poster image"],
  },
  {
    id: "video-fallback", name: "MP4 fallback", category: "Motion & 3D", format: "MP4", dimensions: "≤ 1920 × 1080", aspectRatio: "16:9",
    targetSize: "2–5 MB", maxSize: "5 MB", maxBytes: 5_000_000, filename: "animation-name.mp4",
    notes: ["H.264 codec", "Standard web colour profile", "Use only when a fallback is required"],
  },
  {
    id: "3d-model", name: "3D model", category: "Motion & 3D", format: "GLB", dimensions: "Optimized mesh", aspectRatio: "3D",
    targetSize: "< 2 MB", maxSize: "5 MB", maxBytes: 5_000_000, filename: "model-name.glb",
    notes: ["Reduce polygon count", "Use compressed WebP or JPEG textures", "Remove unused nodes and animations"],
  },
  {
    id: "font", name: "Web font", category: "Motion & 3D", format: "WOFF2", dimensions: "Subset characters", aspectRatio: "N/A",
    targetSize: "20–100 KB", maxSize: "150 KB", maxBytes: 150_000, filename: "font-name-weight.woff2",
    notes: ["Subset where practical", "Ship only the weights actually used", "Confirm font licensing"],
  },
  {
    id: "resume", name: "Résumé", category: "Documents", format: "PDF", dimensions: "A4 or Letter", aspectRatio: "Document",
    targetSize: "100–500 KB", maxSize: "1 MB", maxBytes: 1_000_000, filename: "full-name-resume.pdf",
    notes: ["Prefer one page for a standard résumé", "Keep text selectable and ATS-readable", "Use one consistent page size"],
  },
  {
    id: "certificate", name: "Certificate", category: "Documents", format: "PDF", dimensions: "Print-readable", aspectRatio: "Original",
    targetSize: "< 1 MB", maxSize: "2 MB", maxBytes: 2_000_000, filename: "certificate-name.pdf",
    notes: ["Keep text searchable where possible", "Redact IDs that are not meant to be public"],
  },
  {
    id: "guide", name: "Technical guide", category: "Documents", format: "PDF", dimensions: "A4", aspectRatio: "Document",
    targetSize: "1–3 MB", maxSize: "5 MB", maxBytes: 5_000_000, filename: "guide-name.pdf",
    notes: ["Embed fonts", "150–200 DPI is usually sufficient for images", "Include document metadata"],
  },
  {
    id: "mdx", name: "Journal / Knowledge content", category: "Data & content", format: "MDX", dimensions: "UTF-8 text", aspectRatio: "N/A",
    targetSize: "Content-dependent", maxSize: "Keep focused", filename: "article-slug.mdx",
    notes: ["YAML frontmatter", "Lowercase kebab-case slug", "Validate imported components"],
  },
  {
    id: "json", name: "Structured data", category: "Data & content", format: "JSON", dimensions: "UTF-8 text", aspectRatio: "N/A",
    targetSize: "Content-dependent", maxSize: "Keep focused", filename: "data-name.json",
    notes: ["Valid JSON with no comments", "Use a documented schema when shared"],
  },
  {
    id: "csv", name: "Tabular export", category: "Data & content", format: "CSV", dimensions: "UTF-8 text", aspectRatio: "N/A",
    targetSize: "Content-dependent", maxSize: "Split very large exports", filename: "export-name.csv",
    notes: ["Comma delimiter", "Include a header row", "Escape spreadsheet formulas in untrusted data"],
  },
  {
    id: "zip", name: "Download package", category: "Data & content", format: "ZIP", dimensions: "Archive", aspectRatio: "N/A",
    targetSize: "As small as practical", maxSize: "Only intended files", filename: "package-name.zip",
    notes: ["Use standard ZIP compression", "Exclude source files, secrets and system metadata", "Include a manifest"],
  },
];

export const getSpec = (id: string) => assetSpecs.find((spec) => spec.id === id) ?? assetSpecs[0];
