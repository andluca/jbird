import { describe, expect, it } from "bun:test";
import { runCli } from "./shared/test/index.ts";

describe("jbird --help", () => {
  it("printa o nome do binario e a secao Usage", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("jbird");
    expect(stdout).toContain("Usage:");
  });

  it("expoe a versao do binario via --version", async () => {
    const { stdout, exitCode } = await runCli(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("lista os 8 comandos na saida do --help", async () => {
    const { stdout, exitCode } = await runCli(["--help"]);
    expect(exitCode).toBe(0);
    const commands = ["init", "tdd", "audit", "refactor", "services", "plugins", "stats", "config"];
    for (const cmd of commands) {
      expect(stdout).toContain(cmd);
    }
  });
});
