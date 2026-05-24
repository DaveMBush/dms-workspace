# New Epics to Implement

## Expired Symbols On the Universe Screen

Expired symbols should not be displayed on the Universe screen unless there are currently open positions for them. This should be done on the server side as we retrieve the list of symbols to display on the Universe screen. If a symbol is expired and there are no open positions for it, it should be filtered out and not sent to the client at all.

## Delete Row on Universe Screen

Currently the delete button displays on the rows that don't have any open positions using the current filter. This is not at all what I had in mind. It should ONLY display if the symbol is not being used anywhere in the trades table OR the divDeposits table, regardless of the current account being displayed. To make this simple, let's only display the button if it meets the criteria AND we are displaying the "All Accounts" filter. If we are filtering to a specific account, there should be no delete buttons at all.

Please verify the logic and make the necessary adjustments to ensure that the delete button only appears when it is appropriate based on the criteria mentioned above.

## Janky Scroll, yet again

The janky scrolling issue we've been working on in epics: 29, 31, 44, 60, 64, 87, 101, 105 and 106 still persists.

I did some investigation and if I do not use sticky headers the problem goes away. Further, there are several issues open in github about this problem and the only viable solution seems to be to separate the header from the scrollable body. This will mean having fixed sized columns on both the headers and the table. It will also mean that we will need to allow the content and headers to scroll horizontally together if the width is too wide for the screen. This is a non-trivial amount of work but it seems to be the only way to fix this issue once and for all. Please investigate and implement this solution to fix the janky scrolling issue on the Universe screen.

All the basic logic will stay the same. Only the layout will change. Most of the work will be in the base table component that is used across the app. Please make sure to test this thoroughly as it will affect all tables in the app, not just the Universe screen.
