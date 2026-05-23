# New Epics to Implement

## Expired Symbols On the Universe Screen

Expired symbols should not be displayed on the Universe screen unless there are currently open positions for them. This should be done on the server side as we retrieve the list of symbols to display on the Universe screen. If a symbol is expired and there are no open positions for it, it should be filtered out and not sent to the client at all.

## Delete Row on Universe Screen

Currently the delete button displays on the rows that don't have any open positions using the current filter. This is not at all what I had in mind. It should ONLY display if the symbol is not being used anywhere in the trades table OR the divDeposits table, regardless of the current account being displayed. To make this simple, let's only display the button if it meets the criteria AND we are displaying the "All Accounts" filter. If we are filtering to a specific account, there should be no delete buttons at all.

Please verify the logic and make the necessary adjustments to ensure that the delete button only appears when it is appropriate based on the criteria mentioned above.
