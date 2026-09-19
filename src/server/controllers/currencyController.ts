import { Response } from "express";
import { prisma } from "../config/prisma.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

export const CurrencyController = {
  async getExchangeRates(req: AuthenticatedRequest, res: Response) {
    try {
      let rates = await prisma.exchangeRate.findUnique({ where: { id: "1" } });
      if (!rates) {
        rates = await prisma.exchangeRate.create({
          data: { id: "1", baseCurrency: "EUR", eurToUsd: 1.0, eurToCdf: 2800.0 },
        });
      }
      res.json(rates);
    } catch (err) {
      console.error("getExchangeRates error:", err);
      res.status(500).json({ error: "Impossible de recuperer les taux de change." });
    }
  },

  async updateExchangeRates(req: AuthenticatedRequest, res: Response) {
    try {
      const { eurToUsd, eurToCdf } = req.body;
      if (typeof eurToUsd !== "number" || eurToUsd <= 0 || typeof eurToCdf !== "number" || eurToCdf <= 0) {
        return res.status(400).json({ error: "Taux de change invalides." });
      }
      const rates = await prisma.exchangeRate.upsert({
        where: { id: "1" },
        update: { eurToUsd, eurToCdf, updatedBy: req.user?.name || req.user?.email || "system" },
        create: { id: "1", baseCurrency: "EUR", eurToUsd, eurToCdf, updatedBy: req.user?.name || "system" },
      });
      res.json(rates);
    } catch (err) {
      console.error("updateExchangeRates error:", err);
      res.status(500).json({ error: "Impossible de mettre a jour les taux de change." });
    }
  },
};