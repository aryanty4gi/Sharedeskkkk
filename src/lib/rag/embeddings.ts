import { DEFAULT_EMBEDDING_MODEL } from "./constants";

/**
 * Generates vector embeddings for a given text using the Gemini Embeddings API.
 * Includes a single retry mechanism for transient HTTP errors (429, 500, 503) or network failures.
 *
 * @param text The source text content to embed.
 * @returns A promise resolving to an array of numbers representing the embedding vector.
 * @throws Error if the API key is missing, the response structure is invalid, or the API call fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  // Build the target endpoint URL with the selected embedding model and API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const makeRequest = async () => {
    console.log(
      `[Gemini Embeddings] Requesting embedding for text chunk (length: ${text.length}) using model: ${DEFAULT_EMBEDDING_MODEL}`,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        outputDimensionality: 768,
      }),
    });

    return response;
  };

  let response: Response;
  try {
    response = await makeRequest();
  } catch (err) {
    console.warn(
      "[Gemini Embeddings] Fetch network error on first attempt. Retrying once after 1 second...",
      err,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      response = await makeRequest();
    } catch (retryErr) {
      console.error("[Gemini Embeddings] Fetch network error on retry attempt:", retryErr);
      throw new Error(
        `Gemini Embeddings network error: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
      );
    }
  }

  // Handle transient HTTP failure codes by retrying once after 1 second
  if (response.status === 429 || response.status === 500 || response.status === 503) {
    console.warn(
      `[Gemini Embeddings] Transient HTTP failure (${response.status}) on first attempt. Retrying once after 1 second...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      response = await makeRequest();
    } catch (retryErr) {
      console.error(
        "[Gemini Embeddings] Fetch network error on retry attempt after transient failure:",
        retryErr,
      );
      throw new Error(
        `Gemini Embeddings network error: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
      );
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gemini Embeddings] API responded with status ${response.status}:`, errorText);
    throw new Error(`Gemini Embeddings API error (status ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { embedding?: { values?: number[] } };
  const values = data?.embedding?.values;

  if (!values || !Array.isArray(values)) {
    console.error("[Gemini Embeddings] Invalid API response structure:", JSON.stringify(data));
    throw new Error("Gemini Embeddings API returned an invalid response structure.");
  }

  console.log(
    `[Gemini Embeddings] Successfully generated embedding with ${values.length} dimensions.`,
  );
  return values;
}
