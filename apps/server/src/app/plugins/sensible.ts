import sensible from '@fastify/sensible';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp(function registerSensiblePlugin(fastify: FastifyInstance): void {
  fastify.register(sensible);
});
