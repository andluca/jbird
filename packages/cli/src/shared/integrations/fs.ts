import { homedir as osHomedir } from "node:os";
import { mkdir, chmod, appendFile, access } from "node:fs/promises";
import type { Fs } from "../services/ports.ts";

export function createNodeFs(): Fs {
  return {
    async readFile(path: string): Promise<string | null> {
      const file = Bun.file(path);
      const exists = await file.exists();
      if (!exists) return null;
      return file.text();
    },

    async writeFile(path: string, content: string, mode?: number): Promise<void> {
      await Bun.write(path, content);
      if (mode !== undefined) await chmod(path, mode);
    },

    async appendFile(path: string, content: string): Promise<void> {
      await appendFile(path, content, "utf8");
    },

    async mkdir(path: string, mode?: number): Promise<void> {
      await mkdir(path, { recursive: true, mode });
    },

    async exists(path: string): Promise<boolean> {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },

    async chmod(path: string, mode: number): Promise<void> {
      await chmod(path, mode);
    },

    homedir(): string {
      return osHomedir();
    },
  };
}
