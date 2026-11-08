import type { QualityReport } from "./types";

export const MAX_BYTES = 8 * 1024 * 1024;
export const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function validateFile(f: File): string | null {
  if (!ALLOWED.includes(f.type)) return "Please choose a JPG, PNG or WEBP image.";
  if (f.size > MAX_BYTES) return "That image is larger than 8 MB.";
  return null;
}

export function fileToResizedDataUrl(f: File, max = 900): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => rej(new Error("Could not read image"));
    img.src = URL.createObjectURL(f);
  });
}

function dataUrlToBlob(u: string) {
  const [h, b] = u.split(",");
  const mime = h.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Real OpenCV analysis via the FIRST 30 FastAPI service. */
export async function analyzeWithOpenCV(apiUrl: string, image: string, baseline?: string) {
  const fd = new FormData();
  fd.append("image", dataUrlToBlob(image), "image.jpg");
  if (baseline) fd.append("baseline", dataUrlToBlob(baseline), "baseline.jpg");
  const r = await fetch(`${apiUrl}/analyze`, { method: "POST", body: fd });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? `Service error ${r.status}`);
  const j = await r.json();
  return {
    quality: { ...j.quality, source: "opencv" } as QualityReport,
    normalizedUrl: j.normalized as string | undefined,
  };
}

export async function pingOpenCV(apiUrl: string) {
  const r = await fetch(`${apiUrl}/health`);
  if (!r.ok) throw new Error("unreachable");
  return (await r.json()) as { status: string; opencv: string };
}

/**
 * Basic browser-side quality estimate (NOT OpenCV): mean brightness and Laplacian variance
 * on a grayscale downscale. Clearly labelled as such in the UI. No alignment.
 */
export function browserQuickCheck(dataUrl: string): Promise<QualityReport> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const W = 256;
      const H = Math.round((img.height / img.width) * W);
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const g = new Float32Array(W * H);
      let sum = 0;
      for (let i = 0; i < W * H; i++) {
        g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        sum += g[i];
      }
      const mean = sum / (W * H);
      let ls = 0, ls2 = 0, n = 0;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          const l = g[i - W] + g[i + W] + g[i - 1] + g[i + 1] - 4 * g[i];
          ls += l; ls2 += l * l; n++;
        }
      const v = ls2 / n - (ls / n) ** 2;
      res(classify(mean, v, "browser"));
    };
    img.onerror = () => rej(new Error("bad image"));
    img.src = dataUrl;
  });
}

export function classify(brightness: number, sharpness: number, source: QualityReport["source"]): QualityReport {
  return {
    source,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    lighting: brightness < 70 ? "dark" : brightness > 200 ? "bright" : "good",
    sharp: sharpness < 60 ? "blurry" : "good",
  };
}

export function lightingMismatch(a?: QualityReport, b?: QualityReport) {
  if (!a || !b) return false;
  return Math.abs(a.brightness - b.brightness) > 35;
}
