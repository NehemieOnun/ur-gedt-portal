import express from "express";
import cors from "cors";
import v1Router from "../src/server/routes/v1";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "UR-GEDT Portal API (Vercel Serverless)" });
});

app.use("/api/v1", v1Router);
app.use("/api", v1Router);

export default app;
