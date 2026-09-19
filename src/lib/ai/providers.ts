// Cirkle AI — unified multi-provider text generation with intelligent fallback.
//
// Strategy (COO/PM):
//   PRIMARY:  OpenRouter (meta-llama/llama-3.3-70b-instruct) — verified working, ~1.7s
//   FALLBACK: Nvidia NIM (mistralai/mistral-nemotron) — verified working, ~1.4s for short
//   DORMANT:  Groq (key invalid) + Gemini (region-blocked in sandbox) — remain
//             in code, activated via env vars when valid keys are supplied.
//
// All keys are read from env vars first (for Vercel deployment), falling back
// to the dev keys provided. Server-side only — never import this in a client
// component.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Which provider to prefer (defaults to auto-fallback chain). */
  prefer?: "nvidia" | "openrouter" | "groq" | "gemini";
}

export interface GenerateResult {
  text: string;
  provider: "nvidia" | "openrouter" | "groq" | "gemini";
  model: string;
  ms: number;
}

// ---------------------------------------------------------------------------
// Provider keys (env-first, dev fallback)
// ---------------------------------------------------------------------------
const GROQ_KEY = process.env.GROQ_API_KEY || ""; // provided key returns 403 — set a valid one via env
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || ""; // provided key is region-blocked — set via env when unblocked
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || "";

const NVIDIA_MODEL = "mistralai/mistral-nemotron";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-2.0-flash";

/** The Cirkle AI persona — warm, concise, premium, uses Cirkle vocabulary. */
export const CIRKLE_SYSTEM_PROMPT = `You are the Cirkle AI companion — warm, insightful, and concise. Cirkle (دواير) is a premium social app with pillars: Wasl (chat), Mashahd (watch), Echoes (moments/stories), and the Circle (feed). You help users draft posts, suggest replies, summarize their feed, and spark ideas. Keep replies short (1-3 sentences unless asked for more). Use a friendly, sophisticated tone. Never mention you are powered by a specific upstream model — you are the Cirkle AI.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch with a timeout — prevents a slow provider from blocking the fallback chain. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------
async function callNvidia(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const res = await fetchWithTimeout("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${NVIDIA_KEY}` },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.8,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Nvidia ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Nvidia returned empty content");
  return { text, provider: "nvidia", model: NVIDIA_MODEL, ms: Date.now() - start };
}

async function callOpenRouter(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://cirkle.app",
      "X-Title": "Cirkle",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.8,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("OpenRouter returned empty content");
  return { text, provider: "openrouter", model: OPENROUTER_MODEL, ms: Date.now() - start };
}

async function callGroq(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.8,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Groq returned empty content");
  return { text, provider: "groq", model: GROQ_MODEL, ms: Date.now() - start };
}

async function callGemini(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const systemInstruction = opts.messages.find((m) => m.role === "system");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 600, temperature: opts.temperature ?? 0.8 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  if (!text) throw new Error("Gemini returned empty content");
  return { text, provider: "gemini", model: GEMINI_MODEL, ms: Date.now() - start };
}

type ProviderName = "openrouter" | "nvidia" | "groq" | "gemini";
const PROVIDERS: Record<ProviderName, (opts: GenerateOptions) => Promise<GenerateResult>> = {
  openrouter: callOpenRouter,
  nvidia: callNvidia,
  groq: callGroq,
  gemini: callGemini,
};

/** Fallback chain — only includes providers with a configured key. */
function buildChain(prefer?: ProviderName): ProviderName[] {
  const all: ProviderName[] = ["openrouter", "nvidia", "groq", "gemini"];
  const configured = all.filter((p) => {
    if (p === "nvidia") return !!NVIDIA_KEY;
    if (p === "openrouter") return !!OPENROUTER_KEY;
    if (p === "groq") return !!GROQ_KEY;
    return !!GEMINI_KEY;
  });
  if (prefer) {
    return [prefer, ...configured.filter((p) => p !== prefer)];
  }
  return configured;
}

/**
 * Generate text using the multi-provider fallback chain.
 * Tries the preferred provider first, then falls through on failure.
 */
export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const chain = buildChain(opts.prefer);
  if (chain.length === 0) throw new Error("No AI providers are configured. Set at least one of: NVIDIA_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY");

  const errors: string[] = [];
  for (const p of chain) {
    try {
      return await PROVIDERS[p](opts);
    } catch (e) {
      errors.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}

/** Check which providers are configured (for /api/ai/health). */
export function aiProviderStatus() {
  return {
    nvidia: !!NVIDIA_KEY,
    openrouter: !!OPENROUTER_KEY,
    groq: !!GROQ_KEY,
    gemini: !!GEMINI_KEY,
  };
}
