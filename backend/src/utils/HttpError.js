// Erreur portant un code HTTP, reconnue par le middleware errorHandler
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}