import { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { runConfigGet } from "./get/get.ts";
import { runConfigSet } from "./set/set.ts";
import { runConfigEdit } from "./edit/edit.ts";

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerConfig(program: Command, deps: CommandDeps): void {
  const config = new Command("config").description("Manage jbird configuration.");

  config
    .command("get")
    .description("Get a configuration value.")
    .argument("<key>", "dot-notation config key (e.g. proxy.port)")
    .action(async (key: string) => {
      await runConfigGet({ key }, deps);
      process.exitCode = 2;
    });

  config
    .command("set")
    .description("Set a configuration value.")
    .argument("<key>", "dot-notation config key")
    .argument("<value>", "value to set")
    .action(async (key: string, value: string) => {
      await runConfigSet({ key, value }, deps);
      process.exitCode = 2;
    });

  config
    .command("edit")
    .description("Open the configuration file in $EDITOR.")
    .action(async () => {
      await runConfigEdit({}, deps);
      process.exitCode = 2;
    });

  program.addCommand(config);
}
