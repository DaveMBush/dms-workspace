import autoLoad from '@fastify/autoload';
import { FastifyInstance } from 'fastify';
import * as path from 'path';

type AppOptions = Record<string, unknown>;

export function configureApp(fastify: FastifyInstance, opts: AppOptions): void {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(autoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts },
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(autoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: { ...opts, prefix: '/api' },
  });
}
