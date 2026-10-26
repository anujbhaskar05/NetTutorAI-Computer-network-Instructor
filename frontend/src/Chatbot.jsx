
import React, { useState } from "react";
import api from "./api.js";
import "./chatbot.css";

export default function Chatbot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const question = message.trim();
    if (!question || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
    ]);

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: question,
      });

      const reply =
        response.data.reply ??
        response.data.answer ??
        response.data.response;

      if (!reply) {
        throw new Error("The server returned no answer.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: reply },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Unable to connect to NetTutor AI."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatbot-page">
      <div className="chatbot-header">
        <h1>NetTutor AI Instructor</h1>
        <p>
          Ask questions about Computer Networks and prepare for exams.
        </p>
      </div>

      <div className="chatbot-window">
        {messages.length === 0 && (
          <div className="chatbot-welcome">
            <h2>What would you like to learn?</h2>
            <p>Try asking: "Explain the OSI model."</p>
          </div>
        )}

        {messages.map((item, index) => (
          <div
            key={index}
            className={`chatbot-message ${
              item.role === "user"
                ? "chatbot-user"
                : "chatbot-assistant"
            }`}
          >
            <strong>
              {item.role === "user" ? "You" : "NetTutor AI"}
            </strong>
            <p>{item.text}</p>
          </div>
        ))}

        {loading && (
          <p className="chatbot-loading">
            NetTutor AI is thinking...
          </p>
        )}

        <div aria-live="polite">
          {error && (
            <p className="chatbot-error">{error}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="chatbot-form">
        <input
          className="chatbot-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a Computer Networks question..."
          maxLength={2000}
          disabled={loading}
        />

        <button
          className="chatbot-send"
          type="submit"
          disabled={loading || !message.trim()}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
