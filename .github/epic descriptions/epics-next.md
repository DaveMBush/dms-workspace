# Outstanding issues

If you have any questions or want to discuss a particular issue I've listed below, be sure to use the prompt skill to ask me about it and we can discuss it as you create the epic and/or stories for the issue.

## Encapsulate application using electron

Wrap the client and server in electron such that electron renders the angular code and serves the backend code.

- All internal links should go to the links within the app just like they would if this was a web application
- All external links should launch the default browser.
- Calls to /api/\*_/_.\* should be processed by the backend code which will now be run by the electron app.

## Not all sorts/filters are sticky

- Test each sort/filter and make sure each is sticky.

## Not all sorts/filters display current setting page load

- I'm still seeing some sorts/filters in effect when I load the page (especially from hard refresh) but the UI doesn't reflect the current setting/state.

## Value must be at most 12

- When I edit the Dist/Year for a symbol and try to enter 52, for weeklies, I get an error message, "Value must be at most 12". This needs to accept 52 for the weeklies. I think this is a validation issue in the UI code because the backend correctly found weeklies and entered them into the database.

## Missing OXLC positions for Joint Brokerage

- According to Fidelity, I have positions in OXLC in my Joint Brokerage account but they are not showing in the app. But I do see what look like incorrect entries in the database for some of the OXLC purchases. I don't see any OXLC dividends for Joint Brokerage either. These entries ARE in the CSV file we imported from Fidelity, located at /home/dave/Fidelity-2025.csv

I'm concerned we may be missing other positions as well. I need you to investigate and fix this issue so that when we import the CSV file, the records we have in the CSV file are correctly entered into the database and show up in the app. One thing that might be worth investigating is that maybe the split logic for OXLC removed the rows but did not add new rows. I would have expected you to have changed the record in place. But since I don't see any OXLC records for Joint Brokerage, I have to think of ways you might have messed this up other than just not entering the records at all.

## Error Logs Wrong Screen

When you restored the route to the Error Logs, I think you changed the route to the error logs so it pointed to the component you had left over from when I asked you to remove unused components.

At any rate, I used to have a way of looking at error files and removing them when I was done and now all I have are summary messages.

I'd like to have the old functionality back.

Epics I think may be at fault so you can check the associated commits to find the right component from the old code and restore it.

- Epic where you restored the route:
  - Epic - 70 - Restore Error Logs Route

- Epic where you removed unused components:
  - Epic - 1 - Remove Unused Code

## New Feature Indicate longer term distributions

- It would be useful if we could see on the Universe screen the general pattern of the distributions for a symbol over the last year as well as the previous 5 years. This would help us to identify symbols that have stable or increasing distributions over time, which is a key factor in our investment strategy. We could use a simple line graph or bar chart within a cell to show the distribution amounts over time. This would allow us to quickly assess the stability and growth of the distributions for each symbol at a glance. This might be something we could generalize and just use a set of indicates "steady", "increasing", "decreasing", "volatile" or something like that based on the pattern of the distributions over time. This would be a very useful feature to help us make informed investment decisions.
