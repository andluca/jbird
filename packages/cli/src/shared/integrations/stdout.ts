import type { Stdout } from "../services/ports.ts";

export function createStdout(): Stdout {
  return {
    write(line: string): void {
      process.stdout.write(line);
      if (!line.endsWith("\n")) process.stdout.write("\n");
    },
  };
}
