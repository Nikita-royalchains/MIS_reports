import { importExcelToDB } from "../services/excel.service.js";
import pool from "../config/db.js";
import XLSX from "xlsx";

/* ================= UPLOAD ================= */
export const uploadExcel = async (req, res) => {
  try {
    const count = await importExcelToDB(req.file.buffer);
    res.json({ message: "Uploaded", rows: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
};

/* ================= LIST ================= */
export const listReport = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const { rows } = await pool.query(
      `
      SELECT *
      FROM production_report
      WHERE
        doc_no ILIKE $1 OR
        batch_no ILIKE $1 OR
        operation ILIKE $1
      ORDER BY id ASC
      `,
      [`%${search}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch failed" });
  }
};

/* ================= UPDATE ================= */
export const updateReport = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ roundup_value
    await client.query(`
      UPDATE production_report
      SET roundup_value = ROUND(return_pg, 3)
      WHERE return_pg IS NOT NULL
    `);

    // 2️⃣ row_count
    await client.query(`
      UPDATE production_report pr
      SET row_count = c.cnt
      FROM (
        SELECT batch_no, COUNT(*) cnt
        FROM production_report
        GROUP BY batch_no
      ) c
      WHERE pr.batch_no = c.batch_no
    `);

    // 3️⃣ minifs
    await client.query(`
      UPDATE production_report pr
      SET minifs = m.min_roundup
      FROM (
        SELECT batch_no, MIN(roundup_value) min_roundup
        FROM production_report
        GROUP BY batch_no
        HAVING COUNT(DISTINCT return_pg) > 1
      ) m
      WHERE pr.batch_no = m.batch_no
    `);

    // 4️⃣ remark
    await client.query(`
      UPDATE production_report
      SET remark = CASE
        WHEN wc_name ILIKE '%repair%' THEN 'REPAIR'
        WHEN roundup_value = 0 THEN 'FINISH'
        ELSE 'DOUBLE-ENTRY'
      END
    `);

    await client.query("COMMIT");
    res.json({ success: true });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  } finally {
    client.release();
  }
};

/* ================= DOWNLOAD ================= */
export const downloadReport = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM production_report ORDER BY id ASC"
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Production Report");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=production_report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
};
