import express from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isHttpError } from "./errors.js";
import type { MigrationFundingService } from "./migrationFunding.js";

type CreateAppOptions = {
  migrationFundingService: MigrationFundingService;
  staticDir?: string;
};

export function createApp({ migrationFundingService, staticDir }: CreateAppOptions) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/migration-funding", async (req, res) => {
    try {
      const result = await migrationFundingService.requestFunding(req.body);
      res.json(result);
    } catch (error) {
      if (isHttpError(error)) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error("Migration funding request failed:", error);
      res.status(500).json({ error: "Migration funding request failed" });
    }
  });

  if (staticDir) {
    app.use(express.static(staticDir));
    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }

      try {
        const html = await readFile(join(staticDir, "index.html"), "utf8");
        res.type("html").send(html);
      } catch (error) {
        next(error);
      }
    });
  }

  return app;
}
