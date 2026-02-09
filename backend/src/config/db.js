import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "root",
  database: "production_db",
  port: 5432,
});

pool.on("connect", () => {
  console.log("🟢 DB connection pool created");
});

export default pool;
