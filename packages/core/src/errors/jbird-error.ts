/**
 * Base class for all jbird errors.
 *
 * Subclasses fix a `code` discriminator string. The `details` field
 * carries subcategory information (e.g. details.kind = 'parse-failed').
 *
 * toJSON() produces the IPC error envelope shape — no stack trace exposed.
 * Conforms to errorBodySchema.error from @jbird/core/schemas/ipc.
 */
export abstract class JbirdError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(): { code: string; message: string; details?: Record<string, unknown> } {
    const result: { code: string; message: string; details?: Record<string, unknown> } = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      result.details = this.details;
    }
    return result;
  }
}
