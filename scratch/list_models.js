import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log("Available Models:");
    for (const m of models) {
      console.log(`- ${m.name}`);
    }
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
