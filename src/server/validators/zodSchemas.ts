import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(4, { message: "Le mot de passe doit contenir au moins 4 caractères" })
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Adresse email institutionnelle invalide" })
});

export const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6, { message: "Le nouveau mot de passe doit contenir au moins 6 caractères" })
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Le jeton de sécurité de réinitialisation est obligatoire" }),
  newPassword: z
    .string()
    .min(6, { message: "Le mot de passe doit comporter au moins 6 caractères" })
    .refine((val) => /[A-Z]/.test(val), {
      message: "Le mot de passe doit inclure au moins une lettre majuscule (ex: A-Z)"
    })
    .refine((val) => /[0-9]/.test(val), {
      message: "Le mot de passe doit inclure au moins un chiffre (ex: 0-9)"
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
      message: "Le mot de passe doit inclure au moins un caractère spécial (ex: !@#$%...)"
    })
});

export const recipeSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(3, { message: "La description est requise (min 3 caractères)" }),
  source: z.string().min(2, { message: "La source de financement est requise" }),
  amount: z.coerce.number().positive({ message: "Le montant doit être strictement positif" }),
  type: z.string().min(1, { message: "Le type de recette est requis" }),
  recordedBy: z.string().min(1),
  date: z.string().optional()
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(3, { message: "La description est requise" }),
  beneficiary: z.string().min(2, { message: "Le bénéficiaire est requis" }),
  amount: z.coerce.number().positive({ message: "Le montant doit être strictement positif" }),
  category: z.string(),
  date: z.string().min(4, { message: "La date est requise" }),
  status: z.string().optional(),
  recordedBy: z.string().min(1)
});

export const contactMessageSchema = z.object({
  senderName: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  senderEmail: z.string().email({ message: "Adresse email invalide" }),
  subject: z.string().min(3, { message: "Le sujet doit contenir au moins 3 caractères" }),
  message: z.string().min(10, { message: "Le message doit contenir au moins 10 caractères" })
});

export const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, { message: "Le titre doit faire au moins 5 caractères" }),
  content: z.string().min(10, { message: "Le contenu doit faire au moins 10 caractères" }),
  category: z.string().min(1),
  author: z.string(),
  image: z.string().optional(),
  date: z.string()
});

export const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5),
  status: z.string(),
  progress: z.coerce.number().min(0).max(100),
  startYear: z.coerce.number().int(),
  duration: z.string(),
  principalInvestigator: z.string(),
  description: z.string(),
  objectives: z.array(z.string()).or(z.string()),
  partners: z.array(z.string()).or(z.string()),
  budgetAmount: z.coerce.number().positive(),
  spentAmount: z.coerce.number().nonnegative(),
  lastUpdate: z.string()
});
