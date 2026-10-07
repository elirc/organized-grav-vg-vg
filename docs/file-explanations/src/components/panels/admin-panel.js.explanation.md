# Senior Engineering Explanation: `src/components/panels/admin-panel.js`

**Role:** create tax rules and contract templates; list tax rules, templates and organizations.

## Walkthrough

- `:29-80` tax-rule form: country, type, payer, calculation type, a single `rate` and an
  effective date. Only one bracket can be entered, so progressive rules cannot be created here.
- `:85-124` template form: name, type, content with merge tags.
- `:130-179` read-only lists.

## Review notes

- `event.currentTarget.reset()` after an await (`:47`, `:100`) throws on success.
- The tax-rule form edits global rules that every tenant uses.

## Check

**Check:** after fixing the reset bug, creating a template clears the form and the new template
appears in the list with `v1`.
