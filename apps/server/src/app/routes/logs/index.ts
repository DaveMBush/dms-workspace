import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { deleteLogFile, getLogFiles, mapLogToErrorLogEntry, paginateLogs, readLogFiles } from './log-utils';
import { ErrorLogResponse, LogEntry, LogFileInfo, LogFilters } from './types';

const INTERNAL_SERVER_ERROR = 'Internal server error';

function isValidLogLevel(filters: LogFilters, log: LogEntry): boolean {
  if (filters.level === null || filters.level === undefined || filters.level === '') {
    return true;
  }
  return log.level === filters.level;
}

function isWithinDateRange(filters: LogFilters, log: LogEntry): boolean {
  const logDate = new Date(log.timestamp);

  if (filters.from !== null && filters.from !== undefined && filters.from !== '') {
    const fromDate = new Date(filters.from);
    if (logDate < fromDate) {
      return false;
    }
  }

  if (filters.to !== null && filters.to !== undefined && filters.to !== '') {
    const toDate = new Date(filters.to);
    if (logDate > toDate) {
      return false;
    }
  }

  return true;
}

function matchesSearchTerm(filters: LogFilters, log: LogEntry): boolean {
  if (filters.search === null || filters.search === undefined || filters.search.trim() === '') {
    return true;
  }
  const searchTerm = filters.search.toLowerCase();
  return log.message.toLowerCase().includes(searchTerm);
}

function filterLogs(logs: LogEntry[], filters: LogFilters): LogEntry[] {
  return logs.filter(function applyFilters(log) {
    return isValidLogLevel(filters, log) &&
           isWithinDateRange(filters, log) &&
           matchesSearchTerm(filters, log);
  });
}

function validatePaginationParams(
  pageNum: number,
  limitNum: number
): { error: string; message: string } | null {
  if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
    return {
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1 and limit must be between 1 and 1000',
    };
  }
  return null;
}

function handleLogFilesRequest(
  request: FastifyRequest,
  reply: FastifyReply
): { error: string; message: string } | { files: LogFileInfo[] } {
  try {
    const files = getLogFiles();
    return { files };
  } catch (error) {
    request.log.error(error, 'Failed to retrieve log files');
    void reply.status(500);
    return {
      error: INTERNAL_SERVER_ERROR,
      message: 'Failed to retrieve log files',
    };
  }
}

function handleDeleteLogFile(
  request: FastifyRequest<{
    Params: { filename: string };
  }>,
  reply: FastifyReply
): { success: boolean; message: string } | { error: string; message: string } {
  try {
    const { filename } = request.params;
    const result = deleteLogFile(filename);

    if (result.success) {
      return result;
    }
    void reply.status(400);
    return result;
  } catch (error) {
    request.log.error(error, 'Failed to delete log file');
    void reply.status(500);
    return {
      success: false,
      message: 'Failed to delete log file',
    };
  }
}

function handleErrorLogsRequest(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      level?: string;
      from?: string;
      to?: string;
      search?: string;
      file?: string;
    };
  }>,
  reply: FastifyReply
): ErrorLogResponse | { error: string; message: string } {
  try {
    const {
      page = '1',
      limit = '50',
      level,
      from,
      to,
      search = '',
      file,
    } = request.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const validationError = validatePaginationParams(pageNum, limitNum);
    if (validationError !== null) {
      void reply.status(400);
      return validationError;
    }

    const filters: LogFilters = { level, from, to, search: search.trim(), file };
    const allLogs = readLogFiles(file);
    const filteredLogs = filterLogs(allLogs, filters);
    const errorLogs = filteredLogs.map(mapLogToErrorLogEntry);

    return paginateLogs(errorLogs, pageNum, limitNum);
  } catch (error) {
    request.log.error(error, 'Failed to retrieve error logs');
    void reply.status(500);
    return {
      error: INTERNAL_SERVER_ERROR,
      message: 'Failed to retrieve error logs',
    };
  }
}

const logs: FastifyPluginAsync = async function logsPlugin(fastify) {
  fastify.get('/files', handleLogFilesRequest);
  fastify.delete<{
    Params: { filename: string };
  }>('/files/:filename', handleDeleteLogFile);
  fastify.get<{
    Querystring: {
      page?: string;
      limit?: string;
      level?: string;
      from?: string;
      to?: string;
      search?: string;
      file?: string;
    };
  }>('/errors', handleErrorLogsRequest);
};

export default logs;