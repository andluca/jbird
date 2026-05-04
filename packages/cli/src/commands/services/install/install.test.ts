import { describe, expect, it } from "bun:test";
import { runServicesInstall } from "./install.ts";
import type { Stdout } from "../../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("runServicesInstall", () => {
  it("writes 'not yet implemented' to stdout", async () => {
    const { stdout, lines } = makeStdout();
    await runServicesInstall({}, { stdout });
    expect(lines.join("")).toContain("not yet implemented");
  });

  it("message includes operation identifier", async () => {
    const { stdout, lines } = makeStdout();
    await runServicesInstall({}, { stdout });
    expect(lines.join("")).toContain("services install");
  });
});
