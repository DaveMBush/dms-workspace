## Get price and dividend on add

When we add a symbol manually or via the CUSIP resolution, we should fetch the current price and dividend information for that symbol and store it like we do when we update fields in the universe screen. This will ensure that we have the most up-to-date information for the symbol as soon as it is added to the system.

## Look for code duplication and refactor

Evaluate the codebase for any instances of code duplication and refactor to improve maintainability and reduce technical debt. This includes identifying any repeated logic, similar functions, or components that can be abstracted into reusable modules or services. Refactoring should be done carefully to ensure that existing functionality is not broken and that all tests continue to pass.

- There is at least one known instance of code duplication that jscpd will find for you but this is not the only method you should use to find duplication.

- I would expect the Global Summary screen and the Account Summary screen could be combined

## Encapsulate application using electron

Wrap the client and server in electron such that electron renders the angular code and serves the backend code.

- All internal links should go to the links within the app just like they would if this was a web application
- All external links should launch the default browser.
- Calls to /api/**/*.* should be processed by the backend code.

## Remove checkbox columns for Screener

We no longer need the checkbox columns in the screener. We still want to see the current active symbols from the automated filtering we do and we want to manually click the button in the universe to add them to the universe but the columns will no longer determine what gets moved into the universe.

## Find a better dividend source

Yahoo Finance only provides dividend information to 3 decimal places but most of the dividend information I need is 4 decimal places long. We need to find a better source for dividend information that is still free to use but provides more accurate dividend information.

## Check the buffer size on the tables for virtual scrolling.

## Are we really lazy loading the data

## Test import and CUSIP resolution again
