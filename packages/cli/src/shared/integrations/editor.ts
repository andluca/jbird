import type { Editor } from "../services/ports.ts";

function resolveEditor(): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return process.env.VISUAL || process.env.EDITOR || "vi";
}

/**
 * Spawns the user's preferred editor ($VISUAL > $EDITOR > vi).
 * Uses stdio: "inherit" so the editor has full TTY access.
 */
export function createEditor(): Editor {
  return {
    open(filePath: string): Promise<number> {
      const editorCmd = resolveEditor();
      const proc = Bun.spawn([editorCmd, filePath], {
        stdio: ["inherit", "inherit", "inherit"],
      });
      return proc.exited;
    },
  };
}
