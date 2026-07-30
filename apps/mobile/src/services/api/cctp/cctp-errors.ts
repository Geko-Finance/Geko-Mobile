export class CctpAttestationPendingError extends Error {
  constructor(message = "Attestation is not ready yet") {
    super(message);
    this.name = "CctpAttestationPendingError";
  }
}

export class CctpAttestationFailedError extends Error {
  constructor(message = "Circle reported this message's attestation as failed") {
    super(message);
    this.name = "CctpAttestationFailedError";
  }
}

export class CctpProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CctpProviderUnavailableError";
  }
}
