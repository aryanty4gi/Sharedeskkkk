import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const sendGeminiMessageSchema = z.object({
  accessToken: z.string().min(1),
  messages: z.array(messageSchema).min(1).max(20),
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

async function getAuthenticatedClient(token: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase configuration environment variables.");
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    throw new Error("Unauthorized: Invalid session or authentication expired.");
  }

  return { client, user };
}

export const sendGeminiMessageAction = createServerFn({ method: "POST" })
  .inputValidator((d) => sendGeminiMessageSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      // 1. Verify user authentication
      try {
        await getAuthenticatedClient(data.accessToken);
      } catch (authErr) {
        console.error("[Gemini Server] User authentication failed:", authErr instanceof Error ? authErr.message : authErr);
        return { error: "User authentication failed" };
      }

      // 2. Fetch Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[Gemini Server] GEMINI_API_KEY is not configured.");
        return { error: "GEMINI_API_KEY is not configured" };
      }

      // 3. Map messages from client format (user, assistant) to Gemini format (user, model)
      const contents = data.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const systemInstructionText = `You are ShareDesk AI, the workplace assistant for Nuberg Engineering employees.

Help users with:
- drafting professional workplace messages
- summarizing provided text
- explaining technical and business concepts
- brainstorming
- productivity
- workplace communication
- general questions

Be concise, useful, professional, and clear.

Do not claim to have access to private company files, messages, documents, employee data, databases, or live internal systems unless that information has actually been provided to you through an implemented tool or context.

Never invent internal company information.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini Server] Gemini API responded with status ${response.status}. Response Body:`, errorText);
        
        if (response.status === 401 || response.status === 403) {
          return { error: "Gemini authentication failed" };
        }
        if (response.status === 404) {
          console.error(`[Gemini Server] Model not found or unavailable: ${GEMINI_MODEL}`);
          return { error: "Configured Gemini model is unavailable" };
        }
        if (response.status === 429) {
          return { error: "Gemini quota/rate limit exceeded" };
        }
        return { error: "Gemini request failed" };
      }

      const resJson = await response.json();
      const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error("[Gemini Server] Gemini returned an empty response candidate structure:", JSON.stringify(resJson));
        return { error: "Gemini request failed" };
      }

      return { text };
    } catch (err) {
      console.error("[Gemini Server] Internal handler exception:", err instanceof Error ? err.message : err);
      return { error: "Gemini request failed" };
    }
  });
