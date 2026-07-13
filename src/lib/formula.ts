import type { Formula } from "./types";

// Safe expression evaluator for template formulas.
// Supports identifiers, numbers, + - * / ( ) and Math.* whitelist.

// Strict character allowlist: digits, math ops, parens, comma, dot, whitespace,
// and identifier chars. Identifiers are further allowlisted below.
const ALLOWED_CHARS = /^[\s\d+\-*/().,a-zA-Z_]+$/;
const IDENT = /[a-zA-Z_][a-zA-Z0-9_]*/g;
const MATH_ALLOWED = new Set([
  "Math",
  "abs", "min", "max", "round", "floor", "ceil",
  "sqrt", "pow", "log", "log2", "log10", "exp",
  "sign", "trunc",
]);

export function isSafeFormulaExpression(
  expression: string,
  scopeKeys: Iterable<string>
): boolean {
  if (!expression || !ALLOWED_CHARS.test(expression)) return false;
  const allowed = new Set<string>(MATH_ALLOWED);
  for (const k of scopeKeys) allowed.add(k);
  const idents = expression.match(IDENT) ?? [];
  for (const id of idents) {
    if (!allowed.has(id)) return false;
  }
  return true;
}

export function evalFormula(
  expression: string,
  scope: Record<string, number>
): number {
  const keys = Object.keys(scope);
  if (!isSafeFormulaExpression(expression, keys)) return 0;
  const values = keys.map((k) => Number(scope[k]) || 0);
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, "Math", `"use strict"; return (${expression});`);
    const out = fn(...values, Math);
    return Number.isFinite(out) ? Number(out) : 0;
  } catch {
    return 0;
  }
}

const identifierChars = "a-zA-Z0-9_";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function referencesIdentifier(expression: string, key: string): boolean {
  if (!expression || !key) return false;
  const escaped = escapeRegExp(key);
  return new RegExp(`(^|[^${identifierChars}])${escaped}([^${identifierChars}]|$)`).test(expression);
}

export function hasAdditiveTerm(expression: string, key: string): boolean {
  if (!expression || !key) return false;
  const escaped = escapeRegExp(key);
  const token = `(?:${escaped}|\\(\\s*${escaped}\\s*\\))`;
  return new RegExp(`(^|[+])\\s*${token}\\s*(?=([+\\-]|$))`).test(expression);
}

export function appendAdditiveTerm(expression: string, key: string): string {
  const current = expression.trim();
  return current ? `${current} + ${key}` : key;
}

export function removeAdditiveTerm(expression: string, key: string): string {
  if (!expression || !key) return "";

  const escaped = escapeRegExp(key);
  const token = `(?:${escaped}|\\(\\s*${escaped}\\s*\\))`;
  let next = expression;

  next = next.replace(new RegExp(`\\s+[+]\\s*${token}(?=\\s*(?:[+\\-]|$))`, "g"), "");
  next = next.replace(new RegExp(`^\\s*${token}\\s*[+]\\s*`, "g"), "");
  next = next.replace(new RegExp(`^\\s*[+]\\s*${token}\\s*$`, "g"), "");
  next = next.replace(new RegExp(`^\\s*${token}\\s*$`, "g"), "");

  return next.replace(/\s+/g, " ").replace(/^\s*\+\s*/, "").trim();
}

export function setFormulaRole(
  formulas: Formula[],
  fieldKey: string,
  nextRole: "none" | "cost" | "gain"
): Formula[] {
  const targetKey = nextRole === "cost" ? "annual_cost" : nextRole === "gain" ? "annual_gain" : null;
  const roleKeys = new Set(["annual_cost", "annual_gain"]);
  let sawTarget = false;

  const nextFormulas = formulas.map((formula) => {
    if (!roleKeys.has(formula.key)) return formula;

    const withoutField = removeAdditiveTerm(formula.expression, fieldKey);
    if (formula.key !== targetKey) return { ...formula, expression: withoutField };

    sawTarget = true;
    return { ...formula, expression: appendAdditiveTerm(withoutField, fieldKey) };
  });

  if (targetKey && !sawTarget) {
    nextFormulas.push({ key: targetKey, label: targetKey, expression: fieldKey });
  }

  return nextFormulas;
}
