import { describe, expect, it, afterEach } from "bun:test";
import { runConfigEdit } from "./edit.ts";
import type { Stdout, Editor } from "../../../shared/services/ports.ts";
import type { ConfigLoader } from "../../../shared/services/ConfigLoader.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";
import type { CoreConfig } from "@jbird/core";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

function makeEditor(exitCode = 0): { editor: Editor; openedPaths: string[] } {
  const openedPaths: string[] = [];
  const editor: Editor = {
    open(path: string): Promise<number> {
      openedPaths.push(path);
      return Promise.resolve(exitCode);
    },
  };
  return { editor, openedPaths };
}

const BASE_CONFIG: CoreConfig = {
  bundle: { version: "0.0.0", profile: "default" },
  services: { proxy: { autostart: true, port: 7878 } },
  routing: { defaultModel: "sonnet", rules: [] },
};

function makeLoader(config: CoreConfig = BASE_CONFIG): ConfigLoader {
  return {
    load(): Promise<CoreConfig> { return Promise.resolve(config); },
    loadGlobal(): Promise<CoreConfig> { return Promise.resolve(config); },
    loadProject(): Promise<null> { return Promise.resolve(null); },
  } as unknown as ConfigLoader;
}

function makeStateDir(configPath = "/home/user/.jbird/config.toml"): StateDir {
  return {
    ensureGlobal(): Promise<{ root: string; configPath: string; logsDir: string; servicesDir: string; cacheDir: string; statsDir: string }> {
      return Promise.resolve({
        root: "/home/user/.jbird",
        configPath,
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
}

function captureStderr(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const orig = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk: string | Uint8Array) => {
    messages.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    return true;
  };
  return { messages, restore: () => { process.stderr.write = orig; } };
}

describe("runConfigEdit", () => {
  afterEach(() => { process.exitCode = 0; });

  it("opens the config file path in the editor", async () => {
    const { stdout } = makeStdout();
    const { editor, openedPaths } = makeEditor(0);
    const stateDir = makeStateDir("/home/user/.jbird/config.toml");
    const loader = makeLoader();

    await runConfigEdit({ global: true, cwd: "/test/project" }, { stdout, editor, stateDir, configLoader: loader });

    expect(openedPaths).toContain("/home/user/.jbird/config.toml");
  });

  it("writes success feedback to stdout after successful edit", async () => {
    const { stdout, lines } = makeStdout();
    const { editor } = makeEditor(0);
    const stateDir = makeStateDir();
    const loader = makeLoader();

    await runConfigEdit({ global: true, cwd: "/test/project" }, { stdout, editor, stateDir, configLoader: loader });

    expect(lines.join("")).toContain("config saved");
  });

  it("sets exit code 1 when editor exits non-zero", async () => {
    const { stdout } = makeStdout();
    const { editor } = makeEditor(1);
    const stateDir = makeStateDir();
    const loader = makeLoader();
    const { restore } = captureStderr();

    try {
      await runConfigEdit({ global: true, cwd: "/test/project" }, { stdout, editor, stateDir, configLoader: loader });
    } finally {
      restore();
    }

    expect(process.exitCode).toBe(1);
  });

  it("sets exit code 1 when reloaded config is invalid post-edit", async () => {
    const { stdout } = makeStdout();
    const { editor } = makeEditor(0);
    const stateDir = makeStateDir();
    const { ConfigError } = await import("@jbird/core");
    const failLoader: ConfigLoader = {
      load(): Promise<never> { return Promise.reject(new ConfigError("invalid", { kind: "validation-failed" })); },
      loadGlobal(): Promise<never> { return Promise.reject(new ConfigError("invalid", { kind: "validation-failed" })); },
      loadProject(): Promise<null> { return Promise.resolve(null); },
    } as unknown as ConfigLoader;
    const { restore } = captureStderr();

    try {
      await runConfigEdit({ global: true, cwd: "/test/project" }, { stdout, editor, stateDir, configLoader: failLoader });
    } finally {
      restore();
    }

    expect(process.exitCode).toBe(1);
  });
});
