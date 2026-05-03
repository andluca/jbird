#!/usr/bin/env bun
import { Command } from "commander";

const program = new Command();

program
  .name("jbird")
  .description("CLI pessoal que estende Claude Code via routing dinamico, RAG, caveman compression e workflows agenticos.")
  .version("0.0.0");

program.parse();
