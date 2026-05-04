import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runStatsReport } from "./report/report.ts";

interface StatsOptions {
  readonly since?: string;
  readonly json: boolean;
}

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerStats(program: Command, deps: CommandDeps): void {
  program
    .command("stats")
    .description("Show usage statistics.")
    .option("--since <window>", "time window (e.g. 7d, 1h)")
    .option("--json", "output as JSON", false)
    .action(async (opts: StatsOptions) => {
      await runStatsReport({ since: opts.since, json: opts.json }, deps);
      process.exitCode = 2;
    });
}
