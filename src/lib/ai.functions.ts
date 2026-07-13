import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const messagesSchema = z.array(
  z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string(),
  })
);

const enrichSchema = z.object({
  query: z.string().min(1).max(2000),
  mode: z.enum(["fast", "deep"]).default("fast"),
  myCompany: z.string().max(500).optional(),
  myProduct: z.string().max(2000).optional(),
});

const summarySchema = z.object({
  prospectCompany: z.string().max(200),
  templateName: z.string().max(200),
  scenario: z.string().max(50),
  metrics: z.object({
    annualCost: z.number(),
    annualGain: z.number(),
    threeYearValue: z.number(),
    paybackMonths: z.number(),
    roiPercent: z.number(),
  }),
  context: z.string().max(2000).optional(),
});

const RESEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "company_intel",
    description: "Structured intel about a prospect company.",
    parameters: {
      type: "object",
      properties: {
        snapshot: { type: "string", description: "2-3 sentence overview of the company, what they do, scale, recent moves." },
        pain_points: { type: "array", items: { type: "string" }, description: "3-5 specific operational pain points." },
        why_we_fit: { type: "array", items: { type: "string" }, description: "3-5 reasons our product specifically helps them. Cite their context." },
        talking_points: { type: "array", items: { type: "string" }, description: "3-5 sales-call talking points / discovery questions." },
        recent_news: { type: "array", items: { type: "string" }, description: "Recent news / signals (only if known)." },
      },
      required: ["snapshot", "pain_points", "why_we_fit", "talking_points"],
      additionalProperties: false,
    },
  },
};

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit hit — slow down or top up Lovable AI credits.");
    if (res.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function firecrawlScrape(url: string): Promise<{ markdown: string; title?: string } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    const md: string | undefined = j?.data?.markdown ?? j?.markdown;
    const title: string | undefined = j?.data?.metadata?.title ?? j?.metadata?.title;
    if (!md) return null;
    return { markdown: md.slice(0, 8000), title };
  } catch {
    return null;
  }
}

function extractUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s)]+/i);
  if (m) return m[0];
  const bare = s.trim().match(/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i);
  return bare ? `https://${bare[0]}` : null;
}

export const enrichCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => enrichSchema.parse(d))
  .handler(async ({ data }) => {
    let scraped: { markdown: string; title?: string } | null = null;
    if (data.mode === "deep") {
      const url = extractUrl(data.query);
      if (url) scraped = await firecrawlScrape(url);
    }

    const sysParts = [
      "You are a senior sales engineer doing pre-call research on a PROSPECT company on behalf of MY COMPANY.",
      "Return crisp, specific, fact-grounded intel — no fluff, no marketing language.",
      data.myCompany ? `MY COMPANY (the seller): ${data.myCompany}` : "",
      data.myProduct ? `WHAT MY COMPANY SELLS (use this verbatim as the basis for 'why_we_fit' — do NOT invent a different product, do NOT guess what the seller does):\n${data.myProduct}` : "",
      "CRITICAL: 'why_we_fit' must explain how the product described in WHAT MY COMPANY SELLS specifically helps the PROSPECT. Never fabricate seller capabilities. If the seller's product genuinely doesn't map to a prospect pain point, say so honestly rather than inventing a fit.",
      data.mode === "deep"
        ? "Use the SCRAPED WEBSITE CONTENT below as primary source of truth about the PROSPECT. Cite specifics from it. If thin, supplement with general knowledge but flag uncertainty."
        : "Be concise. Infer reasonably from the input — don't fabricate specifics about the prospect.",
    ].filter(Boolean).join("\n\n");

    // Worker has a tight CPU budget; use flash even for deep — scraped content is the differentiator, not the model.
    const model = "google/gemini-2.5-flash";

    const userMsg = scraped
      ? `PROSPECT (URL or notes):\n${data.query}\n\nSCRAPED WEBSITE CONTENT${scraped.title ? ` — ${scraped.title}` : ""}:\n${scraped.markdown}\n\nGenerate prospect intel grounded in the scraped content.`
      : `PROSPECT (URL or notes):\n${data.query}\n\nGenerate prospect intel.`;

    const result = await callGateway({
      model,
      messages: [
        { role: "system", content: sysParts },
        { role: "user", content: userMsg },
      ],
      tools: [RESEARCH_TOOL],
      tool_choice: { type: "function", function: { name: "company_intel" } },
    });

    const tc = result?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) throw new Error("AI returned no structured output");
    return args as {
      snapshot: string;
      pain_points: string[];
      why_we_fit: string[];
      talking_points: string[];
      recent_news?: string[];
    };
  });

