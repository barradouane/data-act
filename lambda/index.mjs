import "dotenv/config";
import axios from "axios";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

const s3 = new S3Client({ region: "eu-west-3" });
const BUCKET = "data-act-bucket";
const STRAPI_URL = process.env.StrapiUrl;
const STRAPI_TOKEN = process.env.StrapiToken;

// Enum constraints for validation
const VALID_TYPE_OFFRE = ["Accord", "Convention", "Plateforme", "Projet pilote"];
const VALID_STATUTS = ["Status_1", "Status_2", "Status_3"];
// Mapping CSV keys to Strapi model fields
const FIELD_MAP = {
  title: "title",
  "Type d'offre": "type_offre",
  description: "description",
  statuts: "statuts",
  Countries: "countries",
  Opportunity: "opportunity",
  obligations: "obligations",
  valide_dates: "valide_dates"
};

// Levenshtein distance to allow fuzzy matching of column headers
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}
// Find the closest matching field key from CSV input to expected field names
function matchClosestField(inputKey) {
  const cleaned = inputKey.trim().toLowerCase().replace(/[^a-z]/g, "");
  let bestMatch = null;
  let minDistance = Infinity;
  for (const csvKey in FIELD_MAP) {
    const target = csvKey.toLowerCase().replace(/[^a-z]/g, "");
    const dist = levenshtein(cleaned, target);
    if (dist < minDistance && dist <= 4) {
      bestMatch = csvKey;
      minDistance = dist;
    }
  }
  return bestMatch;
}

// Normalize CSV row keys using fuzzy matching to FIELD_MAP keys
function normalizeRowKeys(row) {
  const normalized = {};
  for (const key in row) {
    const match = matchClosestField(key);
    if (match) normalized[match] = row[key];
  }
  return normalized;
}

// Trim strings and convert values to string
function sanitizeString(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return value.toString();
  return "";
}
// Convert loose string/boolean-like values into actual boolean
function parseBool(val) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.trim().toLowerCase() === "true";
  return false;
}
// Validate and clean a single row of input data
// - Ensures required fields exist and enums are valid
// - Returns structured data + validation errors
function validateDataRow(row) {
  const normalizedRow = normalizeRowKeys(row);
  const errors = [];

  const title = sanitizeString(normalizedRow["title"]);
  if (!title) errors.push("Missing or invalid title");

  const typeOffre = sanitizeString(normalizedRow["Type d'offre"]);
  if (!VALID_TYPE_OFFRE.includes(typeOffre)) errors.push(`Invalid Type d'offre: ${typeOffre}`);

  const statuts = sanitizeString(normalizedRow["statuts"]);
  if (!VALID_STATUTS.includes(statuts)) errors.push(`Invalid statuts: ${statuts}`);

  let countries = "";
  if (Array.isArray(normalizedRow["Countries"])) {
    countries = normalizedRow["Countries"].map(sanitizeString).join(",");
  } else {
    countries = sanitizeString(normalizedRow["Countries"]);
  }

  const opportunity = parseBool(normalizedRow["Opportunity"]);
  const obligations = parseBool(normalizedRow["obligations"]);
  const valide_dates = sanitizeString(normalizedRow["valide_dates"]);
  const description = sanitizeString(normalizedRow["description"]);

  const data = {
    title,
    type_offre: typeOffre,
    description,
    statuts,
    countries,
    opportunity,
    obligations,
    valide_dates,
  };

  return { valid: errors.length === 0, errors, data, raw: normalizedRow };
}

