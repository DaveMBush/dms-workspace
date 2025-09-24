/* eslint-disable @smarttools/one-exported-item-per-file -- Log utility functions are logically grouped together */
import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

import { ErrorLogEntry, LogEntry, LogFileInfo } from './types';

export function getLogFiles(): LogFileInfo[] {
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

export function readLogFiles(specificFile?: string): LogEntry[] {
  const logsDir = join(process.cwd(), 'logs');

  try {
    const logFilePaths = specificFile !== null && specificFile !== undefined && specificFile !== '' ?
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

export function deleteLogFile(filename: string): { success: boolean; message: string } {
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

export function mapLogToErrorLogEntry(log: LogEntry): ErrorLogEntry {
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

export function paginateLogs(
  logs: ErrorLogEntry[],
  page: number,
  limit: number
): {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
} {
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