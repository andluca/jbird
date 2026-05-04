const ENTRY = new URL("../../jbird.ts", import.meta.url).pathname;

export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export async function runCli(args: readonly string[]): Promise<CliResult> {
  const proc = Bun.spawn(["bun", "run", ENTRY, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}
