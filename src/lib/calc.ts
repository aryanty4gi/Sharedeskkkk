import type { Template } from "./types";
import { evalFormula } from "./formula";

export interface Computed {
  scope: Record<string, number>;
  annualCost: number;
  annualGain: number;
  netAnnual: number;
  threeYearValue: number;
  paybackMonths: number;
  roiPercent: number;
}

export function compute(
  template: Template,
  values: Record<string, number>,
  scenarioMultiplier: number
): Computed {
  // Build scope from raw inputs
  const scope: Record<string, number> = {};
  [...(template.parameters ?? []), ...(template.returns ?? [])].forEach((f) => {
    scope[f.key] = values[f.key] ?? f.default;
  });

  // Evaluate non-role formulas first (with multiple passes to resolve dependencies),
  // then evaluate annual_cost / annual_gain last so they see all computed values.
  const allFormulas = template.formulas ?? [];
  const roleKeys = new Set(["annual_cost", "annual_gain"]);
  const nonRole = allFormulas.filter((f) => !roleKeys.has(f.key));
  const role = allFormulas.filter((f) => roleKeys.has(f.key));

  // Fixpoint over non-role formulas to handle out-of-order dependencies.
  for (let pass = 0; pass < nonRole.length + 1; pass++) {
    let changed = false;
    for (const f of nonRole) {
      const next = evalFormula(f.expression, scope);
      if (scope[f.key] !== next) {
        scope[f.key] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const f of role) {
    scope[f.key] = evalFormula(f.expression, scope);
  }

  const annualCost = Math.max(0, scope.annual_cost ?? 0);
  const rawGain = Math.max(0, scope.annual_gain ?? 0);
  const annualGain = rawGain * scenarioMultiplier;
  const netAnnual = annualGain - annualCost;
  const threeYearValue = annualGain * 3 - annualCost; // amortized impl
  const paybackMonths = annualGain > 0 ? Math.max(0.1, (annualCost / annualGain) * 12) : Infinity;
  const roiPercent = annualCost > 0 ? (netAnnual / annualCost) * 100 : 0;

  return {
    scope,
    annualCost,
    annualGain,
    netAnnual,
    threeYearValue,
    paybackMonths,
    roiPercent,
  };
}
