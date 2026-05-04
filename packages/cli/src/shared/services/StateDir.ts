import { join } from "node:path";
import type { Fs } from "./ports.ts";

const DIR_MODE = 0o700;

export interface GlobalStatePaths {
  readonly root: string;
  readonly configPath: string;
  readonly logsDir: string;
  readonly servicesDir: string;
  readonly cacheDir: string;
  readonly statsDir: string;
}

export interface ProjectStatePaths {
  readonly root: string;
  readonly configPath: string;
}

/**
 * Manages ~/.jbird/ and <project>/.jbird/ directory bootstrap.
 * All directories are created with mode 0700 (rwx owner only).
 */
export class StateDir {
  constructor(private readonly fs: Fs) {}

  globalRoot(): string {
    return join(this.fs.homedir(), ".jbird");
  }

  projectRoot(cwd: string): string {
    return join(cwd, ".jbird");
  }

  async ensureGlobal(): Promise<GlobalStatePaths> {
    const root = this.globalRoot();
    const logsDir = join(root, "logs");
    const servicesDir = join(root, "services");
    const cacheDir = join(root, "cache");
    const statsDir = join(root, "stats");

    await this.fs.mkdir(root, DIR_MODE);
    await this.fs.mkdir(logsDir, DIR_MODE);
    await this.fs.mkdir(servicesDir, DIR_MODE);
    await this.fs.mkdir(cacheDir, DIR_MODE);
    await this.fs.mkdir(statsDir, DIR_MODE);

    return {
      root,
      configPath: join(root, "config.toml"),
      logsDir,
      servicesDir,
      cacheDir,
      statsDir,
    };
  }

  async ensureProject(cwd: string): Promise<ProjectStatePaths> {
    const root = this.projectRoot(cwd);
    await this.fs.mkdir(root, DIR_MODE);
    return {
      root,
      configPath: join(root, "config.toml"),
    };
  }
}
