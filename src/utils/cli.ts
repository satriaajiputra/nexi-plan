/**
 * Parse command line arguments
 * Supports both long and short flags
 */
export interface ParsedArgs {
  command: string;
  args: string[];
  flags: Record<string, string | boolean | undefined>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // Skip bun and script path
  const command = args[0] ?? "help";
  const rest = args.slice(1);

  const flags: Record<string, string | boolean | undefined> = {};
  const positional: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg) continue;

    if (arg === "--") {
      // Everything after -- is positional
      positional.push(...rest.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      // Long flag: --name value or --name
      const eqIndex = arg.indexOf("=");
      let flagName: string;
      let flagValue: string | boolean = true;

      if (eqIndex !== -1) {
        flagName = arg.slice(2, eqIndex);
        flagValue = arg.slice(eqIndex + 1);
      } else {
        flagName = arg.slice(2);
        // Check if next arg is a value (not a flag)
        const nextArg = rest[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          flagValue = nextArg;
          i++;
        }
      }

      flags[flagName] = flagValue;
    } else if (arg.startsWith("-")) {
      // Short flag: -n value or -n
      const flagName = arg.slice(1);

      // Check if next arg is a value (not a flag)
      const nextArg = rest[i + 1];
      if (nextArg && !nextArg.startsWith("-")) {
        flags[flagName] = nextArg;
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      // Positional argument
      positional.push(arg);
    }
  }

  return {
    command,
    args: positional,
    flags,
  };
}

/**
 * Map short flags to long flag names
 */
export const FLAG_MAP: Record<string, string> = {
  n: "name",
  t: "type",
  p: "priority",
  d: "description",
  s: "status",
  c: "convergence",
  h: "help",
  v: "version",
};

/**
 * Normalize flags by expanding short flags
 */
export function normalizeFlags(flags: Record<string, string | boolean | undefined>): Record<string, string | boolean | undefined> {
  const normalized: Record<string, string | boolean | undefined> = {};

  for (const [key, value] of Object.entries(flags)) {
    const longKey = FLAG_MAP[key] ?? key;
    normalized[longKey] = value;
  }

  return normalized;
}

/**
 * Get a flag value or default
 */
export function getFlag(
  flags: Record<string, string | boolean | undefined>,
  name: string,
  defaultValue?: string
): string | undefined {
  const value = flags[name];
  if (value === undefined || value === true || value === "") {
    return defaultValue;
  }
  if (typeof value === "string") {
    return value;
  }
  return defaultValue;
}

/**
 * Check if a boolean flag is set
 */
export function hasFlag(
  flags: Record<string, string | boolean | undefined>,
  name: string
): boolean {
  return flags[name] === true || flags[name] === "true";
}

/**
 * Get positional argument at index
 */
export function getArg(args: string[], index: number, defaultValue?: string): string | undefined {
  return args[index] ?? defaultValue;
}

/**
 * Validate required flags
 */
export function requireFlags(
  flags: Record<string, string | boolean | undefined>,
  required: string[]
): void {
  const missing = required.filter((name) => !flags[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required flags: ${missing.map((f) => `--${f}`).join(", ")}`);
  }
}
