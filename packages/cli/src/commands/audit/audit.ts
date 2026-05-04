import type { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runAudit } from "./run/run.ts";

interface AuditOptions {
  readonly scope: "quality" | "security" | "architecture" | "all";
  readonly format: "md" | "json";
  readonly output?: string;
}

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerAudit(program: Command, deps: CommandDeps): void {
  program
    .command("audit")
    .description("Audit a project for quality, security, or architecture issues.")
    .argument("[path]", "project path to audit", ".")
    .option("--scope <scope>", "audit scope: quality, security, architecture, or all", "all")
    .option("--format <format>", "output format: md or json", "md")
    .option("--output <path>", "write report to this file path")
    .action(async (path: string, opts: AuditOptions) => {
      await runAudit({ path, scope: opts.scope, format: opts.format, output: opts.output }, deps);
      process.exitCode = 2;
    });
}
