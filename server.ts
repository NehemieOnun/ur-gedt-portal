import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import v1Router from "./src/server/routes/v1.js";

dotenv.config();

async function startServer() {
  // --- Check and Heal Database if corrupted ---
  try {
    const { checkAndHealDatabase } = await import("./src/server/config/prisma");
    await checkAndHealDatabase();
  } catch (err) {
    console.error("Database initialization check failed:", err);
  }

  const app = express();
  const PORT = 3000;

  // --- trust proxy ---
  // Enable trusting the proxy headers (X-Forwarded-For, Forwarded) set by Cloud Run and Nginx
  app.set("trust proxy", 1);

  // --- 1. MORGAN LOGGER ---
  app.use(morgan("dev"));

  // --- 2. SECURITY MIDDLEWARES ---
  // Helmet secures HTTP headers. Disable CSP and Iframe restrictions so the app runs flawlessly inside the AI Studio preview window.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false
    })
  );

  app.use(cors());

  // --- 3. PAYLOAD SIZE LIMITS ---
  // Large limits to accommodate base64 files (e.g. PDF and receipt scans)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // --- 4. COMPRESSION ---
  app.use(compression());

  // --- 5. RATE LIMITING ---
  // Protect endpoints from excessive request spikes or brute force attacks
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: "Trop de requêtes, veuillez réessayer après 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });
  app.use("/api/", apiLimiter);

  // --- 6. API REST ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "UR-GEDT Portal API" });
  });

  // Mount the modern Clean Architecture REST API under both /api/v1 and legacy /api (to keep frontend completely compatible)
  app.use("/api/v1", v1Router);
  app.use("/api", v1Router);

  // --- 7. STATIC ASSETS & VITE MIDDLEWARE ---
  app.use(express.static(path.join(process.cwd(), "public")));

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[UR-GEDT] MVC Production-ready Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start UR-GEDT MVC Server:", err);
});
