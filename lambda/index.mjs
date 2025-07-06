import axios from "axios"
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { parse as csvParse } from "csv-parse/sync"
import * as XLSX from "xlsx"

const s3 = new S3Client({ region: "eu-west-3" })

const url = "https://talented-sunrise-fed78168b8.strapiapp.com/api/data-acts"
const token = "f0e9d7751b936f544dd32e88f193f67dd5c7e2454d282d3fba0aa0a6a51f9a9a21cf18c6c0a58f467383d7d780d650fd0052b1b264e2691afbe122bd108ef5cb64953763ce87cb233df28f71d9cdd3610c63f01e1baba6d74424cbaed242217d0fd8e8a2acf7ce17c5efe6753012765b7d2ba375b69ed77bbe9c071ed42d32b7"

async function main() {
  // Je liste les fichiers du bucket
  let files
  try {
    files = await s3.send(new ListObjectsV2Command({ Bucket: "data-act-bucket" }))
  } catch (e) {
    console.log("bucket erreur")
    return
  }

  let fileKeys = []
  for (let k in files.Contents) {
    let kk = files.Contents[k].Key
    if (kk.endsWith(".csv") || kk.endsWith(".xlsx") || kk.endsWith(".xls")) {
      fileKeys.push(kk)
    }
  }

  let titres = []
  let tout = {}
  for (let i = 0; i < fileKeys.length; i++) {
    let f = fileKeys[i]
    let obj = await s3.send(new GetObjectCommand({ Bucket: "data-act-bucket", Key: f }))
    let buf = await obj.Body.transformToByteArray()
    let rows
    if (f.endsWith(".csv")) {
      rows = csvParse(Buffer.from(buf).toString(), { columns: true, skip_empty_lines: true, trim: true })
    } else {
      let wb = XLSX.read(Buffer.from(buf), { type: "buffer" })
      let ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(ws)
    }
    for (let z = 0; z < rows.length; z++) {
      let r = rows[z]
      if (r.title && r.title.trim() != "") {
        titres.push(r.title)
        tout[r.title] = r // Ecrase si doublons
      }
    }
  }

  // Je récupère tout de Strapi
  let dataStrapi = {}
  let page = 1
  let ok = true
  while (ok) {
    let res = await axios.get(url + "?pagination[page]=" + page + "&pagination[pageSize]=100", {
      headers: { Authorization: `Bearer ${token}` }
    })
    let arr = res.data.data
    for (let j = 0; j < arr.length; j++) {
      let e = arr[j]
      if (e.title) dataStrapi[e.title] = e
    }
    if (page >= (res.data.meta?.pagination?.pageCount || 1)) ok = false
    page++
  }

  // Je crée ou update si c'est différent
  for (let k = 0; k < titres.length; k++) {
    let t = titres[k]
    let row = tout[t]
    let e = dataStrapi[t]

    let body = {
      title: row.title || "",
      type_offre: row["Type d'offre"] || row.type_offre || "",
      description: [
        { type: "paragraph", children: [{ text: row.description || "", type: "text" }] }
      ],
      statuts: row.statuts || "",
      countries: row.countries || row.Countries || "",
      opportunity: (row.opportunity ?? row.Opportunity ?? "").toString().toLowerCase() === "true",
      obligations: (row.obligations ?? row.Obligations ?? "").toString().toLowerCase() === "true",
      valide_dates: row["valide-dates"] || row.valide_dates || "",
    }

    let isSame = false
    if (e) {
      // On regarde si c'est pareil mais on compare tout d'un coup
      let compareA = JSON.stringify({
        title: e.title,
        type_offre: e.type_offre,
        description: (Array.isArray(e.description) && e.description[0]?.children?.[0]?.text)
          ? e.description[0].children[0].text
          : (typeof e.description === "string" ? e.description : ""),
        statuts: e.statuts,
        countries: e.countries,
        opportunity: e.opportunity,
        obligations: e.obligations,
        "valide-dates": e.valide_dates
      })
      let compareB = JSON.stringify({
        title: body.title,
        type_offre: body.type_offre,
        description: row.description || "",
        statuts: body.statuts,
        countries: body.countries,
        opportunity: body.opportunity,
        obligations: body.obligations,
        "valide-dates": body.valide_dates
      })
      if (compareA == compareB) isSame = true
    }

    if (e) {
      if (!isSame) {
        await axios.put(url + "/" + e.documentId, { data: body }, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        })
        console.log("update", t)
      } else {
        console.log("pareil", t)
      }
    } else {
      await axios.post(url + "/", { data: body }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      })
      console.log("ajoute", t)
    }
  }

  // Je supprime tout ce qui n'est plus dans le bucket
  for (let t in dataStrapi) {
    if (!titres.includes(t)) {
      try {
        await axios.delete(url + "/" + dataStrapi[t].documentId, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log("supprimé", t)
      } catch (e) {
        console.log("déjà supprimé ou erreur", t)
      }
    }
  }

  console.log("fini")
}

export const handler = main
