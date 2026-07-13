export type FieldType = "currency" | "number" | "percent" | "slider" | "select";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  min?: number;
  max?: number;
  step?: number;
  default: number;
  unit?: string;
  help?: string;
  options?: { label: string; value: number }[];
}

export interface Formula {
  key: string;
  label: string;
  expression: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  icon: string | null;
  color_theme: string;
  parameters: Field[];
  returns: Field[];
  formulas: Formula[];
  outputs: unknown[];
  scenarios: { conservative: number; expected: number; optimistic: number };
  is_builtin: boolean;
  sort_order: number;
}

export interface Deal {
  id: string;
  name: string;
  template_id: string | null;
  prospect_company: string | null;
  prospect_logo_url: string | null;
  color_theme: string;
  scenario: "conservative" | "expected" | "optimistic";
  values: Record<string, number>;
  template_snapshot: Template | null;
  ai_summary: string | null;
  ai_talking_points: string[] | null;
  report: Record<string, any> | null;
  prospect_brand: {
    logo?: string | null;
    favicon?: string | null;
    primary?: string | null;
    secondary?: string | null;
    headingFont?: string | null;
    bodyFont?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchResult {
  snapshot: string;
  pain_points: string[];
  why_we_fit: string[];
  talking_points: string[];
  recent_news?: string[];
  sources?: { title: string; url: string }[];
  suggested_template?: string;
  suggested_values?: Record<string, number>;
}
