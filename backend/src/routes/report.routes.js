import express from "express";
import { upload } from "../middlewares/upload.middleware.js";
import {
  uploadExcel,
  listReport,
  updateReport,
  downloadReport
} from "../controllers/report.controller.js";

const router = express.Router();

/* ---------- EXISTING ---------- */
router.post("/upload", upload.single("file"), uploadExcel);
router.get("/list", listReport);

/* ---------- ADD THESE ---------- */
router.post("/update", updateReport);
router.get("/download", downloadReport);

export default router;
