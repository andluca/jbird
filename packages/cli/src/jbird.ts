#!/usr/bin/env bun
import { Command } from "commander";
import { createStdout } from "./shared/integrations/stdout.ts";
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

const deps = { stdout: createStdout() };

registerInit(program, deps);
registerTdd(program, deps);
registerAudit(program, deps);
registerRefactor(program, deps);
registerServices(program, deps);
registerPlugins(program, deps);
registerStats(program, deps);
registerConfig(program, deps);

program.parse();
