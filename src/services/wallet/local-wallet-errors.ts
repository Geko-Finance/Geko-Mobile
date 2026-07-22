export type LocalWalletErrorCode =
  | "BIOMETRIC_CANCELLED"
  | "BIOMETRIC_UNAVAILABLE"
  | "DUPLICATE_WALLET"
  | "INVALID_PIN"
  | "INVALID_RECOVERY"
  | "MISSING_KEY";

export class LocalWalletError extends Error {
  readonly code: LocalWalletErrorCode;

  constructor(code: LocalWalletErrorCode, message: string) {
    super(message);
    this.name = "LocalWalletError";
    this.code = code;
  }
}

export function getLocalWalletErrorMessage(error: unknown): string {
  if (error instanceof LocalWalletError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
