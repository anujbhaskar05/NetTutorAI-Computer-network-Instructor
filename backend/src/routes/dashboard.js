import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import TestAttempt from "../models/TestAttempt.js";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const attempts = await TestAttempt.find({ user: userId }).sort({ submittedAt: 1 })
      .select("quizTitle topic difficulty totalQuestions correctCount scorePercent accuracyPercent durationSeconds submittedAt answers");
    const count = attempts.length;
    const averageScore = count ? Math.round(attempts.reduce((s, a) => s + a.scorePercent, 0) / count) : 0;
    const highestScore = count ? Math.max(...attempts.map(a => a.scorePercent)) : 0;
    const totalQuestions = attempts.reduce((s, a) => s + a.totalQuestions, 0);
    const correctAnswers = attempts.reduce((s, a) => s + a.correctCount, 0);
    const totalDurationSeconds = attempts.reduce((s, a) => s + a.durationSeconds, 0);
    const trend = attempts.slice(-10).map((a, i) => ({
      label: `Test ${i + 1}`, score: a.scorePercent, date: a.submittedAt
    }));

    const topics = new Map();
    for (const a of attempts) {
      const t = topics.get(a.topic) || { topic: a.topic, attempts: 0, scoreTotal: 0, questions: 0, correct: 0 };
      t.attempts++;
      t.scoreTotal += a.scorePercent;
      t.questions += a.totalQuestions;
      t.correct += a.correctCount;
      topics.set(a.topic, t);
    }
    const topicPerformance = [...topics.values()].map(t => ({
      topic: t.topic, attempts: t.attempts,
      averageScore: Math.round(t.scoreTotal / t.attempts),
      accuracy: t.questions ? Math.round((t.correct / t.questions) * 100) : 0,
      status: t.scoreTotal / t.attempts >= 80 ? "Strong" : t.scoreTotal / t.attempts >= 60 ? "Developing" : "Needs practice"
    })).sort((a, b) => a.averageScore - b.averageScore);

    const questionStats = new Map();
    for (const a of attempts) {
      for (const answer of a.answers) {
        const key = `${a.topic}::${String(answer.questionId)}`;
        const item = questionStats.get(key) || { topic: a.topic, attempts: 0, correct: 0 };
        item.attempts++;
        if (answer.isCorrect) item.correct++;
        questionStats.set(key, item);
      }
    }
    const questionQuality = [...questionStats.values()].filter(q => q.attempts >= 2).map(q => ({
      topic: q.topic, attempts: q.attempts,
      correctnessRate: Math.round((q.correct / q.attempts) * 100)
    })).sort((a, b) => a.correctnessRate - b.correctnessRate).slice(0, 5);

    res.json({
      stats: { totalTestsAttempted: count, averageScore, highestScore,
        accuracy: totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        totalQuestionsAnswered: totalQuestions, totalTimeMinutes: Math.round(totalDurationSeconds / 60) },
      trend, topicPerformance, questionQuality,
      recentAttempts: attempts.slice(-8).reverse().map(a => ({
        id: a._id, quizTitle: a.quizTitle, topic: a.topic, difficulty: a.difficulty,
        scorePercent: a.scorePercent, correctCount: a.correctCount, totalQuestions: a.totalQuestions,
        submittedAt: a.submittedAt, durationSeconds: a.durationSeconds
      }))
    });
  } catch (e) { next(e); }
});
export default router;
