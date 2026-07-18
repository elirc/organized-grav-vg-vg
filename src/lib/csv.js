function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = splitCsvLine(lines[lineIndex]);
    const row = {};

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      row[headers[columnIndex]] = values[columnIndex] || "";
    }

    rows.push(row);
  }

  return {
    headers,
    rows,
  };
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeDateInput(value) {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

const EMPLOYEE_ALIASES = {
  firstName: ["firstname", "first", "first_name", "givenname", "given_name"],
  lastName: ["lastname", "last", "last_name", "surname", "familyname"],
  personalEmail: ["personalemail", "email", "employeeemail", "personal_email"],
  workEmail: ["workemail", "companyemail", "businessemail", "work_email"],
  employmentCountry: ["employmentcountry", "country", "countrycode", "employment_country"],
  jobTitle: ["jobtitle", "title", "role", "position", "job_title"],
  department: ["department", "team", "costcenter"],
  startDate: ["startdate", "start", "hiredate", "hire_date", "start_date"],
  compensationAmount: ["compensationamount", "salary", "basesalary", "salaryamount", "compensation"],
  compensationCurrency: ["compensationcurrency", "currency", "salarycurrency"],
  payFrequency: ["payfrequency", "pay_cycle", "frequency"],
};

function buildNormalizedRowLookup(row) {
  const lookup = {};

  for (const [key, value] of Object.entries(row || {})) {
    lookup[normalizeKey(key)] = String(value || "").trim();
  }

  return lookup;
}

function pickFromLookup(lookup, aliases) {
  for (const alias of aliases) {
    const value = lookup[normalizeKey(alias)];
    if (value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

export function mapEmployeeCsvRow(row) {
  const lookup = buildNormalizedRowLookup(row);

  const mapped = {
    firstName: pickFromLookup(lookup, EMPLOYEE_ALIASES.firstName),
    lastName: pickFromLookup(lookup, EMPLOYEE_ALIASES.lastName),
    personalEmail: pickFromLookup(lookup, EMPLOYEE_ALIASES.personalEmail).toLowerCase(),
    workEmail: pickFromLookup(lookup, EMPLOYEE_ALIASES.workEmail).toLowerCase(),
    employmentCountry: pickFromLookup(lookup, EMPLOYEE_ALIASES.employmentCountry).toUpperCase(),
    jobTitle: pickFromLookup(lookup, EMPLOYEE_ALIASES.jobTitle),
    department: pickFromLookup(lookup, EMPLOYEE_ALIASES.department),
    startDate: normalizeDateInput(pickFromLookup(lookup, EMPLOYEE_ALIASES.startDate)),
    compensationAmount: toNumber(pickFromLookup(lookup, EMPLOYEE_ALIASES.compensationAmount)),
    compensationCurrency: pickFromLookup(lookup, EMPLOYEE_ALIASES.compensationCurrency).toUpperCase(),
    payFrequency: pickFromLookup(lookup, EMPLOYEE_ALIASES.payFrequency).toUpperCase(),
  };

  if (!mapped.compensationCurrency) {
    mapped.compensationCurrency = "USD";
  }

  if (!mapped.payFrequency) {
    mapped.payFrequency = "MONTHLY";
  }

  return mapped;
}

export function validateMappedEmployeeRow(mappedRow) {
  const requiredFields = [
    "firstName",
    "lastName",
    "personalEmail",
    "employmentCountry",
    "jobTitle",
    "startDate",
  ];

  const missingFields = requiredFields.filter((field) => !mappedRow[field]);

  const validationErrors = [];
  if (missingFields.length > 0) {
    validationErrors.push(`Missing required columns/values: ${missingFields.join(", ")}`);
  }

  if (mappedRow.personalEmail && !mappedRow.personalEmail.includes("@")) {
    validationErrors.push("personalEmail is invalid.");
  }

  if (mappedRow.compensationAmount !== null && mappedRow.compensationAmount < 0) {
    validationErrors.push("compensationAmount cannot be negative.");
  }

  const allowedPayFrequencies = ["MONTHLY", "SEMI_MONTHLY", "BI_WEEKLY", "WEEKLY"];
  if (mappedRow.payFrequency && !allowedPayFrequencies.includes(mappedRow.payFrequency)) {
    validationErrors.push(
      `payFrequency must be one of: ${allowedPayFrequencies.join(", ")}.`,
    );
  }

  return {
    valid: validationErrors.length === 0,
    errors: validationErrors,
  };
}

export const EMPLOYEE_CSV_TEMPLATE_HEADERS = [
  "first_name",
  "last_name",
  "personal_email",
  "employment_country",
  "job_title",
  "department",
  "start_date",
  "compensation_amount",
  "compensation_currency",
  "pay_frequency",
];

export const EMPLOYEE_CSV_TEMPLATE_ROW = [
  "Alex",
  "Worker",
  "alex.worker@example.com",
  "US",
  "Software Engineer",
  "Engineering",
  "2026-03-01",
  "85000",
  "USD",
  "MONTHLY",
];

export function buildEmployeeCsvTemplate() {
  return `${EMPLOYEE_CSV_TEMPLATE_HEADERS.join(",")}\n${EMPLOYEE_CSV_TEMPLATE_ROW.join(",")}\n`;
}
