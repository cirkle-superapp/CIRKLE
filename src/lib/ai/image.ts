// Cirkle AI — image generation.
//
// Strategy (COO/PM):
//   PRIMARY: Pollinations.ai — free, no key, reliable, ~3s. Returns a JPEG URL
//             directly usable in <img src>. Perfect for the composer.
//   FALLBACK: HuggingFace Inference API (legacy domain often unreachable from
//             sandboxes; kept for deployments with reliable HF connectivity).
//
// Server-side only — never import this in a client component.

const HF_KEY = process.env.HUGGINGFACE_API_KEY || "";
const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export interface ImageGenResult {
  imageUrl: string; // either a public URL (Pollinations) or a data URI (HF)
  model: string;
  ms: number;
}

/**
 * Generate an image from a text prompt.
 * Tries Pollinations first (free, no key), then HuggingFace as fallback.
 */
export async function generateImage(prompt: string): Promise<ImageGenResult> {
  try {
    return await generateViaPollinations(prompt);
  } catch (pollErr) {
    // Fall back to HuggingFace.
    try {
      return await generateViaHuggingFace(prompt);
    } catch (hfErr) {
      throw new Error(
        `Image generation failed. Pollinations: ${pollErr instanceof Error ? pollErr.message : pollErr}. HuggingFace: ${hfErr instanceof Error ? hfErr.message : hfErr}`
      );
    }
  }
}

async function generateViaPollinations(prompt: string): Promise<ImageGenResult> {
  const start = Date.now();
  const seed = Math.floor(Math.random() * 1_000_000);
  const encoded = encodeURIComponent(
    `${prompt}, cinematic, warm lighting, high quality, detailed, social media post`
  );
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=768&nologo=true&seed=${seed}`;

  // Pollinations returns the image directly on a GET — verify it's reachable.
  const res = await fetchWithTimeout(url, { method: "GET" }, 30000);
  if (!res.ok) {
    throw new Error(`Pollinations ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Pollinations returned non-image: ${contentType}`);
  }
  // Return the public URL directly — no need to re-encode as base64.
  return { imageUrl: url, model: "pollinations/flux", ms: Date.now() - start };
}

async function generateViaHuggingFace(prompt: string): Promise<ImageGenResult> {
  const start = Date.now();
  const res = await fetchWithTimeout(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_KEY}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_inference_steps: 28, guidance_scale: 7, width: 1024, height: 768 },
      }),
    },
    30000
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HuggingFace ${res.status}: ${t.slice(0, 120)}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    const t = await res.text().catch(() => "");
    throw new Error(`HuggingFace returned non-image: ${t.slice(0, 120)}`);
  }
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUri = `data:${contentType};base64,${base64}`;
  return { imageUrl: dataUri, model: HF_MODEL, ms: Date.now() - start };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function imageProviderStatus(): { pollinations: boolean; huggingface: boolean } {
  return { pollinations: true, huggingface: !!HF_KEY };
}
