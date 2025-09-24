import { FastifyPluginAsync } from 'fastify';
import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'debug' | 'error' | 'info' | 'warn';
  message: string;
  service: string;
  environment: string;
  data?: Record<string, unknown>;
  context?: {
    requestId: string;
    userId?: string;
  };
}

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'error' | 'info' | 'warning';
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}

interface ErrorLogResponse {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface LogFilters {
  level?: string;
  from?: string;
  to?: string;
  search?: string;
  file?: string;
}

interface LogFileInfo {
  filename: string;
  displayName: string;
  size: number;
  lastModified: string;
}

function getLogFiles(): LogFileInfo[] {
  const logsDir = join(process.cwd(), 'logs');

  try {
    const dirFiles = readdirSync(logsDir);
    const logFiles = dirFiles
      .filter(function filterLogFiles(file) {
        return file.endsWith('.log');
      })
      .map(function mapToLogFileInfo(file) {
        const filePath = join(logsDir, file);
        try {
          const stats = statSync(filePath);
          return {
            filename: file,
            displayName: file.replace('.log', '').replace(/-/g, ' '),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(function filterValidFiles(file): file is LogFileInfo {
        return file !== null;
      })
      .sort(function sortByModifiedTime(a, b) {
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      });

    return logFiles;
  } catch {
    return [];
  }
}

function readLogFiles(specificFile?: string): LogEntry[] {
  const logsDir = join(process.cwd(), 'logs');

  try {
    const logFilePaths = specificFile ?
      [join(logsDir, specificFile)] :
      readdirSync(logsDir)
        .filter(function filterLogFiles(file) {
          return file.endsWith('.log');
        })
        .map(function mapToPath(file) {
          return join(logsDir, file);
        });

    const logs: LogEntry[] = [];

    logFilePaths.forEach(function processLogFile(filePath) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(function filterEmptyLines(line) {
          return line.trim();
        });

        lines.forEach(function processLogLine(line) {
          try {
            const entry = JSON.parse(line) as LogEntry;
            logs.push(entry);
          } catch {
            // Skip malformed log entries
          }
        });
      } catch {
        // Skip files that can't be read
      }
    });

    return logs.sort(function sortByTimestamp(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  } catch {
    return [];
  }
}

function filterLogs(logs: LogEntry[], filters: LogFilters): LogEntry[] {
  return logs.filter(function applyFilters(log) {
    if (filters.level && log.level !== filters.level) {
      return false;
    }

    if (filters.from) {
      const logDate = new Date(log.timestamp);
      const fromDate = new Date(filters.from);
      if (logDate < fromDate) {
        return false;
      }
    }

    if (filters.to) {
      const logDate = new Date(log.timestamp);
      const toDate = new Date(filters.to);
      if (logDate > toDate) {
        return false;
      }
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      if (!log.message.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
}

function mapLogToErrorLogEntry(log: LogEntry): ErrorLogEntry {
  return {
    id: log.correlationId,
    timestamp: log.timestamp,
    level: log.level === 'warn' ? 'warning' : log.level,
    message: log.message,
    context: log.data,
    requestId: log.context?.requestId ?? log.correlationId,
    userId: log.context?.userId,
  };
}

function paginateLogs(
  logs: ErrorLogEntry[],
  page: number,
  limit: number
): ErrorLogResponse {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedLogs = logs.slice(startIndex, endIndex);

  return {
    logs: paginatedLogs,
    totalCount: logs.length,
    currentPage: page,
    totalPages: Math.ceil(logs.length / limit),
  };
}

function deleteLogFile(filename: string): { success: boolean; message: string } {
  const logsDir = join(process.cwd(), 'logs');
  const filePath = join(logsDir, filename);

  try {
    if (!filename.endsWith('.log')) {
      return { success: false, message: 'Invalid file type' };
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return { success: false, message: 'File not found' };
    }

    unlinkSync(filePath);
    return { success: true, message: 'File deleted successfully' };
  } catch {
    return { success: false, message: 'Failed to delete file' };
  }
}

const INTERNAL_SERVER_ERROR = 'Internal server error';

const logs: FastifyPluginAsync = function logsPlugin(fastify) {
  fastify.get('/files', function handleLogFilesRequest(request, reply) {
    try {
      const files = getLogFiles();
      return { files };
    } catch (error) {
      fastify.log.error(error, 'Failed to retrieve log files');
      reply.status(500);
      return {
        error: INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve log files',
      };
    }
  });

  fastify.delete<{
    Params: { filename: string };
  }>('/files/:filename', function handleDeleteLogFile(request, reply) {
    try {
      const { filename } = request.params;
      const result = deleteLogFile(filename);

      if (result.success) {
        return result;
      }
      reply.status(400);
      return result;
    } catch (error) {
      fastify.log.error(error, 'Failed to delete log file');
      reply.status(500);
      return {
        error: INTERNAL_SERVER_ERROR,
        message: 'Failed to delete log file',
      };
    }
  });

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
  }>('/errors', function handleErrorLogsRequest(request, reply) {
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

      if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
        reply.status(400);
        return {
          error: 'Invalid pagination parameters',
          message: 'Page must be >= 1 and limit must be between 1 and 1000',
        };
      }

      const filters: LogFilters = {
        level,
        from,
        to,
        search: search.trim(),
        file,
      };

      const allLogs = readLogFiles(file);
      const filteredLogs = filterLogs(allLogs, filters);
      const errorLogs = filteredLogs.map(mapLogToErrorLogEntry);
      const response = paginateLogs(errorLogs, pageNum, limitNum);

      return response;
    } catch (error) {
      fastify.log.error(error, 'Failed to retrieve error logs');
      reply.status(500);
      return {
        error: INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve error logs',
      };
    }
  });
};

export default logs;