import { FastifyPluginAsync } from 'fastify';

import { handleLogFilesRequest } from './handle-log-files-request.function';

const logs: FastifyPluginAsync = function logsPlugin(fastify) {
  fastify.get('/files', handleLogFilesRequest);
};

export default logs;