const SUMMARY_TOOL = {
  type: "function" as const,
  function: {
    name: "exec_summary",
    description: "Executive summary + talking points for an ROI business case.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 paragraph executive summary using the provided metrics. Lead with impact." },
        talking_points: { type: "array", items: { type: "string" }, description: "5 punchy talking points for the sales call." },
      },
      required: ["summary", "talking_points"],
      additionalProperties: false,
    },
  },
};

export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => summarySchema.parse(d))
  .handler(async ({ data }) => {
    const m = data.metrics;
    const ctx = `
PROSPECT: ${data.prospectCompany || "the prospect"}
TEMPLATE: ${data.templateName}
SCENARIO: ${data.scenario}

CALCULATED METRICS:
- Annual Investment: $${Math.round(m.annualCost).toLocaleString()}
- Annual Gain: $${Math.round(m.annualGain).toLocaleString()}
- 3-Year Value: $${Math.round(m.threeYearValue).toLocaleString()}
- Payback: ${m.paybackMonths.toFixed(1)} months
- ROI: ${m.roiPercent.toFixed(0)}%

${data.context ? `EXTRA CONTEXT: ${data.context}` : ""}
`;
    const result = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You write executive-ready ROI business cases. Tight, confident, numbers-first. No hype words." },
        { role: "user", content: ctx },
      ],
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "function", function: { name: "exec_summary" } },
    });
    const tc = result?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : null;
    if (!args) throw new Error("AI returned no structured output");
    return args as { summary: string; talking_points: string[] };
  });

// Generic chat passthrough (unused but available)
export const chat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messages: messagesSchema }).parse(d))
  .handler(async ({ data }) => {
    const r = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: data.messages,
    });
    return { content: r?.choices?.[0]?.message?.content ?? "" };
  });

/* ─────────── Per-block report rewriter ─────────── */

const rewriteSchema = z.object({
  original: z.string().max(4000),
  instruction: z.string().min(1).max(500),
  blockType: z.enum([
    "headline",
    "intro",
    "exec_summary",
    "why_we_fit_item",
    "talking_point",
    "cta",
  ]),
  context: z
    .object({
      prospectCompany: z.string().max(200).optional(),
      myCompany: z.string().max(200).optional(),
      scenario: z.string().max(50).optional(),
      roiPercent: z.number().optional(),
      annualGain: z.number().optional(),
      threeYearValue: z.number().optional(),
      paybackMonths: z.number().optional(),
    })
    .optional(),
});

const BLOCK_GUIDE: Record<string, string> = {
  headline: "A single tight headline (max 12 words). No quotes, no period.",
  intro: "One short paragraph (1-2 sentences) introducing the business case.",
  exec_summary: "2-3 short paragraphs. Numbers-first, executive tone, no hype words.",
  why_we_fit_item: "ONE single bullet (1 sentence). Specific, no preamble, no list markers.",
  talking_point: "ONE single bullet (1 sentence) — a discovery question or talking point. No list markers.",
  cta: "One short call-to-action paragraph (1-2 sentences). Confident, concrete next step.",
};

export const rewriteBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rewriteSchema.parse(d))
  .handler(async ({ data }) => {
    const c = data.context || {};
    const ctxLines = [
      c.myCompany && `MY COMPANY: ${c.myCompany}`,
      c.prospectCompany && `PROSPECT: ${c.prospectCompany}`,
      c.scenario && `SCENARIO: ${c.scenario}`,
      typeof c.roiPercent === "number" && `ROI: ${Math.round(c.roiPercent)}%`,
      typeof c.annualGain === "number" &&
        `ANNUAL GAIN: $${Math.round(c.annualGain).toLocaleString()}`,
      typeof c.threeYearValue === "number" &&
        `3-YEAR VALUE: $${Math.round(c.threeYearValue).toLocaleString()}`,
      typeof c.paybackMonths === "number" &&
        `PAYBACK: ${c.paybackMonths.toFixed(1)} months`,
    ]
      .filter(Boolean)
      .join("\n");

    const system = [
      "You rewrite a single block of an executive ROI business case.",
      "Return ONLY the rewritten text — no preamble, no explanation, no quotes, no markdown fences, no list markers.",
      `BLOCK TYPE: ${data.blockType}. ${BLOCK_GUIDE[data.blockType]}`,
      "Match the existing tone unless the user instruction overrides it.",
      "Never invent metrics that aren't in CONTEXT.",
    ].join("\n");

    const user = [
      ctxLines && `CONTEXT:\n${ctxLines}`,
      `ORIGINAL:\n${data.original || "(empty)"}`,
      `INSTRUCTION: ${data.instruction}`,
      "Rewrite now.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const r = await callGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw: string = r?.choices?.[0]?.message?.content ?? "";
    // Strip wrapping quotes, code fences, leading list markers
    let out = raw.trim();
    out = out.replace(/^```[a-z]*\n?|```$/gi, "").trim();
    out = out.replace(/^["'“”']+|["'“”']+$/g, "").trim();
    out = out.replace(/^[-•*]\s+/, "");
    if (!out) throw new Error("AI returned empty text");
    return { text: out };
  });

/* ─────────── Prospect brand extraction (Firecrawl branding) ─────────── */

const brandSchema = z.object({
  url: z.string().min(3).max(500),
});

function ensureUrl(s: string): string | null {
  const m = s.trim().match(/https?:\/\/[^\s)]+/i);
  if (m) return m[0];
  const bare = s.trim().match(/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i);
  return bare ? `https://${bare[0]}` : null;
}

