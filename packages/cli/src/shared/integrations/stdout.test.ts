import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { createStdout } from "./stdout.ts";

describe("createStdout", () => {
  let writtenChunks: string[];
  let originalWrite: typeof process.stdout.write;

  beforeEach(() => {
    writtenChunks = [];
    originalWrite = process.stdout.write.bind(process.stdout);
    const captureWrite = (chunk: string): boolean => {
      writtenChunks.push(chunk);
      return true;
    };
    process.stdout.write = captureWrite;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  it("writes the line to stdout", () => {
    const stdout = createStdout();
    stdout.write("hello");
    expect(writtenChunks).toContain("hello");
  });

  it("appends newline when line does not end with one", () => {
    const stdout = createStdout();
    stdout.write("hello");
    expect(writtenChunks).toContain("\n");
  });

  it("does not append extra newline when line already ends with one", () => {
    const stdout = createStdout();
    stdout.write("hello\n");
    expect(writtenChunks.filter((c) => c === "\n")).toHaveLength(0);
  });
});
