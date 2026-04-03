import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[Gemini] GEMINI_API_KEY not set — AI features will use fallback responses.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateText(prompt: string): Promise<string> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}
