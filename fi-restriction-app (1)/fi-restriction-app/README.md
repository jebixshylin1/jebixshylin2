# FI Restriction App

Two screens built with React (Create React App) and plain CSS:

1. **FI Restriction Master** (`FI Restriction` tab) — manage employee
   restriction records and their category combinations.
2. **FI Restriction Configuration** (`FI Restriction Configuration` tab) —
   manage the active restriction rules (region, EWI/tenure thresholds,
   category details) via a "Rule Setup" wizard.

## Run locally

```bash
npm install
npm start      # http://localhost:3000
```

```bash
npm run build   # production build in /build
```

The project already builds cleanly with `react-scripts` 5.

## Project structure

```
src/
  index.js / index.css          root tokens (colors, radii) + CSS reset
  App.js / App.css               tab navigation + page chrome
  services/
    mockDataService.js           the ONLY place that knows about data
  components/
    Firestriction/
      FireRestriction.js         FI Restriction Records screen (table,
                                  search, bulk-select, pagination, the
                                  Add/Edit Record modal, the Category
                                  Details expand panel, the confirm
                                  dialog and the multi-select dropdown
                                  are all defined inside this one file)
      FireRestriction.css        every style FireRestriction.js needs
      FIRestrictionConfiguration.js   Active Restriction screen (table,
                                  pagination, the Rule Setup wizard,
                                  the confirm dialog and the multi-select
                                  dropdown are all defined inside this
                                  one file)
      FIRestrictionConfiguration.css  every style
                                  FIRestrictionConfiguration.js needs
```

Each screen is a single `.js` + `.css` pair with no JSX file extensions,
no Tailwind, and no inline `style={{...}}` — every visual rule lives in
the matching external `.css` file. `Modal`, `ConfirmDialog` and
`MultiSelectDropdown` are small internal (non-exported) components
defined at the top of each screen file, so each screen stays a
self-contained pair of files, at the cost of a little duplication
between the two `.css` files.

## Swapping mock data for the real API

`src/services/mockDataService.js` is the single data-access module. Every
component imports functions from it (`fetchRestrictionRecords`,
`createRestrictionRecord`, `fetchRestrictionRules`, etc.) and never talks
to data directly.

To connect the real backend:

1. Keep the same exported function names and the same return shapes
   (each function currently resolves a Promise — that doesn't change).
2. Replace each function body with a `fetch`/`axios` call to the real
   endpoint, e.g.:

   ```js
   export async function fetchRestrictionRecords({ employeeId } = {}) {
     const res = await fetch(`/api/fi-restriction-records?employeeId=${employeeId ?? ""}`);
     if (!res.ok) throw new Error("Failed to load records");
     return res.json();
   }
   ```

3. No component code needs to change — they only depend on the function
   signatures, not on how the data is fetched.

You can also swap the whole module later for one that uses `axios` and a
shared `apiClient` (base URL, auth headers, interceptors) without touching
any component.

## Data model

```ts
RestrictionRecord {
  id, employeeId, employeeName, branchCode, branchName, date, reason
  categories: [
    { id, assetClass: string[], contractType: string[], piIndicator: string[], customerType: string[] }
  ]
}

RestrictionRule {
  id, ruleId, region, process, status
  regionSelection: string[], restrictionSelection: string[]
  ewi: { restrictionAbove: number, deRestrictionBelow: number }
  tenure: { fresher, lateral, sfaToFo, nonFoToFo }
  categories: { assetClass: string[], contractType: string[], piIndicator: string[], customerType: string[] }
}
```

## Notes

- Loading and empty states are handled in both tables
  ("Loading records…" / "No restriction records found." and
  "No restriction rules have been submitted yet.").
- Deletes (single row, bulk selection, single category row, rule) all go
  through a shared `ConfirmDialog` before calling the service.
- The Employee ID search box in the Add Record modal looks the employee
  up via `lookupEmployeeById` and auto-fills name/branch — same as the
  magnifying-glass button in the screenshots.
