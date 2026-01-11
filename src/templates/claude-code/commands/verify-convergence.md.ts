export const VERIFY_CONVERGENCE_CLAUDE_CODE_COMMAND_TEMPLATE = `---
description: Verify convergence for a specific task and identify unconverged items
---

# Verify Convergence Command

You are verifying convergence for task: $ARGUMENTS

Follow these steps:

1. **View** "$ARGUMENTS" task to get the detail of the task

2. **Run convergence-verifier agent** to get the real convergence value for task "$ARGUMENTS"

3. **Collect unconverged items** from the convergence-verifier agent's response

4. **Check for false positives** - Use Explore tools (sub agent) IN PARALLEL to verify each unconverged item returned by the convergence-verifier agent. This is MANDATORY and Should be done with Explore tool.

5. **Report results** - Provide:
   - List of confirmed unconverged items (excluding false positives)
   - The real convergence value for the task`;
