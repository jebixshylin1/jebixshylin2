/**
 * mockDataService.js
 * ---------------------------------------------------------------------------
 * Single data-access module for both screens (FI Restriction Master and
 * FI Restriction Configuration).
 *
 * Every function here returns a Promise, mimicking a real HTTP client, so
 * swapping this module for one that calls the real backend is a drop-in
 * change for the components (they only ever import from "services/...").
 *
 * When the backend is ready, replace the bodies of these functions with
 * real `fetch`/`axios` calls that hit the given endpoints, keeping the
 * same function names and return shapes. Nothing in the components needs
 * to change.
 * ---------------------------------------------------------------------------
 */

const SIMULATED_LATENCY_MS = 350;

const delay = (value, ms = SIMULATED_LATENCY_MS) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const clone = (value) => JSON.parse(JSON.stringify(value));

const genId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

/* ------------------------------------------------------------------------ */
/* Lookup options (populate dropdowns / multi-selects)                      */
/* ------------------------------------------------------------------------ */

export const OPTIONS = {
  assetClass: ["Cars", "Two Wheeler", "Commercial Vehicle", "Tractor", "Gold Loan"],
  contractType: ["New", "Used", "Refinance"],
  piIndicator: ["P1", "P2", "P3", "P4"],
  customerType: ["New", "Existing", "Top-up"],
  region: ["PAN India", "Tamil Nadu", "Karnataka", "Maharashtra", "Telangana", "Kerala"],
  restrictionSelection: ["EWI Only", "Tenure Only", "EWI & Tenure"],
};

/* ------------------------------------------------------------------------ */
/* Directory used by the "search employee by ID" lookup in the Add modal    */
/* ------------------------------------------------------------------------ */

const EMPLOYEE_DIRECTORY = [
  { employeeId: "640191", employeeName: "Rajesh Kumar", branchCode: "CHN001", branchName: "Chennai - T Nagar" },
  { employeeId: "640192", employeeName: "Priya Sharma", branchCode: "BLR023", branchName: "Bangalore - Koramangala" },
  { employeeId: "640193", employeeName: "Arun Patel", branchCode: "MUM045", branchName: "Mumbai - Andheri" },
  { employeeId: "640194", employeeName: "Lakshmi Narayanan", branchCode: "HYD012", branchName: "Hyderabad - Banjara Hills" },
  { employeeId: "640195", employeeName: "Suresh Reddy", branchCode: "CHN002", branchName: "Chennai - Anna Nagar" },
  { employeeId: "123456", employeeName: "Meera Reddy", branchCode: "MAD034", branchName: "Madurai - Anna Nagar" },
];

/* ------------------------------------------------------------------------ */
/* Mock store: FI Restriction Records (Screen 1)                            */
/* ------------------------------------------------------------------------ */

let restrictionRecords = [
  {
    id: "rec-1",
    employeeId: "640191",
    employeeName: "Rajesh Kumar",
    branchCode: "CHN001",
    branchName: "Chennai - T Nagar",
    date: "01/12/2025",
    reason: "",
    categories: [
      { id: "cat-1-1", assetClass: ["Cars"], contractType: ["Used", "New"], piIndicator: ["P3"], customerType: ["New"] },
      { id: "cat-1-2", assetClass: ["Cars"], contractType: ["New"], piIndicator: ["P3"], customerType: ["Existing"] },
      { id: "cat-1-3", assetClass: ["Cars"], contractType: ["Used"], piIndicator: ["P3"], customerType: ["Existing"] },
    ],
  },
  {
    id: "rec-2",
    employeeId: "640192",
    employeeName: "Priya Sharma",
    branchCode: "BLR023",
    branchName: "Bangalore - Koramangala",
    date: "02/12/2025",
    reason: "",
    categories: [
      { id: "cat-2-1", assetClass: ["Two Wheeler"], contractType: ["New"], piIndicator: ["P2"], customerType: ["New"] },
    ],
  },
  {
    id: "rec-3",
    employeeId: "640193",
    employeeName: "Arun Patel",
    branchCode: "MUM045",
    branchName: "Mumbai - Andheri",
    date: "03/12/2025",
    reason: "",
    categories: [
      { id: "cat-3-1", assetClass: ["Cars"], contractType: ["New"], piIndicator: ["P1", "P2"], customerType: ["New"] },
      { id: "cat-3-2", assetClass: ["Cars"], contractType: ["New"], piIndicator: ["P1", "P2"], customerType: ["Existing"] },
    ],
  },
  {
    id: "rec-4",
    employeeId: "640194",
    employeeName: "Lakshmi Narayanan",
    branchCode: "HYD012",
    branchName: "Hyderabad - Banjara Hills",
    date: "04/12/2025",
    reason: "",
    categories: [
      { id: "cat-4-1", assetClass: ["Commercial Vehicle"], contractType: ["Refinance"], piIndicator: ["P4"], customerType: ["Top-up"] },
    ],
  },
  {
    id: "rec-5",
    employeeId: "640195",
    employeeName: "Suresh Reddy",
    branchCode: "CHN002",
    branchName: "Chennai - Anna Nagar",
    date: "05/12/2025",
    reason: "",
    categories: [
      { id: "cat-5-1", assetClass: ["Gold Loan"], contractType: ["New"], piIndicator: ["P2"], customerType: ["New"] },
    ],
  },
];

/* ------------------------------------------------------------------------ */
/* Mock store: Active Restriction Rules (Screen 2)                          */
/* ------------------------------------------------------------------------ */

