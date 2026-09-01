import { Response } from "express";
import { prisma } from "../config/prisma.js";
import { AuthService } from "../services/authService.js";
import { loginSchema, forgotPasswordSchema, changePasswordSchema, resetPasswordSchema } from "../validators/zodSchemas.js";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

export class AuthController {
  public static async login(req: any, res: Response) {
    try {
      // 1. Zod schema validation
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0].message
        });
      }

      const { email, password } = parseResult.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { role: true }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: "Adresse email ou mot de passe invalide." });
      }

      if (!user.active) {
        return res.status(403).json({ success: false, error: "Compte désactivé. Veuillez contacter l'administrateur." });
      }

      const isMatch = await AuthService.verifyPassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Adresse email ou mot de passe invalide." });
      }

      // Generate JWT tokens for DB user
      const accessToken = AuthService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role?.name || "Visiteur"
      });

      const refreshToken = AuthService.generateRefreshToken({
        id: user.id,
        email: user.email
      });

      // Audit Log (Journalisation) - silent catch
      try {
        await prisma.log.create({
          data: {
            userId: user.id,
            userName: user.name,
            userRole: user.role?.name || "Visiteur",
            action: "Connexion",
            details: `Connexion de l'utilisateur ${user.name} (${user.role?.name || "Visiteur"}) réussie.`,
            ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "unknown"
          }
        });
      } catch {
        // Ignore audit log failure
      }

      res.json({
        success: true,
        message: "Connexion réussie",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || "Visiteur",
          permissions: user.role?.permissions ? JSON.parse(user.role.permissions) : []
        }
      });
    } catch (err: any) {
      console.error("Login controller error:", err);
      res.status(500).json({ success: false, error: "Erreur interne de connexion" });
    }
  }

  public static async forgotPassword(req: any, res: Response) {
    try {
      const parseResult = forgotPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0].message
        });
      }

      const { email } = parseResult.data;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
      });

      let resetToken: string | null = null;
      let resetLink: string | null = null;

      if (user) {
        resetToken = AuthService.generateResetToken({ id: user.id, email: user.email });
        resetLink = `?token=${resetToken}`;

        // Record audit log for password reset request
        await prisma.log.create({
          data: {
            userId: user.id,
            userName: user.name,
            userRole: user.role?.name || "Membre",
            action: "Demande de réinitialisation de mot de passe",
            details: `Lien de réinitialisation généré pour ${user.email}`,
            ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "unknown"
          }
        });
      }

      // Return unified response
      res.json({
        success: true,
        message: "Si l'adresse saisie est enregistrée dans l'annuaire de l'UR-GEDT, un courriel avec les instructions et un jeton de réinitialisation valide 60 minutes y a été envoyé.",
        email,
        userFound: !!user,
        userName: user ? user.name : null,
        resetToken,
        resetLink,
        simulatedDispatch: {
          service: "Service SMTP Institutionnel (UR-GEDT Mailer)",
          timestamp: new Date().toISOString(),
          status: "Délivré avec succès à l'agent de transfert institutionnel",
          resetLink: resetLink ? `${req.protocol}://${req.get("host")}/${resetLink}` : null
        }
      });
    } catch (err: any) {
      console.error("Forgot password controller error:", err);
      res.status(500).json({ success: false, error: "Erreur lors du traitement de la demande de réinitialisation." });
    }
  }

  public static async resetPassword(req: any, res: Response) {
    try {
      const parseResult = resetPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0].message
        });
      }

      const { token, newPassword } = parseResult.data;

      // 1. Verify reset token
      const decoded = AuthService.verifyResetToken(token);
      if (!decoded) {
        return res.status(400).json({
          success: false,
          error: "Jeton de réinitialisation invalide ou expiré (durée de validité : 60 minutes). Veuillez effectuer une nouvelle demande."
        });
      }

      // 2. Fetch user
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { role: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Compte utilisateur associé au jeton introuvable."
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          error: "Compte désactivé. Veuillez contacter l'administrateur."
        });
      }

      // 3. Hash new password
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // 4. Update password in database
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      // 5. Create Audit Log
      await prisma.log.create({
        data: {
          userId: user.id,
          userName: user.name,
          userRole: user.role?.name || "Membre",
          action: "Réinitialisation de mot de passe",
          details: `Mot de passe réinitialisé avec succès via jeton sécurisé pour ${user.email}`,
          ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      res.json({
        success: true,
        message: "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        email: user.email
      });
    } catch (err: any) {
      console.error("Reset password controller error:", err);
      res.status(500).json({
        success: false,
        error: "Erreur interne lors de la réinitialisation du mot de passe."
      });
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Non authentifié" });
      }

      const parseResult = changePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: parseResult.error.issues[0].message
        });
      }

      const { oldPassword, newPassword } = parseResult.data;

      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!dbUser) {
        return res.status(404).json({ success: false, error: "Utilisateur introuvable" });
      }

      const isMatch = await AuthService.verifyPassword(oldPassword, dbUser.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: "Ancien mot de passe incorrect" });
      }

      const newHashedPassword = await AuthService.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: newHashedPassword }
      });

      // Audit Log
      await prisma.log.create({
        data: {
          userId: dbUser.id,
          userName: dbUser.name,
          userRole: req.user.role,
          action: "Changement de mot de passe",
          details: `Changement de mot de passe réussi pour ${dbUser.name}`,
          ip: req.ip || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "unknown"
        }
      });

      res.json({ success: true, message: "Mot de passe modifié avec succès" });
    } catch (err: any) {
      console.error("Change password controller error:", err);
      res.status(500).json({ success: false, error: "Erreur interne" });
    }
  }

  public static async refresh(req: any, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: "Refresh token requis" });
      }

      const payload = AuthService.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ success: false, error: "Token de rafraîchissement invalide ou expiré" });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: { role: true }
      });

      if (!user || !user.active) {
        return res.status(401).json({ success: false, error: "Utilisateur non autorisé" });
      }

      const newAccessToken = AuthService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role.name
      });

      res.json({
        success: true,
        accessToken: newAccessToken
      });
    } catch (err: any) {
      console.error("Refresh token error:", err);
      res.status(500).json({ success: false, error: "Erreur interne" });
    }
  }
}
