import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  options: { type: [String], required: true, validate: v => v.length === 4 },
  correctIndex: { type: Number, required: true, min: 0, max: 3, select: false },
  explanation: { type: String, required: true }
}, { _id: true });

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 120 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questions: { type: [questionSchema], required: true, validate: v => v.length >= 1 && v.length <= 30 }
}, { timestamps: true });

export default mongoose.model("Quiz", quizSchema);
