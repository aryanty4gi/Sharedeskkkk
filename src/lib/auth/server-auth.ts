import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Helper function to instantiate a Supabase client and validate the provided access token.
 * This prevents duplicating client construction and network-level token validation.
 *
 * @param accessToken The JWT session token from the client.
 * @returns The authenticated Supabase client and corresponding User object.
 */
async function createAndValidateClient(accessToken: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase configuration environment variables.");
  }

  if (!accessToken) {
    throw new Error("Unauthorized: Access token is required.");
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);
  if (error || !user) {
    throw new Error("Unauthorized: Invalid session or authentication expired.");
  }

  return { client, user };
}

/**
 * Creates and returns an authenticated Supabase client for the given access token
 * after validating the token.
 *
 * @param accessToken The session token provided by the client
 * @returns A promise resolving to the authenticated Supabase client
 * @throws Error if the token is invalid or Supabase configuration is missing
 */
export async function getAuthenticatedClient(accessToken: string) {
  const { client } = await createAndValidateClient(accessToken);
  return client;
}

/**
 * Validates the given access token and returns the authenticated user object.
 *
 * @param accessToken The session token provided by the client
 * @returns A promise resolving to the user metadata
 * @throws Error if the token is invalid or Supabase configuration is missing
 */
export async function getAuthenticatedUser(accessToken: string) {
  const { user } = await createAndValidateClient(accessToken);
  return user;
}
