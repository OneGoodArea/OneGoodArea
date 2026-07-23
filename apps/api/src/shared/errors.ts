import type { FastifyReply } from "fastify";
import { isAppError } from "../infrastructure/errors/custom-errors";
export { isAppError };

export function sendAppError(reply: FastifyReply, error: unknown) {
  if (isAppError(error)) {
    reply.code(error.statusCode).send({ error: error.message, code: error.code });
    return true;
  }
  return false;
}
