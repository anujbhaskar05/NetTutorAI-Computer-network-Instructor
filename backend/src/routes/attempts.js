import { Router } from "express";
import mongoose from "mongoose";
import requireAuth from "../middleware/requireAuth.js";
import Quiz from "../models/Quiz.js";
import TestAttempt from "../models/TestAttempt.js";

const router = Router();
router.use(requireAuth);

router.post("/submit", async (req, res, next) => {
  try {
    const { quizId, answers, durationSeconds } = req.body;
    if (!mongoose.isValidObjectId(quizId)) return res.status(400).json({ error: "Invalid test ID." });
    if (!Array.isArray(answers)) return res.status(400).json({ error: "Answers must be an array." });
    const quiz = await Quiz.findOne({ _id: quizId, createdBy: req.user.id }).select("+questions.correctIndex");
    if (!quiz) return res.status(404).json({ error: "Test not found." });
    if (answers.length !== quiz.questions.length) return res.status(400).json({ error: "Answer list does not match this test." });

    const submitted = new Map();
    for (const a of answers) {
      if (!a || !mongoose.isValidObjectId(a.questionId)) return res.status(400).json({ error: "Invalid answer data." });
      if (a.selectedIndex !== null && (!Number.isInteger(a.selectedIndex) || a.selectedIndex < 0 || a.selectedIndex > 3)) return res.status(400).json({ error: "Invalid answer option." });
      if (submitted.has(String(a.questionId))) return res.status(400).json({ error: "Duplicate question answer." });
      submitted.set(String(a.questionId), a.selectedIndex);
    }

    let correctCount = 0;
    const review = quiz.questions.map(q => {
      const selectedIndex = submitted.get(String(q._id)) ?? null;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount++;
      return { questionId: q._id, selectedIndex, isCorrect };
    });
    const totalQuestions = quiz.questions.length;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const answered = review.filter(a => a.selectedIndex !== null).length;
    const accuracyPercent = answered ? Math.round((correctCount / answered) * 100) : 0;
    const safeDuration = Number.isFinite(Number(durationSeconds)) ? Math.max(0, Math.min(7200, Math.floor(Number(durationSeconds)))) : 0;
    const attempt = await TestAttempt.create({
      user: req.user.id, quiz: quiz._id, quizTitle: quiz.title, topic: quiz.topic, difficulty: quiz.difficulty,
      totalQuestions, correctCount, scorePercent, accuracyPercent, durationSeconds: safeDuration,
      completed: true, answers: review
    });
    const questions = quiz.questions.map(q => ({
      id: q._id, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex,
      explanation: q.explanation, selectedIndex: submitted.get(String(q._id)) ?? null,
      isCorrect: (submitted.get(String(q._id)) ?? null) === q.correctIndex
    }));
    res.status(201).json({ result: { id: attempt._id, quizTitle: quiz.title, topic: quiz.topic,
      totalQuestions, correctCount, scorePercent, accuracyPercent, durationSeconds: safeDuration,
      submittedAt: attempt.submittedAt, questions } });
  } catch (e) { next(e); }
});

router.get("/my-results", async (req, res, next) => {
  try {
    const attempts = await TestAttempt.find({ user: req.user.id }).sort({ submittedAt: -1 }).limit(100)
      .select("quizTitle topic difficulty totalQuestions correctCount scorePercent accuracyPercent durationSeconds completed submittedAt");
    res.json({ attempts });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid attempt ID." });
    const attempt = await TestAttempt.findOne({ _id: req.params.id, user: req.user.id });
    if (!attempt) return res.status(404).json({ error: "Result not found." });
    const quiz = await Quiz.findById(attempt.quiz).select("+questions.correctIndex");
    const qMap = new Map((quiz?.questions || []).map(q => [String(q._id), q]));
    const questions = attempt.answers.map(a => {
      const q = qMap.get(String(a.questionId));
      return q ? { id: q._id, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex,
        explanation: q.explanation, selectedIndex: a.selectedIndex, isCorrect: a.isCorrect } : null;
    }).filter(Boolean);
    res.json({ result: { id: attempt._id, quizTitle: attempt.quizTitle, topic: attempt.topic, difficulty: attempt.difficulty,
      totalQuestions: attempt.totalQuestions, correctCount: attempt.correctCount, scorePercent: attempt.scorePercent,
      accuracyPercent: attempt.accuracyPercent, durationSeconds: attempt.durationSeconds, submittedAt: attempt.submittedAt, questions } });
  } catch (e) { next(e); }
});
export default router;
