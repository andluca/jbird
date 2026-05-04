export interface Stdout {
  write(line: string): void;
}

/** File-system port — all I/O operations jbird services may use. */
export interface Fs {
  /** Returns file contents, or null if file does not exist. */
  readFile(path: string): Promise<string | null>;
  /** Writes file with optional POSIX mode (e.g. 0o600). */
  writeFile(path: string, content: string, mode?: number): Promise<void>;
  /** Appends content to a file (creates it if absent). */
  appendFile(path: string, content: string): Promise<void>;
  /** Creates directory recursively. Idempotent. */
  mkdir(path: string, mode?: number): Promise<void>;
  /** Returns true if path exists on disk. */
  exists(path: string): Promise<boolean>;
  /** Sets POSIX file mode. No-op on Windows. */
  chmod(path: string, mode: number): Promise<void>;
  /** Returns the current user's home directory (sync). */
  homedir(): string;
}

/** TOML parse/stringify port. Keys must be translated (snake ↔ camel) by the adapter. */
export interface Toml {
  parse(input: string): unknown;
  stringify(value: unknown): string;
}

/** Editor port — spawns the user's preferred editor. */
export interface Editor {
  /** Opens the given path in the user's editor. Returns the editor's exit code. */
  open(filePath: string): Promise<number>;
}

/** Clock port — injectable for testing. */
export interface Clock {
  now(): Date;
}
