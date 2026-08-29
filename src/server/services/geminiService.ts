import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private static getAIInstance(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Clé API Gemini non configurée (veuillez l'ajouter dans Settings > Secrets)");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }

  /**
   * Helper to execute Gemini generateContent with automatic retry and model fallback
   */
  private static async generateWithRetry(contents: any, config: any) {
    const ai = this.getAIInstance();
    const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = typeof err === "string" ? err : err?.message || JSON.stringify(err);
          const is503 = err?.status === 503 || err?.code === 503 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand");
          const is429 = err?.status === 429 || err?.code === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");

          console.warn(`Gemini call failed [model: ${model}, attempt: ${attempt}]:`, errMsg);

          if (is503 || is429) {
            // Wait briefly before retrying or switching model
            await new Promise((res) => setTimeout(res, 1200 * attempt));
          } else {
            // Non-transient error, try next model or break
            break;
          }
        }
      }
    }

    // Format human-friendly error if high demand or unavailable
    const finalMsg = typeof lastError === "string" ? lastError : lastError?.message || JSON.stringify(lastError);
    if (finalMsg.includes("503") || finalMsg.includes("UNAVAILABLE") || finalMsg.includes("high demand")) {
      throw new Error("Le service IA Gemini connaît actuellement une forte affluence temporaire (Erreur 503). Veuillez réessayer dans quelques secondes.");
    }
    if (finalMsg.includes("429") || finalMsg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Limite de requêtes atteinte pour le service IA. Veuillez patienter quelques instants avant de réessayer.");
    }

    throw new Error(finalMsg || "Une erreur est survenue lors du traitement avec l'IA Gemini.");
  }

  /**
   * Scan and extract structured financial fields from receipt images
   */
  public static async scanReceiptImage(imageBase64: string, mimeType: string) {
    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    };

    const promptPart = {
      text: "Analyse cette facture ou pièce justificative de dépenses pour en extraire les informations financières de manière très précise. Traduis en français si nécessaire, et convertis le montant en USD si applicable (ex: si le reçu est en francs congolais CDF, estime sa valeur en USD avec le taux de change 1 USD = 2800 CDF). Choisis rigoureusement l'une des catégories de budget parmi : 'Matériel', 'Logistique', 'Recherche', 'RH', 'Autre'.",
    };

    const response = await this.generateWithRetry(
      { parts: [imagePart, promptPart] },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "Libellé de la dépense ou objet de l'achat (ex: 'Achat d'équipements informatiques')",
            },
            amount: {
              type: Type.NUMBER,
              description: "Montant total en USD, converti si nécessaire. Doit être un nombre décimal ou entier.",
            },
            beneficiary: {
              type: Type.STRING,
              description: "Bénéficiaire du paiement ou nom du magasin/fournisseur (ex: 'Ets. Mwamba')",
            },
            category: {
              type: Type.STRING,
              description: "Catégorie de budget correspondante parmi exactement : 'Matériel', 'Logistique', 'Recherche', 'RH', 'Autre'",
            },
          },
          required: ["description", "amount", "beneficiary", "category"],
        },
      }
    );

    const text = response.text;
    if (!text) {
      throw new Error("Aucun texte retourné par le modèle d'IA");
    }

    return JSON.parse(text);
  }

  /**
   * Scan and extract structured line items and summaries from financial reports in PDF
   */
  public static async scanFinancialPdf(pdfBase64: string) {
    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    };

    const promptPart = {
      text: "Analyse ce rapport financier ou historique de dépenses au format PDF. " +
            "S'il y a un tableau ou une liste de dépenses, extrais chaque ligne de dépense individuelle avec précision. " +
            "Convertis tous les montants en USD de façon rigoureuse. Si le rapport mentionne d'autres devises, " +
            "utilise le taux de change adéquat (ex: 1 USD = 2800 CDF pour le Franc Congolais). " +
            "Pour chaque dépense extraite, choisis obligatoirement l'une des catégories de budget parmi : 'Matériel', 'Logistique', 'Recherche', 'RH', 'Autre'. " +
            "Rédige aussi un court résumé du document en français.",
    };

    const response = await this.generateWithRetry(
      { parts: [pdfPart, promptPart] },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Résumé concis en français du rapport financier ou de l'historique de dépenses analysé."
            },
            expenses: {
              type: Type.ARRAY,
              description: "Tableau contenant la liste des dépenses individuelles détectées dans le PDF.",
              items: {
                type: Type.OBJECT,
                properties: {
                  description: {
                    type: Type.STRING,
                    description: "Libellé de la dépense ou objet de l'achat"
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Montant net de la dépense en USD (valeur numérique positive)"
                  },
                  beneficiary: {
                    type: Type.STRING,
                    description: "Bénéficiaire ou fournisseur de la dépense"
                  },
                  category: {
                    type: Type.STRING,
                    description: "Une des catégories : 'Matériel', 'Logistique', 'Recherche', 'RH', 'Autre'"
                  },
                  date: {
                    type: Type.STRING,
                    description: "Date de la dépense (format YYYY-MM-DD)"
                  }
                },
                required: ["description", "amount", "category"]
              }
            }
          },
          required: ["summary", "expenses"]
        }
      }
    );

    const text = response.text;
    if (!text) {
      throw new Error("Aucun texte retourné par le modèle d'IA pour le rapport PDF");
    }

    return JSON.parse(text);
  }
}

