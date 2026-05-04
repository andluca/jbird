import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runTdd } from "./run/run.ts";

interface TddOptions {
  readonly mode: "feature" | "change" | "bug";
  readonly stack?: string;
  readonly maxIterations: string;
}

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerTdd(program: Command, deps: CommandDeps): void {
  program
    .command("tdd")
    .description("Run TDD workflow for a work description.")
    .argument("<work>", "description of the work to implement")
    .option("--mode <mode>", "TDD mode: feature, change, or bug", "feature")
    .option("--stack <runner>", "test runner / stack override")
    .option("--max-iterations <n>", "maximum TDD iterations", "5")
    .action(async (work: string, opts: TddOptions) => {
      await runTdd(
        { work, mode: opts.mode, stack: opts.stack, maxIterations: parseInt(opts.maxIterations, 10) },
        deps,
      );
      process.exitCode = 2;
    });
}
