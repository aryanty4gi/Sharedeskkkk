import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

// Public read-only endpoint backing the prospect-facing /share/$dealId page.
// Uses the admin client to bypass RLS for a single deal lookup by id;
// only returns fields safe to expose publicly (no auth credentials, no list
// of all deals, and the deal owner's user_id is never returned).
export const getSharedDeal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ dealId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: deal, error: dErr } = await supabaseAdmin
      .from("deals")
      .select(
        "id, name, scenario, values, color_theme, template_id, template_snapshot, prospect_company, prospect_logo_url, prospect_brand, user_id",
      )
      .eq("id", data.dealId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!deal) return { deal: null, template: null, brand: null } as const;

    let template: Json | null = (deal.template_snapshot as Json | null) ?? null;
    if (!template && deal.template_id) {
      const { data: t } = await supabaseAdmin
        .from("templates")
        .select("*")
        .eq("id", deal.template_id)
        .maybeSingle();
      if (t) template = t as unknown as Json;
    }

    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("company_name, brand_logo_url")
      .eq("user_id", deal.user_id)
      .limit(1)
      .maybeSingle();

    // Strip the owner's user_id before returning to the public client.
    const { user_id: _userId, ...publicDeal } = deal;
    return {
      deal: publicDeal,
      template,
      brand: {
        company_name: settings?.company_name ?? "",
        brand_logo_url: settings?.brand_logo_url ?? null,
      },
    } as const;
  });