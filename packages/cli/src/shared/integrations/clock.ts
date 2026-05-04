import type { Clock } from "../services/ports.ts";

export function createSystemClock(): Clock {
  return {
    now(): Date {
      return new Date();
    },
  };
}
