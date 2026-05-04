import type { Stdout } from "../../../shared/services/ports.ts";

export interface StatsReportOptions {
  readonly since: string | undefined;
  readonly json: boolean;
}

export interface StatsReportDeps {
  readonly stdout: Stdout;
}

export function runStatsReport(_opts: StatsReportOptions, deps: StatsReportDeps): Promise<void> {
  deps.stdout.write("jbird stats report: not yet implemented");
  return Promise.resolve();
}
