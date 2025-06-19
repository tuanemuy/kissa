import type { PasswordHasher } from "../../domain/user/ports/passwordHasher";

export class MockPasswordHasher implements PasswordHasher {
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  async hash(password: string): Promise<string> {
    if (this.shouldFailOperations) {
      throw new Error("Mock hash failure");
    }

    // Simple mock implementation - just prefix with "hashed_"
    return `hashed_${password}`;
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    if (this.shouldFailOperations) {
      throw new Error("Mock verify failure");
    }

    // Simple mock implementation - check if hash matches expected format
    return hashedPassword === `hashed_${password}`;
  }
}
