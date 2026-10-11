import { downloadBlob, safeFilename } from "./asset-utils";

export type RasterFormat = "image/webp" | "image/png" | "image/jpeg";

export async function transformGeneratedImage(input: {
  imageBase64: string;
  sourceMimeType: string;
  width: number;
  height: number;
  format: RasterFormat;
  quality: number;
}) {
  const source = `data:${input.sourceMimeType};base64,${input.imageBase64}`;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = () => reject(new Error("The generated image could not be decoded."));
    next.src = source;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.min(8192, Math.round(input.width)));
  canvas.height = Math.max(1, Math.min(8192, Math.round(input.height)));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is unavailable in this browser.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (input.format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, input.format, input.quality));
  if (!blob) throw new Error(`This browser cannot export ${input.format}.`);
  return blob;
}

export async function downloadTransformedImage(input: Parameters<typeof transformGeneratedImage>[0] & { filename: string }) {
  const blob = await transformGeneratedImage(input);
  const extension = input.format === "image/png" ? "png" : input.format === "image/webp" ? "webp" : "jpg";
  downloadBlob(blob, `${safeFilename(input.filename || "generated-image").replace(/\.[^.]+$/, "")}.${extension}`);
}
