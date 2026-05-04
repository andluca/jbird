import { Command } from "commander";
import type { Stdout } from "../../shared/services/ports.ts";
import { STUB_EXIT_CODE } from "../../shared/exit-codes.ts";
import { runPluginsSync } from "./sync/sync.ts";
import { runPluginsList } from "./list/list.ts";

interface CommandDeps {
  readonly stdout: Stdout;
}

export function registerPlugins(program: Command, deps: CommandDeps): void {
  const plugins = new Command("plugins").description("Manage jbird plugins.");

  plugins
    .command("sync")
    .description("Sync plugins from the registry.")
    .action(async () => {
      await runPluginsSync({}, deps);
      process.exitCode = STUB_EXIT_CODE;
    });

  plugins
    .command("list")
    .description("List installed plugins.")
    .action(async () => {
      await runPluginsList({}, deps);
      process.exitCode = STUB_EXIT_CODE;
    });

  program.addCommand(plugins);
}
