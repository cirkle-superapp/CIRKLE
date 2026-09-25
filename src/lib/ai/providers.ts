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
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || "";

// Multiple models per provider — if one model fails, try another within the same provider.
const NVIDIA_MODELS = ["mistralai/mistral-nemotron", "meta/llama-3.1-405b-instruct", "qwen/qwen2.5-7b-instruct"];
const OPENROUTER_MODELS = ["meta-llama/llama-3.3-70b-instruct", "google/gemma-2-9b-it:free", "qwen/qwen-2.5-7b-instruct:free"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

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
// Provider implementations — each tries multiple models before failing
// ---------------------------------------------------------------------------

/** Generic OpenAI-compatible chat completion caller — tries multiple models. */
async function callOpenAICompatible(
  url: string, key: string, models: string[], provider: ProviderName,
  opts: GenerateOptions, extraHeaders: Record<string, string> = {}
): Promise<GenerateResult> {
  const start = Date.now();
  let lastErr = "";
  for (const model of models) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extraHeaders },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 600,
          temperature: opts.temperature ?? 0.8,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        lastErr = `${provider} ${model} ${res.status}: ${t.slice(0, 150)}`;
        continue; // try next model
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || "";
      if (!text) { lastErr = `${provider} ${model} returned empty`; continue; }
      return { text, provider, model, ms: Date.now() - start };
    } catch (e) {
      lastErr = `${provider} ${model}: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`;
      continue; // try next model
    }
  }
  throw new Error(lastErr || `${provider}: all models failed`);
}

async function callNvidia(opts: GenerateOptions): Promise<GenerateResult> {
  return callOpenAICompatible("https://integrate.api.nvidia.com/v1/chat/completions", NVIDIA_KEY, NVIDIA_MODELS, "nvidia", opts);
}

async function callOpenRouter(opts: GenerateOptions): Promise<GenerateResult> {
  return callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", OPENROUTER_KEY, OPENROUTER_MODELS, "openrouter", opts, { "HTTP-Referer": "https://cirkle.app", "X-Title": "Cirkle" });
}

async function callGroq(opts: GenerateOptions): Promise<GenerateResult> {
  return callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", GROQ_KEY, GROQ_MODELS, "groq", opts);
}

async function callGemini(opts: GenerateOptions): Promise<GenerateResult> {
  const start = Date.now();
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const systemInstruction = opts.messages.find((m) => m.role === "system");
  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
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
        lastErr = `Gemini ${model} ${res.status}: ${t.slice(0, 150)}`;
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (!text) { lastErr = `Gemini ${model} returned empty`; continue; }
      return { text, provider: "gemini", model, ms: Date.now() - start };
    } catch (e) {
      lastErr = `Gemini ${model}: ${e instanceof Error ? e.message.slice(0, 100) : String(e)}`;
      continue;
    }
  }
  throw new Error(lastErr || "Gemini: all models failed");
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