let restrictionRules = [
  {
    id: "rule-1",
    ruleId: "FI-RUL-101",
    region: "Tamil Nadu",
    process: "EWI Only",
    status: "Active",
    regionSelection: ["Tamil Nadu"],
    restrictionSelection: ["EWI Only"],
    ewi: { restrictionAbove: 10, deRestrictionBelow: 5 },
    tenure: { fresher: 5, lateral: 15, sfaToFo: 10, nonFoToFo: 8 },
    categories: { assetClass: ["Cars"], contractType: ["New"], piIndicator: ["P1", "P2"], customerType: ["New"] },
  },
];

/* ------------------------------------------------------------------------ */
/* Employee directory lookup                                                */
/* ------------------------------------------------------------------------ */

export async function lookupEmployeeById(employeeId) {
  const match = EMPLOYEE_DIRECTORY.find((e) => e.employeeId === employeeId.trim());
  return delay(match ? clone(match) : null, 250);
}

/* ------------------------------------------------------------------------ */
/* FI Restriction Records API                                               */
/* ------------------------------------------------------------------------ */

export async function fetchRestrictionRecords({ employeeId } = {}) {
  let results = restrictionRecords;
  if (employeeId && employeeId.trim()) {
    const term = employeeId.trim().toLowerCase();
    results = results.filter((r) => r.employeeId.toLowerCase().includes(term));
  }
  return delay(clone(results));
}

export async function createRestrictionRecord(payload) {
  const record = {
    id: genId("rec"),
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
    branchCode: payload.branchCode,
    branchName: payload.branchName,
    date: payload.date || formatToday(),
    reason: payload.reason || "",
    categories: [
      {
        id: genId("cat"),
        assetClass: payload.assetClass || [],
        contractType: payload.contractType || [],
        piIndicator: payload.piIndicator || [],
        customerType: payload.customerType || [],
      },
    ],
  };
  restrictionRecords = [record, ...restrictionRecords];
  return delay(clone(record));
}

export async function updateRestrictionRecord(id, payload) {
  restrictionRecords = restrictionRecords.map((r) => {
    if (r.id !== id) return r;
    return {
      ...r,
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      branchCode: payload.branchCode,
      branchName: payload.branchName,
      categories: [
        {
          id: r.categories[0]?.id || genId("cat"),
          assetClass: payload.assetClass || [],
          contractType: payload.contractType || [],
          piIndicator: payload.piIndicator || [],
          customerType: payload.customerType || [],
        },
        ...r.categories.slice(1),
      ],
    };
  });
  const updated = restrictionRecords.find((r) => r.id === id);
  return delay(clone(updated));
}

export async function deleteRestrictionRecord(id) {
  restrictionRecords = restrictionRecords.filter((r) => r.id !== id);
  return delay({ success: true });
}

export async function deleteRestrictionRecords(ids) {
  const idSet = new Set(ids);
  restrictionRecords = restrictionRecords.filter((r) => !idSet.has(r.id));
  return delay({ success: true });
}

export async function deleteCategoryFromRecord(recordId, categoryId) {
  restrictionRecords = restrictionRecords.map((r) => {
    if (r.id !== recordId) return r;
    return { ...r, categories: r.categories.filter((c) => c.id !== categoryId) };
  });
  return delay({ success: true });
}

/* ------------------------------------------------------------------------ */
/* FI Restriction Configuration (rules) API                                 */
/* ------------------------------------------------------------------------ */

export async function fetchRestrictionRules() {
  return delay(clone(restrictionRules));
}

function buildProcessLabel(restrictionSelection) {
  if (!restrictionSelection || restrictionSelection.length === 0) return "-";
  return restrictionSelection.join(" & ");
}

function buildEwiLabel(ewi) {
  if (!ewi) return "-";
  return `> ${ewi.restrictionAbove} (Restr) | < ${ewi.deRestrictionBelow} (De-Restriction)`;
}

export async function createRestrictionRule(payload) {
  const rule = {
    id: genId("rule"),
    ruleId: genId("FI-RUL").replace("rule-", "FI-RUL-").slice(0, 11).toUpperCase(),
    region: (payload.regionSelection && payload.regionSelection[0]) || "PAN India",
    process: buildProcessLabel(payload.restrictionSelection),
    status: "Active",
    regionSelection: payload.regionSelection || [],
    restrictionSelection: payload.restrictionSelection || [],
    ewi: payload.ewi,
    tenure: payload.tenure,
    categories: payload.categories,
  };
  restrictionRules = [rule, ...restrictionRules];
  return delay(clone(rule));
}

export async function updateRestrictionRule(id, payload) {
  restrictionRules = restrictionRules.map((r) => {
    if (r.id !== id) return r;
    return {
      ...r,
      region: (payload.regionSelection && payload.regionSelection[0]) || r.region,
      process: buildProcessLabel(payload.restrictionSelection),
      regionSelection: payload.regionSelection || [],
      restrictionSelection: payload.restrictionSelection || [],
      ewi: payload.ewi,
      tenure: payload.tenure,
      categories: payload.categories,
    };
  });
  const updated = restrictionRules.find((r) => r.id === id);
  return delay(clone(updated));
}

export async function deleteRestrictionRule(id) {
  restrictionRules = restrictionRules.filter((r) => r.id !== id);
  return delay({ success: true });
}

/* ------------------------------------------------------------------------ */
/* Helpers exported for display components                                  */
/* ------------------------------------------------------------------------ */

export function getEwiThresholdLabel(rule) {
  return buildEwiLabel(rule.ewi);
}

function formatToday() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
