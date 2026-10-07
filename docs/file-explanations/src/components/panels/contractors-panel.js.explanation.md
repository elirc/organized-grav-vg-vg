# Senior Engineering Explanation: `src/components/panels/contractors-panel.js`

**Role:** add contractors and convert them to employees.

## Walkthrough

- `:28-60` add form; classification score and risk are typed in by hand (`:40-41`).
- `:93-105` convert button with a fixed title "Converted Role" and today's start date.

## Review notes

- `event.currentTarget.reset()` after an await (`:47`).
- The convert button stays enabled for `TERMINATED` contractors.

## Check

**Check:** the Convert button is enabled on a contractor that was already converted.
