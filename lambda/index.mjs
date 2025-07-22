import axios from "axios";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

// Create S3 client
const s3 = new S3Client({ region: "eu-west-3" });

// S3 bucket and Strapi config
const BUCKET = "data-act-bucket";
const STRAPI_URL = process.env.StrapiUrl;
const STRAPI_TOKEN = process.env.StrapiToken;

// Allowed values for validation
const VALID_TYPE_OFFRE = ["Accord", "Convention", "Plateforme", "Projet pilote"];
const VALID_STATUTS = ["Status_1", "Status_2", "Status_3"];

// Convert string or boolean-like value to true/false
function parseBool(val) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.trim().toLowerCase() === "true";
  return false;
}

// Validate and clean one row of data
function validateDataRow(row) {
  const errors = [];

  if (!row.title || typeof row.title !== "string" || !row.title.trim()) errors.push("Missing or invalid title");
  const typeOffre = row["Type d'offre"] || row.type_offre;
  if (!VALID_TYPE_OFFRE.includes(typeOffre)) errors.push(`Invalid Type d'offre: ${typeOffre}`);
  const statuts = row.statuts || row.Status;
  if (!VALID_STATUTS.includes(statuts)) errors.push(`Invalid statuts: ${statuts}`);

  let countries = "";
if (typeof row.countries === "string") {
  countries = row.countries.trim();
} else if (typeof row.Countries === "string") {
  countries = row.Countries.trim(); 
} else if (Array.isArray(row.Countries)) {
  countries = row.Countries.join(",");
}
console.log(`Country value for "${row.title}":`, countries);



  const opportunity = parseBool(row.Opportunity ?? row.opportunity);
  const obligations = parseBool(row.Obligations ?? row.obligations);
  const valide_dates = row["valide-dates"] || row.valide_dates;

  const data = {
    title: row.title,
    "Type d'offre": typeOffre,
    description: row.description,
    statuts: statuts,
    countries: countries,
    opportunity: opportunity,
    obligations: obligations,
    "valide-dates": valide_dates,
  };

  return { valid: errors.length === 0, errors, data };
}

// List all CSV or Excel files from S3
async function listFilesFromS3(bucket) {
  try {
    const files = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    return (files.Contents || [])
      .map(f => f.Key)
      .filter(k => k.endsWith(".csv") || k.endsWith(".xlsx") || k.endsWith(".xls"));
  } catch (e) {
    console.error("Error while listing files from S3", e);
    throw e;
  }
}

// Parse CSV or Excel file and return data
async function parseFile(buffer, filename) {
  if (filename.endsWith(".csv")) {
    return csvParse(Buffer.from(buffer).toString(), { columns: true, skip_empty_lines: true, trim: true });
  } else {
    const wb = XLSX.read(Buffer.from(buffer), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }
}

// Fetch all Strapi entries using pagination
async function getStrapiData(url, token) {
  let all = [];
  let page = 1, hasNext = true;

  while (hasNext) {
    const res = await axios.get(`${url}?pagination[page]=${page}&pagination[pageSize]=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    all.push(...res.data.data);
    const pageCount = res.data.meta?.pagination?.pageCount || 1;
    hasNext = page < pageCount;
    page++;
  }

  const entries = {};
  for (const e of all) if (e.title) entries[e.title] = e;
  return entries;
}

// Create or update data in Strapi
async function syncStrapi(dataRows, strapiData, url, token) {
  await Promise.all(dataRows.map(async row => {
    const { valid, errors, data } = validateDataRow(row);
    if (!valid) {
      console.warn(`[IGNORED] "${row.title || "(no title)"}":`, errors);
      return;
    }

    const body = {
      title: data.title,
      type_offre: data["Type d'offre"],
      description: [
        { type: "paragraph", children: [{ text: data.description || "", type: "text" }] }
      ],
      statuts: data.statuts || "",
      countries: data.countries || "",
      opportunity: data.opportunity,
      obligations: data.obligations,
      valide_dates: data["valide-dates"] || "",
    };

    const existing = strapiData[data.title];
    let isSame = false;

    if (existing) {
      let compareA = JSON.stringify({
        title: existing.title,
        type_offre: existing.type_offre,
        description: (Array.isArray(existing.description) && existing.description[0]?.children?.[0]?.text)
          ? existing.description[0].children[0].text : "",
        statuts: existing.statuts,
        countries: existing.countries,
        opportunity: existing.opportunity,
        obligations: existing.obligations,
        "valide-dates": existing.valide_dates
      });
      let compareB = JSON.stringify({
        title: body.title,
        type_offre: body.type_offre,
        description: data.description || "",
        statuts: body.statuts,
        countries: body.countries,
        opportunity: body.opportunity,
        obligations: body.obligations,
        "valide-dates": body.valide_dates
      });
      if (compareA === compareB) isSame = true;
    }

    try {
      if (existing) {
        if (!isSame) {
          await axios.put(url + "/" + existing.documentId, { data: body }, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          });
          console.log("update", data.title);
        }
      } else {
        await axios.post(url + "/", { data: body }, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        });
        console.log("add", data.title);
      }
    } catch (e) {
      console.error("Error syncing Strapi for", data.title, e.message);
    }
  }));
}

// Delete entries in Strapi that don't exist anymore
async function deleteMissingStrapiEntries(strapiData, titles, url, token) {
  await Promise.all(
    Object.keys(strapiData).map(t => {
      if (!titles.includes(t)) {
        return axios.delete(url + "/" + strapiData[t].documentId, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(() => console.log("deleted", t))
          .catch(e => console.warn("delete error", t, e.message));
      }
      return Promise.resolve();
    })
  );
}

// Main Lambda function
export const handler = async () => {
  try {
    const fileKeys = await listFilesFromS3(BUCKET);

    // Read and parse each file
    const filesData = await Promise.all(
      fileKeys.map(async key => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const buf = await obj.Body.transformToByteArray();
        const rows = await parseFile(buf, key);
        return rows;
      })
    );

    // Prepare data, clean and deduplicate
    let titles = [];
    let allRows = {};
    for (const rows of filesData) {
      for (const r of rows) {
        const check = validateDataRow(r);
        if (check.valid && r.title && r.title.trim() !== "") {
          titles.push(r.title);
          allRows[r.title] = r;
        } else if (!check.valid) {
          console.warn(`Skipped row [${r.title || "no title"}]:`, check.errors);
        }
      }
    }

    const allRowsArr = Object.values(allRows);
    const strapiData = await getStrapiData(STRAPI_URL, STRAPI_TOKEN);
    await syncStrapi(allRowsArr, strapiData, STRAPI_URL, STRAPI_TOKEN);
    await deleteMissingStrapiEntries(strapiData, titles, STRAPI_URL, STRAPI_TOKEN);
    console.log(`Done. ${titles.length} items processed.`);
  } catch (err) {
    console.error("Lambda error", err);
    throw err;
  }
};
