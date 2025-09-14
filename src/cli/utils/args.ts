export function parseFlags(args: string[]) {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (typeof v === "string" && v.length > 0) flags[k] = v;
      else if (i + 1 < args.length && !args[i + 1].startsWith("-")) flags[k] = args[++i];
      else flags[k] = true;
    } else rest.push(a);
  }
  return { flags, rest };
}

