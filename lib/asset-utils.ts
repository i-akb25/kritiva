import type { AssetSpec } from "./specs";

export const bytesToSize = (bytes: number): string => {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
};

export const safeFilename = (value: string, fallback = "asset"): string => {
  const dot = value.lastIndexOf(".");
  const extension = dot > -1 ? value.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const stem = (dot > -1 ? value.slice(0, dot) : value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || fallback}${extension}`;
};

export const extensionFor = (mime: string) => {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return "bin";
};

export const replaceExtension = (filename: string, extension: string) =>
  `${filename.replace(/\.[^/.]+$/, "")}.${extension}`;

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename(filename);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

export const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This browser could not decode the selected image."));
    };
    image.src = url;
  });

export type ProcessOptions = {
  width?: number;
  height?: number;
  quality: number;
  mime: "image/webp" | "image/png";
  fit: "cover" | "contain";
  background?: string;
};

export const processImage = async (file: File, options: ProcessOptions): Promise<{ blob: Blob; width: number; height: number }> => {
  const image = await loadImage(file);
  const requestedWidth = options.width ?? image.naturalWidth;
  const requestedHeight = options.height ?? Math.round(image.naturalHeight * (requestedWidth / image.naturalWidth));
  const scale = Math.min(1, requestedWidth / image.naturalWidth, requestedHeight / image.naturalHeight);
  const canvasWidth = options.width ? Math.max(1, Math.round(requestedWidth * (options.height ? 1 : scale))) : Math.round(image.naturalWidth * scale);
  const canvasHeight = options.height ? Math.max(1, Math.round(requestedHeight)) : Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d", { alpha: options.mime !== "image/png" || !options.background });
  if (!context) throw new Error("Canvas processing is unavailable in this browser.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (options.background) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = canvasWidth / canvasHeight;
  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;
  if (options.fit === "cover") {
    if (imageRatio > targetRatio) {
      drawWidth = canvasHeight * imageRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      drawHeight = canvasWidth / imageRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    }
  } else {
    if (imageRatio > targetRatio) {
      drawHeight = canvasWidth / imageRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imageRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
    }
  }
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, options.mime, options.quality));
  if (!blob) throw new Error(`Your browser cannot export ${options.mime}.`);
  return { blob, width: canvasWidth, height: canvasHeight };
};

export type ValidationResult = { label: string; value: string; state: "pass" | "warn" | "neutral" };

export const validateFile = (file: File, spec: AssetSpec, dimensions?: { width: number; height: number }): ValidationResult[] => {
  const extension = file.name.split(".").pop()?.toUpperCase() || "Unknown";
  const accepted = spec.format.toUpperCase().split(/\s*\/\s*/).includes(extension === "JPG" ? "JPEG" : extension);
  const results: ValidationResult[] = [
    { label: "Format", value: extension, state: accepted ? "pass" : "warn" },
    {
      label: "File size",
      value: bytesToSize(file.size),
      state: spec.maxBytes ? (file.size <= spec.maxBytes ? "pass" : "warn") : "neutral",
    },
    { label: "Filename", value: file.name, state: file.name === safeFilename(file.name) ? "pass" : "warn" },
  ];
  if (dimensions) {
    const exact = spec.width && spec.height ? dimensions.width === spec.width && dimensions.height === spec.height : undefined;
    results.push({
      label: "Dimensions",
      value: `${dimensions.width} × ${dimensions.height}`,
      state: exact === undefined ? "neutral" : exact ? "pass" : "warn",
    });
  }
  return results;
};

export const specAsText = (spec: AssetSpec) => [
  spec.name,
  "",
  `Format: ${spec.format}`,
  `Dimensions: ${spec.dimensions}`,
  `Aspect ratio: ${spec.aspectRatio}`,
  `Target size: ${spec.targetSize}`,
  `Maximum recommended size: ${spec.maxSize}`,
  `Filename: ${spec.filename}`,
  ...spec.notes.map((note) => `• ${note}`),
].join("\n");