//  Prepare a cleaned object for error reporting
// - Coerces types and normalizes invalid values (e.g. enum fallbacks)
function cleanForErrorReport(row) {
  const normalized = normalizeRowKeys(row);
  const cleaned = {};
  for (const key in FIELD_MAP) {
    const val = normalized[key];
    const field = FIELD_MAP[key];
    if (field === "opportunity" || field === "obligations") {
      cleaned[field] = parseBool(val);
    } else if (field === "type_offre") {
      cleaned[field] = VALID_TYPE_OFFRE.includes(sanitizeString(val)) ? sanitizeString(val) : null;
    } else if (field === "statuts") {
      cleaned[field] = VALID_STATUTS.includes(sanitizeString(val)) ? sanitizeString(val) : null;
    } else {
      cleaned[field] = val === undefined || val === null ? "" : sanitizeString(val);
    }
  }
  return cleaned;
}
// Push invalid entries to the `import-errors` collection in Strapi
// - Avoids duplicate reports using title + filename
async function reportErrorToStrapi(row, errors, filename) {
  try {
    const cleanedRow = cleanForErrorReport(row);
    const queryTitle = cleanedRow.title;
    const queryURL = `${STRAPI_URL.replace(/\/data-acts$/, "/import-errors")}?filters[title][$eq]=${encodeURIComponent(queryTitle)}&filters[filename][$eq]=${encodeURIComponent(filename)}&pagination[pageSize]=1`;

    const existing = await axios.get(queryURL, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });

    if (existing.data?.data?.length > 0) return;

    const payload = {
      data: {
        ...cleanedRow,
        errors: errors.join("; "),
        filename
      }
    };

    await axios.post(`${STRAPI_URL.replace(/\/data-acts$/, "/import-errors")}`, payload, {
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.warn("Failed to report error", e.message);
  }
}
//  List all .csv/.xlsx/.xls files in the S3 bucket
async function listFilesFromS3(bucket) {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return (res.Contents || [])
    .map(obj => obj.Key)
    .filter(key => key.endsWith(".csv") || key.endsWith(".xlsx") || key.endsWith(".xls"));
}
//Parse CSV or Excel file buffer into structured row objects
async function parseFile(buffer, filename) {
  if (filename.endsWith(".csv")) {
    return csvParse(Buffer.from(buffer).toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } else {
    const wb = XLSX.read(Buffer.from(buffer), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }
}
//fetch all current entries from Strapi with pagination
// - Used for deduplication and update detection
async function getStrapiData(url, token) {
  let all = [];
  let page = 1, hasNext = true;

  while (hasNext) {
    const res = await axios.get(`${url}?pagination[page]=${page}&pagination[pageSize]=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    all.push(...res.data.data);
    hasNext = page < (res.data.meta?.pagination?.pageCount || 1);
    page++;
  }

  const entries = {};
  for (const e of all) if (e.title) entries[e.title] = e;
  return entries;
}
// Sync valid rows to Strapi
// - Create or update entries based on content diff
// - Avoid unnecessary writes when data hasn't changed
async function syncStrapi(dataRows, strapiData, url, token) {
  await Promise.all(dataRows.map(async row => {
    const { valid, errors, data } = validateDataRow(row);
    if (!valid) return;

    const body = {
      title: data.title,
      type_offre: data.type_offre,
      description: [{ type: "paragraph", children: [{ text: data.description || "", type: "text" }] }],
      statuts: data.statuts || "",
      countries: data.countries || "",
      opportunity: data.opportunity,
      obligations: data.obligations,
      valide_dates: data.valide_dates || ""
    };

    const existing = strapiData[data.title];
    let isSame = false;

    if (existing) {
      const compareA = JSON.stringify({
        title: existing.title,
        type_offre: existing.type_offre,
        description: (Array.isArray(existing.description) && existing.description[0]?.children?.[0]?.text) ? existing.description[0].children[0].text : "",
        statuts: existing.statuts,
        countries: existing.countries,
        opportunity: existing.opportunity,
        obligations: existing.obligations,
        valide_dates: existing.valide_dates
      });

      const compareB = JSON.stringify({
        title: body.title,
        type_offre: body.type_offre,
        description: data.description || "",
        statuts: body.statuts,
        countries: body.countries,
        opportunity: body.opportunity,
        obligations: body.obligations,
        valide_dates: body.valide_dates
      });

      isSame = compareA === compareB;
    }

    try {
      if (existing && !isSame) {
        await axios.put(url + "/" + existing.documentId, { data: body }, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
      } else if (!existing) {
        await axios.post(url + "/", { data: body }, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      console.error("Error syncing Strapi for", data.title, e.message);
    }
  }));
}
//  Delete entries from Strapi that are no longer present in S3 files
async function deleteMissingStrapiEntries(strapiData, titles, url, token) {
  await Promise.all(
    Object.keys(strapiData).map(t => {
      if (!titles.includes(t)) {
        return axios.delete(url + "/" + strapiData[t].documentId, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(e => console.warn("delete error", t, e.message));
      }
    })
  );
}

// AWS Lambda handler: orchestrates the full import/sync flow
// - 1. Fetch file list from S3
// - 2. Parse each file and validate data
// - 3. Report errors to Strapi
// - 4. Sync valid data (create/update)
// - 5. Delete outdated entries in Strapi
export const handler = async () => {
  try {
    const fileKeys = await listFilesFromS3(BUCKET);
    const strapiData = await getStrapiData(STRAPI_URL, STRAPI_TOKEN);

    const filesParsed = await Promise.all(fileKeys.map(async key => {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const buf = await obj.Body.transformToByteArray();
      const rows = await parseFile(buf, key);
      return { key, rows };
    }));

    let titles = [];
    let allValidRows = [];

    for (const { key, rows } of filesParsed) {
      for (const row of rows) {
        const result = validateDataRow(row);
        if (result.valid && result.data.title) {
          titles.push(result.data.title);
          allValidRows.push(row);
        } else {
          await reportErrorToStrapi(result.raw, result.errors, key);
        }
      }
    }

    await syncStrapi(allValidRows, strapiData, STRAPI_URL, STRAPI_TOKEN);
    await deleteMissingStrapiEntries(strapiData, titles, STRAPI_URL, STRAPI_TOKEN);
    console.log(`Done. ${titles.length} items processed.`);
  } catch (err) {
    console.error("Lambda error", err);
    throw err;
  }
};
if (process.env.LOCAL === "true") {
  handler();
}
