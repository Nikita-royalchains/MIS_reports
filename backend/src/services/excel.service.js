import XLSX from "xlsx";
import pool from "../config/db.js";


function excelDateToJSDate(excelValue) {
  if (!excelValue) return null;

  // If already a string date (31-12-2025)
  if (typeof excelValue === "string") {
    const [dd, mm, yyyy] = excelValue.split("-");
    if (dd && mm && yyyy) {
      return `${yyyy}-${mm}-${dd}`; // PostgreSQL format
    }
    return null;
  }

  // If Excel serial number (46022)
  if (typeof excelValue === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(
      excelEpoch.getTime() + excelValue * 86400000
    );
    return jsDate.toISOString().split("T")[0];
  }

  return null;
}

export const importExcelToDB = async (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const r of rows) {
        const transDate = excelDateToJSDate(r["Trans Date"]);
      await client.query(
        `
        INSERT INTO production_report (
          created_by, trans_date, doc_no, batch_no,
          operation, wc_name, karat, variant_name,
          issue_gms_wt, issue_pg, issue_fineness,
          return_gms_wt, return_pg, return_fineness,
          unutilized_gms_wt, unutilized_pg, unutilized_fineness,
          unutilized_scrap, unutilized_scrap_pg, unutilized_scrap_fineness,
          unutilized_sample, unutilized_sample_pg, unutilized_sample_fineness,
          loss_gms_wt, loss_pg_wt, loss_fineness,
          bal, gain, remark, minifs,
          roundup_value, row_count
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,
          $27,$28,$29,$30,$31,$32
        )
        `,
        [
          r["Created By"], transDate, r["Doc No"], r["Batch No"],
          r["Operation"], r["Wc Name"], r["karat"], r["Variant Name"],
          r["Issue Gms Wt"], r["Issue Pg"], r["Issue Fineness"],
          r["Return Gms Wt"], r["Return Pg"], r["Return Fineness"],
          r["Unutilized Gms Wt"], r["Unutilized Pg"], r["Unutilized Fineness"],
          r["Unutilized Scrap"], r["Unutilized Scrap Pg"], r["Unutilized Scrap Fineness"],
          r["Unutilized Sample"], r["Unutilized Sample Pg"], r["Unutilized Sample Fineness"],
          r["Loss Gms Wt"], r["Loss Pg Wt"], r["Loss Fineness"],
          r["BAL"], r["GAIN"], r["remark"], r["minifs"],
          r["roundup"], r["count"]
        ]
      );
    }

    await client.query("COMMIT");
    return rows.length;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};
