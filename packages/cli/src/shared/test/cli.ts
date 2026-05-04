const ENTRY = new URL("../../jbird.ts", import.meta.url).pathname;

export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface RunCliOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export async function runCli(args: readonly string[], opts?: RunCliOptions): Promise<CliResult> {
  const proc = Bun.spawn(["bun", "run", ENTRY, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    cwd: opts?.cwd ?? process.cwd(),
    env: opts?.env ?? process.env,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}
