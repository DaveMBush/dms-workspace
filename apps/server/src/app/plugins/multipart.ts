import multipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Registers @fastify/multipart for file upload support.
 * File size validation is handled at the route level for proper error responses.
 * The attachFieldsToBody option is left disabled; routes use request.file() API.
 *
 * @see https://github.com/fastify/fastify-multipart
 */
export default fp(function registerMultipartPlugin(
  fastify: FastifyInstance
): void {
  fastify.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB hard limit; route enforces 10MB
    },
  });
});
