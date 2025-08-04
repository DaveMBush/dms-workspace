import fastify from 'fastify';

import { configureApp } from './app/app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;

// Instantiate Fastify with some config
const server = fastify({
  logger: true,
});

// Register your application as a normal plugin.
server.register(configureApp);

// Start listening.
server.listen({ port, host }, function handleServerListen(err) {
  console.log(server.printRoutes());
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
