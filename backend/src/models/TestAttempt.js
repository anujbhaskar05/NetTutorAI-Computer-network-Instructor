import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedIndex: { type: Number, min: 0, max: 3, default: null },
  isCorrect: { type: Boolean, required: true }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
  quizTitle: { type: String, required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  scorePercent: { type: Number, required: true, min: 0, max: 100 },
  accuracyPercent: { type: Number, required: true, min: 0, max: 100 },
  durationSeconds: { type: Number, required: true, min: 0 },
  completed: { type: Boolean, default: true },
  answers: { type: [answerSchema], required: true },
  submittedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

attemptSchema.index({ user: 1, submittedAt: -1 });
export default mongoose.model("TestAttempt", attemptSchema);
