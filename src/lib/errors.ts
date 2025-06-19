export class AnyError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AnyError";
  }
}

export class ValidationError<T = unknown> extends AnyError {
  constructor(
    message: string,
    public readonly data: T,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ValidationError";
  }
}

export class ApplicationError extends AnyError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ApplicationError";
  }
}

export class RepositoryError extends AnyError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "RepositoryError";
  }
}