export const extractBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => brandSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) throw new Error("FIRECRAWL_API_KEY missing");
    const url = ensureUrl(data.url);
    if (!url) throw new Error("No URL found in input");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let res: Response;
    try {
      res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["branding"], onlyMainContent: false }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`Branding fetch failed (${res.status})`);
    const j = await res.json();
    const b = j?.data?.branding ?? j?.branding;
    if (!b) throw new Error("No branding returned");

    const colors = b.colors ?? {};
    const fonts: Array<{ family?: string }> = b.fonts ?? [];
    const images = b.images ?? {};
    const primary: string | undefined = colors.primary || colors.accent;
    const secondary: string | undefined =
      colors.secondary || colors.accent || colors.primary;
    const heading =
      b.typography?.fontFamilies?.heading ||
      b.typography?.fontFamilies?.primary ||
      fonts[0]?.family;
    const body =
      b.typography?.fontFamilies?.primary ||
      fonts[1]?.family ||
      fonts[0]?.family;

    return {
      url,
      logo: (images.logo || b.logo || null) as string | null,
      favicon: (images.favicon || null) as string | null,
      primary: typeof primary === "string" ? primary : null,
      secondary: typeof secondary === "string" ? secondary : null,
      headingFont: typeof heading === "string" ? heading : null,
      bodyFont: typeof body === "string" ? body : null,
    };
  });

// Server-side image proxy: fetch any image URL and return it as a data URL.
// Used by the PDF exporter to avoid browser CORS taint when rasterizing
// third-party logos (e.g. logo.clearbit.com) into a canvas.
const proxyImageSchema = z.object({ url: z.string().url().max(2048) });

// SSRF guard: only allow https public URLs, reject private/loopback IPs and
// internal hostnames before issuing any fetch. Hostname literals like
// "127.0.0.1" / "10.0.0.5" are blocked; DNS-based SSRF to private ranges is
// out of scope for the Worker runtime (no resolver) but blocking literals
// plus restricting to https + image content-types eliminates the common
// attack surface for this endpoint.
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".localhost")
  ) return true;
  // IPv6 loopback / link-local / unique-local
  if (h === "::1" || h.startsWith("[::1") || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  // IPv4 literal?
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast / reserved
  return false;
}

export const proxyImageAsDataUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => proxyImageSchema.parse(d))
  .handler(async ({ data }) => {
    let parsed: URL;
    try { parsed = new URL(data.url); } catch { throw new Error("Invalid URL"); }
    if (parsed.protocol !== "https:") throw new Error("Only https URLs are allowed");
    if (isPrivateHost(parsed.hostname)) throw new Error("Host not allowed");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LovableROI/1.0)" },
      });
      if (res.status >= 300 && res.status < 400) throw new Error("Redirects not allowed");
      if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
      const contentType = res.headers.get("content-type") || "image/png";
      if (!/^image\//i.test(contentType)) throw new Error("Not an image");
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) throw new Error("Image too large");
      // Base64 encode in chunks to avoid call stack overflow on large images.
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        binary += String.fromCharCode(...buf.subarray(i, i + chunk));
      }
      const b64 = btoa(binary);
      return { dataUrl: `data:${contentType};base64,${b64}` };
    } finally {
      clearTimeout(timer);
    }
  });
