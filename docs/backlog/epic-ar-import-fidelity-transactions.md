# Epic AR: Implement Fidelity Transaction Import

## Epic Goal

Allow users to import transaction data from Fidelity CSV files.

## Epic Description

Creates import routine to parse Fidelity transaction exports and populate trades/dividends.

## Notes:

- The name of the Account in the Account column matches the name field in the Accounts table.
- Purchase of shares should be treated the same as how we treat them manually. Refer to the 'Open Positions' tab for an account. Add 'Open Position' button.
- Sales of shares should be treated the same as how we treat them manually. Refer to the 'Open Positions' tab where we fill in the 'Sell' and 'Sell Date'. Attempt to match the number of shares sold to the number of shares in an existing open position.
- If there is no existing matching record for number of shares, break an existing record or multiple records, into multiple records so you can match up the sell to the records.
- Dividends should be treated the same as how we treat them manually. Refer to the 'Dividends Deposits' tab for an account. Add 'Add Dividend Deposit' button.
- Cash deposits should be treated the same as how we treat them manually. Refer to the 'Dividend Deposits' tab for an account.
- Dividends and Cash Deposits are added by the same screen.
- Ask if it is unclear how to handle a row in the CSV. If there is a row that doesn't fit into one of the above categories, ask for clarification on how to handle it.

## Stories

1. **Story AR.1:** Design Fidelity CSV parser and data mapper
2. **Story AR.2:** Create import service and backend endpoint
3. **Story AR.3:** Build import UI dialog on Global/Universe screen
4. **Story AR.4:** Implement file upload and processing
5. **Story AR.5:** Add validation and error reporting
6. **Story AR.6:** Add unit tests for parser
7. **Story AR.7:** Add unit tests for import service
8. **Story AR.8:** Add e2e tests for import flow

## Dependencies

- Epic AN (Universe table working)

## Priority

**Medium**

## Estimated Effort

4-5 days
