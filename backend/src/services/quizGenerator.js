import { GoogleGenAI } from "@google/genai";

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function generateQuiz({ topic, difficulty, count }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("AI quiz generation is not configured. Add GEMINI_API_KEY to the backend .env file.");
    error.status = 503;
    throw error;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: `Create exactly ${count} original multiple-choice questions for a Computer Networks learning test.
Topic: ${topic}
Difficulty: ${difficulty}
Return only valid JSON with this shape:
{"questions":[{"prompt":"question","options":["A","B","C","D"],"correctIndex":0,"explanation":"brief explanation"}]}
Requirements: four distinct options per question, exactly one correct answer, correctIndex is a zero-based integer from 0 to 3, no trick wording, technically accurate, no repeated questions, concise explanations.`
  });
  let parsed;
  try { parsed = parseJson(response.text || ""); } catch {
    const error = new Error("The AI returned an invalid quiz format. Please try again.");
    error.status = 502;
    throw error;
  }
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== count) {
    const error = new Error("The AI did not return the requested number of questions. Please try again.");
    error.status = 502;
    throw error;
  }
  const questions = parsed.questions.map(q => ({
    prompt: String(q.prompt || "").trim(),
    options: Array.isArray(q.options) ? q.options.map(v => String(v).trim()) : [],
    correctIndex: Number(q.correctIndex),
    explanation: String(q.explanation || "").trim()
  }));
  const valid = questions.every(q => q.prompt && q.options.length === 4 &&
    q.options.every(Boolean) && new Set(q.options).size === 4 &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3 && q.explanation);
  if (!valid) {
    const error = new Error("The AI generated one or more invalid questions. Please generate another quiz.");
    error.status = 502;
    throw error;
  }
  return questions;
}
