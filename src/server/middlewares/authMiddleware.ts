import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService.js";
import { prisma } from "../config/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Token d'authentification manquant ou invalide" });
    }

    const token = authHeader.split(" ")[1];
    const payload = AuthService.verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Session expirée ou invalide. Veuillez vous reconnecter." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { role: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, error: "Utilisateur introuvable ou compte suspendu." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: JSON.parse(user.role.permissions || "[]")
    };

    next();
  } catch (err: any) {
    console.error("Auth Middleware Error:", err);
    res.status(500).json({ success: false, error: "Une erreur est survenue lors de l'authentification." });
  }
}

export function requirePermission(requiredPermission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Token d'authentification manquant ou invalide" });
      }

      const token = authHeader.split(" ")[1];
      const payload = AuthService.verifyAccessToken(token);
      if (!payload) {
        return res.status(401).json({ success: false, error: "Session expirée ou invalide. Veuillez vous reconnecter." });
      }

      // Fetch user with role
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: { role: true }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: "Utilisateur introuvable" });
      }

      if (!user.active) {
        return res.status(403).json({ success: false, error: "Ce compte a été suspendu par l'administrateur." });
      }

      const permissions: string[] = JSON.parse(user.role.permissions || "[]");

      // Check permissions (if they have 'all' permission or the specific permission required)
      const hasPermission = permissions.includes("all") || permissions.includes(requiredPermission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Accès refusé : permission '${requiredPermission}' requise pour cette opération.`
        });
      }

      // Attach user details to the request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions
      };

      next();
    } catch (err: any) {
      console.error("Auth Middleware Error:", err);
      res.status(500).json({ success: false, error: "Une erreur est survenue lors de l'authentification." });
    }
  };
}
