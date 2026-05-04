import { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runServicesStart } from "./start/start.ts";
import { runServicesStop } from "./stop/stop.ts";
import { runServicesStatus } from "./status/status.ts";
import { runServicesInstall } from "./install/install.ts";
import { runServicesLogs } from "./logs/logs.ts";

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerServices(program: Command, deps: CommandDeps): void {
  const services = new Command("services").description("Manage jbird side services.");

  services
    .command("start")
    .description("Start the jbird proxy service.")
    .action(async () => {
      await runServicesStart({}, deps);
      process.exitCode = 2;
    });

  services
    .command("stop")
    .description("Stop the jbird proxy service.")
    .action(async () => {
      await runServicesStop({}, deps);
      process.exitCode = 2;
    });

  services
    .command("status")
    .description("Show status of jbird side services.")
    .action(async () => {
      await runServicesStatus({}, deps);
      process.exitCode = 2;
    });

  services
    .command("install")
    .description("Install jbird as a system service.")
    .action(async () => {
      await runServicesInstall({}, deps);
      process.exitCode = 2;
    });

  services
    .command("logs")
    .description("Stream logs from the jbird proxy service.")
    .action(async () => {
      await runServicesLogs({}, deps);
      process.exitCode = 2;
    });

  program.addCommand(services);
}
