import { FastifyInstance, FastifyPluginAsync } from 'fastify';
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
  const files: LogFileInfo[] = [];

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
  const logs: LogEntry[] = [];

  try {
    let logFiles: string[];

    if (specificFile) {
      // Read only the specified file
      const filePath = join(logsDir, specificFile);
      try {
        if (statSync(filePath).isFile()) {
          logFiles = [filePath];
        } else {
          logFiles = [];
        }
      } catch {
        logFiles = [];
      }
    } else {
      // Read all files (existing behavior)
      const files = readdirSync(logsDir);
      logFiles = files
        .filter(function filterLogFiles(file) {
          return file.endsWith('.log');
        })
        .map(function mapToFilePath(file) {
          return join(logsDir, file);
        })
        .filter(function filterExistingFiles(filePath) {
          try {
            return statSync(filePath).isFile();
          } catch {
            return false;
          }
        })
        .sort(function sortByModifiedTime(a, b) {
          try {
            return statSync(b).mtime.getTime() - statSync(a).mtime.getTime();
          } catch {
            return 0;
          }
        });
    }

    logFiles.forEach(function processLogFile(filePath) {
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
  } catch {
    // Return empty logs if directory doesn't exist or can't be read
  }

  return logs.sort(function sortByTimestamp(a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

function isValidFilterValue(value: string | undefined): boolean {
  return value !== null && value !== undefined && value !== '';
}

function matchesLevelFilter(log: LogEntry, level: string | undefined): boolean {
  return !isValidFilterValue(level) || log.level === level;
}

function matchesDateRangeFilter(log: LogEntry, from: string | undefined, to: string | undefined): boolean {
  const logDate = new Date(log.timestamp);

  return !(isValidFilterValue(from) && logDate < new Date(from!)) &&
         !(isValidFilterValue(to) && logDate > new Date(to!));
}

function matchesSearchFilter(log: LogEntry, search: string | undefined): boolean {
  return !isValidFilterValue(search) || log.message.toLowerCase().includes(search!.toLowerCase());
}

function filterLogs(logs: LogEntry[], filters: LogFilters): LogEntry[] {
  return logs.filter(function applyFilters(log) {
    return matchesLevelFilter(log, filters.level) &&
           matchesDateRangeFilter(log, filters.from, filters.to) &&
           matchesSearchFilter(log, filters.search);
  });
}

function deleteLogFile(filename: string): { success: boolean; message: string } {
  const logsDir = join(process.cwd(), 'logs');
  const filePath = join(logsDir, filename);

  try {
    // Verify file exists and ends with .log for safety
    if (!filename.endsWith('.log')) {
      return { success: false, message: 'Invalid file type' };
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return { success: false, message: 'File not found' };
    }

    unlinkSync(filePath);
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to delete file' };
  }
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

const logs: FastifyPluginAsync = async (fastify) => {
  // Get list of available log files
  fastify.get('/files', function handleLogFilesRequest(request, reply) {
    try {
      const files = getLogFiles();
      return { files };
    } catch (error) {
      fastify.log.error(error, 'Failed to retrieve log files');
      reply.status(500);
      return {
        error: 'Internal server error',
        message: 'Failed to retrieve log files',
      };
    }
  });

  // Delete a specific log file
  fastify.delete<{
    Params: { filename: string };
  }>('/files/:filename', function handleDeleteLogFile(request, reply) {
    try {
      const { filename } = request.params;
      const result = deleteLogFile(filename);

      if (result.success) {
        return result;
      } else {
        reply.status(400);
        return result;
      }
    } catch (error) {
      fastify.log.error(error, 'Failed to delete log file');
      reply.status(500);
      return {
        error: 'Internal server error',
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

      // Read log files (specific file or all files)
      const allLogs = readLogFiles(file);

      // Filter logs based on criteria
      const filteredLogs = filterLogs(allLogs, filters);

      // Convert to ErrorLogEntry format
      const errorLogs = filteredLogs.map(mapLogToErrorLogEntry);

      // Paginate results
      const response = paginateLogs(errorLogs, pageNum, limitNum);

      return response;
    } catch (error) {
      fastify.log.error(error, 'Failed to retrieve error logs');
      reply.status(500);
      return {
        error: 'Internal server error',
        message: 'Failed to retrieve error logs',
      };
    }
  });
};

export default logs;