import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function resolveSecret(envVar: string | undefined, label: string): string {
  if (envVar && envVar.trim().length > 0) return envVar;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${label} doit être défini via une variable d'environnement en production.`);
  }
  // Dev-only: random per-process secret (invalidates tokens on restart, never checked in).
  console.warn(`${label} non défini — génération d'un secret aléatoire de développement.`);
  return crypto.randomBytes(48).toString("hex");
}

const JWT_SECRET = resolveSecret(process.env.JWT_SECRET, "JWT_SECRET");
const JWT_REFRESH_SECRET = resolveSecret(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET");

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(user: { id: string; email: string; role: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "12h" }
    );
  }

  public static generateRefreshToken(user: { id: string; email: string }) {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
  }

  public static generateResetToken(user: { id: string; email: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, purpose: "password_reset" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  public static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    } catch (err) {
      return null;
    }
  }

  public static verifyResetToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; purpose: string };
      if (decoded && decoded.purpose === "password_reset") {
        return decoded;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  public static verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string; email: string };
    } catch (err) {
      return null;
    }
  }
}
