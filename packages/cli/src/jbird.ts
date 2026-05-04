#!/usr/bin/env bun
import { Command } from "commander";
import { createStdout } from "./shared/integrations/stdout.ts";
import { createNodeFs } from "./shared/integrations/fs.ts";
import { createTomlAdapter } from "./shared/integrations/toml.ts";
import { createEditor } from "./shared/integrations/editor.ts";
import { createSystemClock } from "./shared/integrations/clock.ts";
import { createConsoleLogger } from "./shared/integrations/logger.ts";
import { StateDir } from "./shared/services/StateDir.ts";
import { ConfigLoader } from "./shared/services/ConfigLoader.ts";
import { ConfigWriter } from "./shared/services/ConfigWriter.ts";
import { JournalWriter } from "./shared/services/JournalWriter.ts";
import { registerInit } from "./commands/init/init.ts";
import { registerTdd } from "./commands/tdd/tdd.ts";
import { registerAudit } from "./commands/audit/audit.ts";
import { registerRefactor } from "./commands/refactor/refactor.ts";
import { registerServices } from "./commands/services/services.ts";
import { registerPlugins } from "./commands/plugins/plugins.ts";
import { registerStats } from "./commands/stats/stats.ts";
import { registerConfig } from "./commands/config/config.ts";

const program = new Command()
  .name("jbird")
  .description("CLI pessoal que estende Claude Code via routing dinamico, RAG, caveman compression e workflows agenticos.")
  .version("0.0.0");

const fs = createNodeFs();
const toml = createTomlAdapter();
const editor = createEditor();
const clock = createSystemClock();
const logger = createConsoleLogger();
const stateDir = new StateDir(fs);
const configLoader = new ConfigLoader(fs, toml, stateDir, logger);
const configWriter = new ConfigWriter(fs, toml, stateDir, configLoader);
const journalWriter = new JournalWriter(fs, clock);

const deps = {
  stdout: createStdout(),
  stateDir,
  configLoader,
  configWriter,
  journalWriter,
  editor,
  logger,
};

registerInit(program, deps);
registerTdd(program, deps);
registerAudit(program, deps);
registerRefactor(program, deps);
registerServices(program, deps);
registerPlugins(program, deps);
registerStats(program, deps);
registerConfig(program, deps);

program.parse();
