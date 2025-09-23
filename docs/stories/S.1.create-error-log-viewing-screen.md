# Story S.1: Create Error Log Viewing Screen with Global Navigation Access

## Status

Draft

## Story

**As a** system administrator or developer using the RMS system,
**I want** to view backend error logs through a web interface accessible from the Global navigation,
**so that** I can troubleshoot issues and monitor system health without requiring direct server access.

## Acceptance Criteria

1. New "Error Logs" option appears in Global navigation menu alongside Universe, Screener, and Summary
2. Error log screen displays backend error logs in a tabular format with timestamps, levels, and messages
3. Backend API endpoint provides error log data with pagination support for performance
4. Search and filter functionality allows finding specific errors by date range, severity, or message content
5. Real-time updates show new errors as they occur without requiring page refresh
6. Error log access follows existing authentication patterns and security requirements
7. Log entries display sufficient detail for troubleshooting (timestamp, level, message, context)
8. Error log screen follows existing UI patterns and styling conventions

## Tasks / Subtasks

- [ ] **Task 1: Add Error Logs to Global navigation** (AC: 1)

  - [ ] Update globals array in global.component.ts to include 'error-logs' option
  - [ ] Test navigation routing to /global/error-logs
  - [ ] Verify listbox displays new option correctly
  - [ ] Update routing configuration for new error-logs route

- [ ] **Task 2: Create error log viewing component** (AC: 2, 7, 8)

  - [ ] Generate new component in apps/rms/src/app/global/global-error-logs/
  - [ ] Implement table display using PrimeNG Table component
  - [ ] Design columns for timestamp, level, message, and context
  - [ ] Apply consistent styling with existing global components
  - [ ] Add proper loading states and error handling

- [ ] **Task 3: Implement backend error log API endpoint** (AC: 3, 6)

  - [ ] Create GET /api/logs/errors endpoint in backend routes
  - [ ] Implement pagination with configurable page size
  - [ ] Add authentication/authorization middleware
  - [ ] Query existing log storage (files or database) for error entries
  - [ ] Return structured JSON response with log data

- [ ] **Task 4: Add search and filter functionality** (AC: 4)

  - [ ] Implement date range filter (from/to dates)
  - [ ] Add severity level filter (error, warning, info, debug)
  - [ ] Create message content search field
  - [ ] Update backend API to support filter parameters
  - [ ] Add clear filters functionality

- [ ] **Task 5: Implement real-time log updates** (AC: 5)

  - [ ] Add periodic polling mechanism for new log entries
  - [ ] Implement WebSocket connection for real-time updates (optional)
  - [ ] Update UI to show new logs without page refresh
  - [ ] Handle user notification of new errors
  - [ ] Manage memory and performance with continuous updates

- [ ] **Task 6: Add comprehensive testing** (AC: 1-8)
  - [ ] Test Global navigation integration
  - [ ] Test error log component rendering and functionality
  - [ ] Test backend API endpoint with various parameters
  - [ ] Test search and filter functionality
  - [ ] Test real-time update behavior
  - [ ] Test authentication and authorization

## Dev Notes

### Current Logging Infrastructure Analysis

**Existing Backend Logging System:**

- `StructuredLogger` class in `apps/server/src/utils/structured-logger.ts`
- Logs stored in `/logs` directory as structured JSON files
- `AuditLogService` in `apps/server/src/app/services/audit-log.service.ts` for security events
- Log context includes request IDs, timestamps, and structured data

**Global Navigation Structure:**

- `GlobalComponent` in `apps/rms/src/app/global/global.component.ts`
- Navigation options defined in `globals` array (lines 30-34)
- Current options: Universe, Screener, Summary
- Routing pattern: `/global/{option-id}`

### Implementation Strategy

**Navigation Integration:**

```typescript
// Update globals array in global.component.ts
globals = [
  { id: 'universe', name: 'Universe' },
  { id: 'screener', name: 'Screener' },
  { id: 'summary', name: 'Summary' },
  { id: 'error-logs', name: 'Error Logs' }, // New addition
];
```

**Component Structure:**

```
apps/rms/src/app/global/global-error-logs/
├── global-error-logs.component.ts
├── global-error-logs.component.html
├── global-error-logs.component.scss
├── global-error-logs.component.spec.ts
├── global-error-logs-service.ts (for API calls)
└── error-log.interface.ts (for type definitions)
```

**API Endpoint Design:**

```typescript
GET /api/logs/errors?page=1&limit=50&level=error&from=2025-09-01&to=2025-09-23&search=database
```

**Response Format:**

```typescript
interface ErrorLogResponse {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface ErrorLogEntry {
  id: string;
  timestamp: string; // ISO date
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}
```

### File System Log Reading Strategy

**Log File Structure:**
Based on `StructuredLogger`, logs are stored in `/logs` directory as JSON files. The API endpoint will need to:

1. Read log files from the logs directory
2. Parse JSON entries and filter by level (error, warning)
3. Apply pagination and search filters
4. Return structured response

**Performance Considerations:**

- Implement log file indexing for faster searches
- Consider log rotation and archival strategies
- Limit memory usage when reading large log files
- Cache recent log entries for real-time updates

### Frontend Data Management

**State Management:**

```typescript
// Use signals for reactive state management
logs = signal<ErrorLogEntry[]>([]);
totalCount = signal<number>(0);
currentPage = signal<number>(1);
filters = signal<LogFilters>({
  level: null,
  dateFrom: null,
  dateTo: null,
  search: '',
});
```

**Real-time Updates:**

```typescript
// Polling mechanism for new logs
private pollForNewLogs(): void {
  setInterval(() => {
    this.checkForNewLogs();
  }, 30000); // Check every 30 seconds
}
```

### UI/UX Design Patterns

**Table Configuration:**

- Use PrimeNG Table with pagination, sorting, and filtering
- Follow existing global component styling patterns
- Implement responsive design for mobile access
- Add export functionality for log analysis

**Filter Interface:**

- Date range picker for time-based filtering
- Dropdown for log level selection
- Search input for message content filtering
- Clear all filters button for easy reset

### Security Considerations

**Access Control:**

- Reuse existing authentication middleware
- Consider role-based access (admin/developer only)
- Sanitize log output to prevent information disclosure
- Rate limiting on log API endpoint

**Data Sanitization:**

- Remove sensitive information from displayed logs
- Truncate very long error messages for display
- Mask personally identifiable information
- Filter out authentication tokens or passwords

### Testing Strategy

**Backend Testing:**

- Test log file reading and parsing logic
- Test pagination and filtering parameters
- Test authentication and authorization
- Mock log files for consistent testing

**Frontend Testing:**

- Test component rendering with mock data
- Test search and filter functionality
- Test pagination behavior
- Test real-time update mechanism

**Integration Testing:**

- Test end-to-end log viewing workflow
- Test error handling for API failures
- Test performance with large log datasets
- Test browser compatibility for real-time updates

### Error Handling Strategy

**API Error Handling:**

- Handle log file read permissions errors
- Handle malformed log file entries
- Return appropriate HTTP status codes
- Log API access attempts for audit

**Frontend Error Handling:**

- Display user-friendly error messages
- Handle network connection issues
- Graceful degradation when real-time updates fail
- Retry logic for failed API calls

## Change Log

| Date       | Version | Description            | Author             |
| ---------- | ------- | ---------------------- | ------------------ |
| 2025-09-23 | 1.0     | Initial story creation | Bob (Scrum Master) |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here_
