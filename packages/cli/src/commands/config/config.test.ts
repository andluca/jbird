import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerConfig } from "./config.ts";
import type { Stdout, Editor } from "../../shared/services/ports.ts";
import type { ConfigLoader } from "../../shared/services/ConfigLoader.ts";
import type { ConfigWriter } from "../../shared/services/ConfigWriter.ts";
import type { StateDir } from "../../shared/services/StateDir.ts";
import type { CoreConfig } from "@jbird/core";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

const BASE_CONFIG: CoreConfig = {
  bundle: { version: "0.0.0", profile: "default" },
  services: { proxy: { autostart: true, port: 7878 } },
  routing: { defaultModel: "sonnet", rules: [] },
};

function makeDeps(stdout: Stdout) {
  const configLoader: ConfigLoader = {
    load(): Promise<CoreConfig> { return Promise.resolve(BASE_CONFIG); },
    loadGlobal(): Promise<CoreConfig> { return Promise.resolve(BASE_CONFIG); },
    loadProject(): Promise<null> { return Promise.resolve(null); },
  } as unknown as ConfigLoader;

  const configWriter: ConfigWriter = {
    setGlobal(): Promise<CoreConfig> { return Promise.resolve(BASE_CONFIG); },
    setProject(): Promise<CoreConfig> { return Promise.resolve(BASE_CONFIG); },
  } as unknown as ConfigWriter;

  const stateDir: StateDir = {
    ensureGlobal(): Promise<{ root: string; configPath: string; logsDir: string; servicesDir: string; cacheDir: string; statsDir: string }> {
      return Promise.resolve({
        root: "/home/user/.jbird",
        configPath: "/home/user/.jbird/config.toml",
        logsDir: "/home/user/.jbird/logs",
        servicesDir: "/home/user/.jbird/services",
        cacheDir: "/home/user/.jbird/cache",
        statsDir: "/home/user/.jbird/stats",
      });
    },
    ensureProject(cwd: string): Promise<{ root: string; configPath: string }> {
      return Promise.resolve({ root: `${cwd}/.jbird`, configPath: `${cwd}/.jbird/config.toml` });
    },
    globalRoot() { return "/home/user/.jbird"; },
    projectRoot(cwd: string) { return `${cwd}/.jbird`; },
  } as unknown as StateDir;

  const editor: Editor = {
    open(): Promise<number> { return Promise.resolve(0); },
  };

  return { stdout, configLoader, configWriter, stateDir, editor };
}

describe("registerConfig dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'config get <key>' returns the default port value for services.proxy.port", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerConfig(program, makeDeps(stdout));
    await program.parseAsync(["config", "get", "services.proxy.port"], { from: "user" });
    expect(lines.join("")).toBe("7878");
  });
});
