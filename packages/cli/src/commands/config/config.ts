import { Command } from "commander";
import type { Stdout, Editor } from "../../shared/services/ports.ts";
import type { ConfigLoader } from "../../shared/services/ConfigLoader.ts";
import type { ConfigWriter } from "../../shared/services/ConfigWriter.ts";
import type { StateDir } from "../../shared/services/StateDir.ts";
import { runConfigGet } from "./get/get.ts";
import { runConfigSet } from "./set/set.ts";
import { runConfigEdit } from "./edit/edit.ts";

interface CommandDeps {
  readonly stdout: Stdout;
  readonly configLoader: ConfigLoader;
  readonly configWriter: ConfigWriter;
  readonly stateDir: StateDir;
  readonly editor: Editor;
}

export function registerConfig(program: Command, deps: CommandDeps): void {
  const config = new Command("config").description("Manage jbird configuration.");

  config
    .command("get")
    .description("Get a configuration value.")
    .argument("<key>", "dot-notation config key (e.g. services.proxy.port)")
    .action(async (key: string) => {
      await runConfigGet({ key, cwd: process.cwd() }, deps);
    });

  config
    .command("set")
    .description("Set a configuration value.")
    .argument("<key>", "dot-notation config key")
    .argument("<value>", "value to set")
    .option("-g, --global", "write to global config instead of project config")
    .action(async (key: string, value: string, cmdOpts: { global?: boolean }) => {
      await runConfigSet({ key, value, global: cmdOpts.global ?? false, cwd: process.cwd() }, deps);
    });

  config
    .command("edit")
    .description("Open the configuration file in $VISUAL / $EDITOR / vi.")
    .option("-g, --global", "edit global config instead of project config")
    .action(async (cmdOpts: { global?: boolean }) => {
      await runConfigEdit({ global: cmdOpts.global ?? true, cwd: process.cwd() }, deps);
    });

  program.addCommand(config);
}
