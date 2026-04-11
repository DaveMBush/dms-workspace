# Outstanding issues

## Encapsulate application using electron

Wrap the client and server in electron such that electron renders the angular code and serves the backend code.

- All internal links should go to the links within the app just like they would if this was a web application
- All external links should launch the default browser.
- Calls to /api/\*_/_.\* should be processed by the backend code.

## Fix Graphs

On the summary screens, the pie chart is ONLY showing equity when I know there are Equities AND Income. There is something wrong with what the server is returning.

## Still not retrieving distribution history for new symbols

## Still not dealing with splits

I see the message "No open lots for ${symbol}$..."

The data in the CSV is reverse date order grouped by account. You SHOULD be processing the data in reverse order, they you would have the open lots you are looking for when you get to dealing with the splits.

## Still seeing Janky Scrolling

## Still seeing unloaded symbols when I scroll down
