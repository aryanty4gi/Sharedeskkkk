import { describe, expect, test } from "bun:test";

import { compute } from "../src/lib/calc";
import { setFormulaRole } from "../src/lib/formula";
import type { Formula, Template } from "../src/lib/types";

const baseFormulas: Formula[] = [
  { key: "annual_cost", label: "Annual Investment", expression: "seats * price_per_seat + implementation_cost" },
  { key: "productivity_savings", label: "Productivity Savings", expression: "seats * hours_saved_per_user * 50 * loaded_hourly_rate" },
  { key: "churn_savings", label: "Retention Value", expression: "seats * price_per_seat * (churn_reduction / 100)" },
  { key: "annual_gain", label: "Annual Gain", expression: "productivity_savings + churn_savings" },
];

describe("ROI formula mapping", () => {
  test("mapping a field preserves existing annual cost and gain formulas", () => {
    const formulas = setFormulaRole(baseFormulas, "monthly_subscription", "cost");

    expect(formulas.find((formula) => formula.key === "annual_cost")?.expression)
      .toBe("seats * price_per_seat + implementation_cost + monthly_subscription");
    expect(formulas.find((formula) => formula.key === "annual_gain")?.expression)
      .toBe("productivity_savings + churn_savings");

    const template: Template = {
      id: "template",
      name: "SaaS",
      description: null,
      industry: null,
      icon: null,
      color_theme: "orange",
      parameters: [
        { key: "seats", label: "Seats", type: "number", default: 270 },
        { key: "price_per_seat", label: "Price", type: "currency", default: 170 },
        { key: "implementation_cost", label: "Implementation", type: "currency", default: 38000 },
        { key: "monthly_subscription", label: "Monthly subscription", type: "currency", default: 30 },
      ],
      returns: [
        { key: "hours_saved_per_user", label: "Hours", type: "number", default: 4 },
        { key: "loaded_hourly_rate", label: "Rate", type: "currency", default: 75 },
        { key: "churn_reduction", label: "Churn", type: "percent", default: 8 },
      ],
      formulas,
      outputs: [],
      scenarios: { conservative: 0.75, expected: 1, optimistic: 1.25 },
      is_builtin: true,
      sort_order: 1,
    };

    const result = compute(template, {}, 1);

    expect(result.annualCost).toBe(83930);
    expect(result.annualGain).toBeGreaterThan(0);
  });
});