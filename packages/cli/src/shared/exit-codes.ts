/**
 * Exit code retornado por commands stub ate que sua issue de implementacao
 * (005-014) entre. Distingue "not yet implemented" de erros reais
 * (0=success, 1=runtime error, 2=misuse-of-command per Unix convention).
 *
 * Quando a operacao real entra, remover `process.exitCode = STUB_EXIT_CODE`
 * do router e este import.
 */
export const STUB_EXIT_CODE = 2;
