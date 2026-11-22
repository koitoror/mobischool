// Read-only, bounded readiness checks. A timeout fails the workflow; it never skips an assertion.
export async function waitForUI(evaluate, expression, description, timeout = 8000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch (error) {
      // A navigation can briefly destroy the previous execution context.
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw Error(`UI readiness timed out: ${description}${last ? ` (${last})` : ""}`);
}
