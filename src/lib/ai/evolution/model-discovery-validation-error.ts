export class InvalidDiscoveredModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDiscoveredModelError";
  }
}
