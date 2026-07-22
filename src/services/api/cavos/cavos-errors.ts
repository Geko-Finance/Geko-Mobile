export class CavosProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CavosProviderUnavailableError";
  }
}

export class CavosSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CavosSessionExpiredError";
  }
}

export class CavosUnsupportedOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CavosUnsupportedOperationError";
  }
}
