import { Router } from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/requireAuth.js";
import Quiz from "../models/Quiz.js";
import TestAttempt from "../models/TestAttempt.js";
import { generateQuiz } from "../services/quizGenerator.js";

const router = Router();
router.use(requireAuth);

router.post("/generate", async (req, res, next) => {
  try {
    const topic = String(req.body.topic || "").trim().slice(0, 100);
    const difficulty = String(req.body.difficulty || "Medium");
    const count = Number(req.body.count || 10);
    const durationMinutes = Number(req.body.durationMinutes || 15);
    if (topic.length < 2) return res.status(400).json({ error: "Enter a topic with at least 2 characters." });
    if (!["Easy", "Medium", "Hard"].includes(difficulty)) return res.status(400).json({ error: "Choose a valid difficulty." });
    if (!Number.isInteger(count) || count < 5 || count > 20) return res.status(400).json({ error: "Question count must be between 5 and 20." });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 120) return res.status(400).json({ error: "Duration must be between 1 and 120 minutes." });
    const questions = await generateQuiz({ topic, difficulty, count });
    const quiz = await Quiz.create({
      title: `${topic} — ${difficulty} Test`, topic, difficulty, durationMinutes,
      createdBy: req.user.id, questions
    });
    res.status(201).json({ quiz: {
      id: quiz._id, title: quiz.title, topic: quiz.topic, difficulty: quiz.difficulty,
      durationMinutes: quiz.durationMinutes,
      questions: quiz.questions.map(q => ({ id: q._id, prompt: q.prompt, options: q.options }))
    }});
  } catch (e) { next(e); }
});

router.get("/", async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).select("title topic difficulty durationMinutes createdAt questions");
    const ids = quizzes.map(q => q._id);
    const counts = await TestAttempt.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id), quiz: { $in: ids } } },
      { $group: { _id: "$quiz", attempts: { $sum: 1 }, averageScore: { $avg: "$scorePercent" } } }
    ]);
    const byQuiz = new Map(counts.map(c => [String(c._id), c]));
    res.json({ quizzes: quizzes.map(q => {
      const stats = byQuiz.get(String(q._id));
      return { id: q._id, title: q.title, topic: q.topic, difficulty: q.difficulty, durationMinutes: q.durationMinutes,
        questionCount: q.questions.length, createdAt: q.createdAt, attempts: stats?.attempts || 0,
        averageScore: stats ? Math.round(stats.averageScore) : null };
    })});
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!quiz) return res.status(404).json({ error: "Test not found." });
    res.json({ quiz: { id: quiz._id, title: quiz.title, topic: quiz.topic, difficulty: quiz.difficulty,
      durationMinutes: quiz.durationMinutes, questions: quiz.questions.map(q => ({ id: q._id, prompt: q.prompt, options: q.options })) } });
  } catch (e) { next(e); }
});
export default router;
