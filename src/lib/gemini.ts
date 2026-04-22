import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FoodItem } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `
You are a precision nutrition assistant. Analyze the user's food description and return a list of JSON objects representing the food items found.
Each object must have:
- name: string (the food name)
- calories: number (kcal)
- protein: number (grams)
- carbs: number (grams)
- fat: number (grams)
- servingSize: string (e.g. "1 medium", "100g")

If multiple items are found, return all of them. Use your best scientific estimates for values if not specific.
Response MUST be a valid JSON array of objects.
`;

export async function analyzeFood(query: string): Promise<FoodItem[]> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash"
  });

  const result = await model.generateContent([SYSTEM_PROMPT, query]);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Robustly find JSON content even if wrapped in markdown backticks
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    const rawItems = JSON.parse(cleanText);
    return rawItems.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return [];
  }
}
