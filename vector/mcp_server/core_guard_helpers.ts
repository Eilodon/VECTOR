export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeRecursive(value: unknown, depth = 0): unknown {
  const banned = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "system prompt",
    "developer message",
    "override",
    "disregard",
    "jailbreak",
    "reveal chain of thought",
    "tool output",
    "hidden instruction",
  ];
  if (depth > 20) {
    throw new Error("Input nesting is too deep.");
  }
  if (typeof value === "string") {
    if (value.length > 20000) {
      throw new Error("Input string is too long.");
    }
    const lower = value.toLowerCase();
    for (const keyword of banned) {
      if (lower.includes(keyword)) {
        throw new Error(`Prompt injection detected: forbidden phrase '${keyword}'.`);
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) {
      throw new Error("Input array is too large.");
    }
    return value.map((item) => sanitizeRecursive(item, depth + 1));
  }
  if (isObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      cleaned[key] = sanitizeRecursive(val, depth + 1);
    }
    return cleaned;
  }
  return value;
}

export function ensurePhaseAllowed(currentPhase: string, expected: string[]): void {
  if (!expected.includes(currentPhase)) {
    throw new Error(
      `Phase guard failed. Current phase is '${currentPhase}', but this tool expects one of: ${expected.join(", ")}.`,
    );
  }
}

export function ensureToolPhase(
  toolName: string,
  currentPhase: string,
  toolPolicy: (toolName: string) => { entry_phases: readonly string[] } | null | undefined,
): void {
  const policy = toolPolicy(toolName);
  if (!policy) {
    throw new Error(`Tool policy is missing for '${toolName}'.`);
  }
  ensurePhaseAllowed(currentPhase, [...policy.entry_phases]);
}

export function requireShipReadyCopyReview(state: { sales_copy?: unknown; copy_review?: { ship_ready?: boolean } | null }) {
  if (!state.sales_copy) {
    throw new Error("Ship-facing outputs require an existing sales_copy artifact. Run vector_sales_copy first.");
  }
  if (!state.copy_review) {
    throw new Error("Ship-facing outputs require vector_copy_review before render or launch.");
  }
  if (!state.copy_review.ship_ready) {
    throw new Error("Current copy_review is not ship-ready. Revise the copy pack and rerun vector_copy_review before rendering ship-facing assets.");
  }
  return state.copy_review;
}
