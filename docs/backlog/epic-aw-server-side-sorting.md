# Epic AW: Implement Server-Side Sorting and Filtering

## Epic Goal

Move sorting and filtering from client to server for large datasets.

## Epic Description

Update backend endpoints to support sorting and filtering for universe, screener, Open Positions, Sold Positions and Dividend Deposits.

We will store the sort state in localStorage and send it to the server on each request in a header using an httpInterceptor. The server will use this information to sort that data before putting it in the SmartNgRX/SmartSignal SmartArray. This will allow us to remove all client-side sorting logic and improve performance for large datasets. Since open trades and closed trades are technically filters, to handle this well we will need to separate out trades into openTrades and closedTrades endpoints and update the frontend to call those separately with the data already filtered and sorted for each.

## Stories

### Backend Sorting - Universe Endpoint

1. **Story AW.1 (TDD):** Write unit tests for universe endpoint with sort parameters
2. **Story AW.2 (Implementation):** Implement server-side sorting for universe endpoint

### Backend Sorting - Trades Endpoints

3. **Story AW.3 (TDD):** Write unit tests for separate openTrades/closedTrades endpoints with sorting
4. **Story AW.4 (Implementation):** Create separate openTrades and closedTrades endpoints with server-side sorting

### Frontend - HTTP Interceptor and Sort State

5. **Story AW.5 (TDD):** Write unit tests for httpInterceptor sending sort headers and localStorage management
6. **Story AW.6 (Implementation):** Implement httpInterceptor to send sort headers and localStorage sort state management

### Frontend - Update Components

7. **Story AW.7 (TDD):** Write unit tests for frontend components calling new endpoints with sort parameters
8. **Story AW.8 (Implementation):** Update frontend components to call new endpoints and send sort parameters

### Cleanup - Remove Client-Side Sorting

9. **Story AW.9 (TDD):** Write unit tests verifying client-side sorting logic is removed
10. **Story AW.10 (Implementation):** Remove all client-side sorting logic from components

### Verification and Testing

11. **Story AW.11 (Bug Fix):** Integration testing, verification, and bug fixes
12. **Story AW.12 (E2E):** Add e2e tests for complete server-side sorting workflow

## Dependencies

- Epic AV

## Priority

**Medium** (defer until after virtual scrolling)

## Estimated Effort

4-5 days (12 stories using TDD approach - tests written before implementation for each feature)
