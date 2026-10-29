import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import authRoutes from "./src/routes/auth.js";
import quizRoutes from "./src/routes/quizzes.js";
import attemptRoutes from "./src/routes/attempts.js";
import dashboardRoutes from "./src/routes/dashboard.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedOrigins = [
  "http://localhost:5173",
  "https://net-tutor-ai-frontend-nlv7-two.vercel.app",
  ...(process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ message: "NetTutor AI backend is running" }));
app.post("/api/chat", async (req, res, next) => {
  try {
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "Please enter a question." });
    if (message.length > 2000) return res.status(400).json({ error: "Your question must be under 2000 characters." });
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "Chatbot AI is not configured." });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      contents: message,
      config: { systemInstruction: "You are NetTutor AI, a friendly Computer Networks teacher.Rules:- Use simple English.- Keep answers between 50 and 100 words.- Use short headings and bullet points.-Explain concepts for beginners.- Give one simple example when useful.- Avoid long paragraphs and unnecessary details.- For exam questions, give short, exam-ready answers.- Answer only Computer Networks questions." }
    });
    res.json({ reply: response.text || "Sorry, I could not generate an answer." });
  } catch (e) { next(e); }
});
app.get("/api/health", (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong." });
});


if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI. Copy .env.example to .env and configure it.");
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a random string of at least 32 characters.");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set; AI quiz generation will not work.");
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("MongoDB connected");
app.listen(PORT, () => console.log(`NetTutor AI API listening at http://localhost:${PORT}`));
