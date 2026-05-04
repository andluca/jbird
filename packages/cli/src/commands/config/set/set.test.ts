import { describe, expect, it, afterEach } from "bun:test";
import { runConfigSet } from "./set.ts";
import { ConfigError } from "@jbird/core";
import type { Stdout } from "../../../shared/services/ports.ts";
import type { ConfigWriter } from "../../../shared/services/ConfigWriter.ts";
import type { StateDir } from "../../../shared/services/StateDir.ts";
import type { CoreConfig } from "@jbird/core";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

const UPDATED_CONFIG: CoreConfig = {
  bundle: { version: "0.0.0", profile: "default" },
  services: { proxy: { autostart: true, port: 9999 } },
  routing: { defaultModel: "sonnet", rules: [] },
};

function makeWriter(config: CoreConfig = UPDATED_CONFIG): { writer: ConfigWriter; calls: string[] } {
  const calls: string[] = [];
  const writer: ConfigWriter = {
    setGlobal(key: string, value: unknown): Promise<CoreConfig> {
      calls.push(`global:${key}=${String(value)}`);
      return Promise.resolve(config);
    },
    setProject(_cwd: string, key: string, value: unknown): Promise<CoreConfig> {
      calls.push(`project:${key}=${String(value)}`);
      return Promise.resolve(config);
    },
  } as unknown as ConfigWriter;
  return { writer, calls };
}

function makeStateDir(): StateDir {
  return {
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

describe("runConfigSet", () => {
  afterEach(() => { process.exitCode = 0; });

  it("calls setGlobal when --global flag is set", async () => {
    const { stdout } = makeStdout();
    const { writer, calls } = makeWriter();
    const stateDir = makeStateDir();

    await runConfigSet({ key: "services.proxy.port", value: "9999", global: true, cwd: "/test/project" }, { stdout, configWriter: writer, stateDir });

    expect(calls.some((c) => c.startsWith("global:"))).toBe(true);
  });

  it("calls setProject when --global flag is not set", async () => {
    const { stdout } = makeStdout();
    const { writer, calls } = makeWriter();
    const stateDir = makeStateDir();

    await runConfigSet({ key: "services.proxy.port", value: "9999", global: false, cwd: "/test/project" }, { stdout, configWriter: writer, stateDir });

    expect(calls.some((c) => c.startsWith("project:"))).toBe(true);
  });

  it("writes success feedback to stdout", async () => {
    const { stdout, lines } = makeStdout();
    const { writer } = makeWriter();
    const stateDir = makeStateDir();

    await runConfigSet({ key: "services.proxy.port", value: "9999", global: true, cwd: "/test/project" }, { stdout, configWriter: writer, stateDir });

    expect(lines.join("")).toContain("services.proxy.port");
  });

  it("sets exit code 1 on ConfigError", async () => {
    const { stdout } = makeStdout();
    const failingWriter: ConfigWriter = {
      setGlobal(): Promise<never> { return Promise.reject(new ConfigError("validation failed", { kind: "validation-failed" })); },
      setProject(): Promise<never> { return Promise.reject(new ConfigError("validation failed", { kind: "validation-failed" })); },
    } as unknown as ConfigWriter;
    const stateDir = makeStateDir();
    const { restore } = captureStderr();

    try {
      await runConfigSet({ key: "services.proxy.port", value: "-1", global: true, cwd: "/test/project" }, { stdout, configWriter: failingWriter, stateDir });
    } finally {
      restore();
    }

    expect(process.exitCode).toBe(1);
  });

  it("writes error message to stderr on ConfigError", async () => {
    const { stdout } = makeStdout();
    const failingWriter: ConfigWriter = {
      setGlobal(): Promise<never> { return Promise.reject(new ConfigError("bad value", { kind: "validation-failed" })); },
      setProject(): Promise<never> { return Promise.reject(new ConfigError("bad value", { kind: "validation-failed" })); },
    } as unknown as ConfigWriter;
    const stateDir = makeStateDir();
    const { messages, restore } = captureStderr();

    try {
      await runConfigSet({ key: "services.proxy.port", value: "bad", global: true, cwd: "/test/project" }, { stdout, configWriter: failingWriter, stateDir });
    } finally {
      restore();
    }

    expect(messages.join("")).toContain("bad value");
  });
});
