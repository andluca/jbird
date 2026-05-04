import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { STUB_EXIT_CODE } from "../../shared/exit-codes.ts";
import { runScaffold } from "./scaffold/scaffold.ts";
import { runGenerate } from "./generate/generate.ts";

interface InitOptions {
  readonly prompt?: string;
  readonly profile?: string;
  readonly index: boolean;
  readonly shellSetup: boolean;
}

interface CommandDeps {
  readonly stdout: Stdout;
}

// stub: 003 — real FS empty-check enters in 009
function pathLooksEmpty(_path: string): boolean {
  return false;
}

export function registerInit(program: Command, deps: CommandDeps): void {
  program
    .command("init")
    .description("Scaffold a jbird-managed project (adopt existing or generate from prompt).")
    .argument("[path]", "project path", ".")
    .option("--prompt <description>", "generate a new project from this description (Mode B)")
    .option("--profile <name>", "bundle profile to use", "default")
    .option("--no-index", "skip Context-Lens initial indexing")
    .option("--no-shell-setup", "skip shell-profile ANTHROPIC_BASE_URL setup")
    .action(async (path: string, opts: InitOptions) => {
      if (opts.prompt !== undefined || pathLooksEmpty(path)) {
        await runGenerate({ path, prompt: opts.prompt, profile: opts.profile }, deps);
      } else {
        await runScaffold({ path, profile: opts.profile, index: opts.index, shellSetup: opts.shellSetup }, deps);
      }
      process.exitCode = STUB_EXIT_CODE;
    });
}
