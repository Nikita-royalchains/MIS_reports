import express from "express";
import cors from "cors";
import reportRoutes from "./src/routes/report.routes.js";
import pool from "./src/config/db.js";


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/report", reportRoutes);

// Server start + DB check
const PORT = 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);

  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL database connected successfully");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
  }
});

