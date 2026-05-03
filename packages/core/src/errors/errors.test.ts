import { describe, expect, it } from "bun:test";
import { errorBodySchema } from "../schemas/ipc.ts";
import { BundleError } from "./bundle-error.ts";
import { ConfigError } from "./config-error.ts";
import { IpcError } from "./ipc-error.ts";
import { JbirdError } from "./jbird-error.ts";
import { ProxyError } from "./proxy-error.ts";
import { ServiceLifecycleError } from "./service-lifecycle-error.ts";

describe("error code discriminator", () => {
  it("ConfigError carries code 'config'", () => {
    expect(new ConfigError("msg").code).toBe("config");
  });

  it("BundleError carries code 'bundle'", () => {
    expect(new BundleError("msg").code).toBe("bundle");
  });

  it("ProxyError carries code 'proxy'", () => {
    expect(new ProxyError("msg").code).toBe("proxy");
  });

  it("ServiceLifecycleError carries code 'service-lifecycle'", () => {
    expect(new ServiceLifecycleError("msg").code).toBe("service-lifecycle");
  });

  it("IpcError carries code 'ipc'", () => {
    expect(new IpcError("msg").code).toBe("ipc");
  });
});

describe("toJSON()", () => {
  it("returns code and message", () => {
    const err = new ConfigError("Validation failed");
    const json = err.toJSON();
    expect(json).toEqual({ code: "config", message: "Validation failed" });
  });

  it("includes details when provided", () => {
    const err = new ConfigError("Validation failed", { kind: "validation-failed" });
    expect(err.toJSON().details).toEqual({ kind: "validation-failed" });
  });

  it("omits details key entirely when not provided", () => {
    const json = new ConfigError("msg").toJSON();
    expect("details" in json).toBe(false);
  });

  it("never exposes stack trace", () => {
    const err = new ConfigError("msg with stack");
    expect("stack" in err.toJSON()).toBe(false);
  });
});

describe("integration with errorBodySchema (IPC envelope)", () => {
  // toJSON() output must round-trip through the schema that wire-encodes it.
  // This is the only contract that matters across the IPC boundary.
  const subclasses: JbirdError[] = [
    new ConfigError("config msg", { kind: "parse-failed" }),
    new BundleError("bundle msg", { kind: "manifest-invalid" }),
    new ProxyError("proxy msg", { kind: "upstream-unreachable" }),
    new ServiceLifecycleError("slc msg", { kind: "spawn-failed" }),
    new IpcError("ipc msg", { kind: "version-mismatch" }),
  ];

  it.each(subclasses)(
    "$code error body parses through errorBodySchema",
    (err: JbirdError) => {
      const parsed = errorBodySchema.parse({ error: err.toJSON() });
      expect(parsed.error.code).toBe(err.code);
      expect(parsed.error.message).toBe(err.message);
    },
  );
});

describe("can be caught as Error", () => {
  // ES2022 Error subclass behavior (instead of testing instanceof N times,
  // verify the actual catch-as-Error contract that downstream try/catch relies on).
  it("ConfigError thrown is catchable in a generic Error catch", () => {
    let caught: Error | undefined;
    try {
      throw new ConfigError("boom");
    } catch (e) {
      if (e instanceof Error) caught = e;
    }
    expect(caught?.message).toBe("boom");
    expect(caught?.name).toBe("ConfigError");
  });
});
