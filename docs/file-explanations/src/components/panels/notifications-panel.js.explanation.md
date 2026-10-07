# Senior Engineering Explanation: `src/components/panels/notifications-panel.js`

**Role:** list notifications with "Mark Read" and "Mark All Read".

## Walkthrough

- `:11-24` and `:26-39` call the two PATCH/POST routes and refresh.
- `:52-79` renders title, body, timestamp (UTC, `:59`) and category.

## Review notes

- `actionUrl` is not rendered, so notifications cannot be clicked through.

## Check

**Check:** "Mark All Read" turns every card's button into a "Read" tag.
