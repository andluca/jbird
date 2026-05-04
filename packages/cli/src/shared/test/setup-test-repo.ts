import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestRepo {
  readonly dir: string;
  readonly env: NodeJS.ProcessEnv;
  readonly cleanup: () => Promise<void>;
}

/**
 * Creates an isolated temporary directory and overrides HOME so that
 * ~/.jbird/ operations do not touch the real user home.
 * Call cleanup() in afterEach/afterAll to remove the temp dir.
 */
export async function setupTestRepo(): Promise<TestRepo> {
  const dir = await mkdtemp(join(tmpdir(), "jbird-test-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: dir,
    // Override HOME for macOS homedir lookup too
    USERPROFILE: dir,
  };
  return {
    dir,
    env,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}
