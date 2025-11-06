"use client";

import { useState } from "react";

interface QuestionSet {
  multipleChoice: MultipleChoiceQuestion[];
  trueFalse: TrueFalseQuestion[];
  fillInTheBlank: FillInTheBlankQuestion[];
}

interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TrueFalseQuestion {
  statement: string;
  answer: boolean;
}

interface FillInTheBlankQuestion {
  sentence: string;
  answer: string;
}

export default function SimpleTextAnalyzer() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeText = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }

    if (text.length < 50) {
      setError("Please enter at least 50 characters for meaningful analysis.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to analyze text");
      }

      const result = await response.json();
      setQuestions(result.questions);
    } catch (err: any) {
      setError(err.message || "Failed to analyze text. Please try again.");
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleText = () => {
    const sampleText = `Artificial intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks typically requiring human intelligence. Machine learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.

Deep learning is a specialized form of machine learning that uses neural networks with multiple layers to analyze and process data. These neural networks are inspired by the structure and function of the human brain. Deep learning has revolutionized many fields including computer vision, natural language processing, and speech recognition.

The applications of AI are vast and growing rapidly. In healthcare, AI systems can analyze medical images to detect diseases like cancer with remarkable accuracy. In transportation, autonomous vehicles use AI to navigate roads safely. In finance, AI algorithms detect fraudulent transactions and assess credit risks.

However, AI also presents challenges and ethical considerations. Issues such as job displacement, privacy concerns, and algorithmic bias need to be addressed as AI becomes more prevalent in society. Researchers and policymakers are working together to ensure that AI development is responsible and beneficial for humanity.`;

    setText(sampleText);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          AI Text Analysis & Question Generator
        </h1>
        <a
          href="/"
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Back to Dashboard
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Enter Text for Analysis</h2>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Text Content
            </label>
            <button
              onClick={loadSampleText}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Load Sample Text
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here for analysis... (minimum 50 characters)"
            className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          />
          <div className="text-xs text-gray-500 mt-1">
            Characters: {text.length} | Words:{" "}
            {text.split(/\s+/).filter((w) => w.length > 0).length}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={analyzeText}
          disabled={loading || !text.trim() || text.length < 50}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Generate Questions"}
        </button>
      </div>

      {questions && (
        <div className="space-y-6">
          {/* Multiple Choice Questions */}
          {questions.multipleChoice.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-blue-800">
                Multiple-Choice Questions
              </h2>
              {questions.multipleChoice.map((q, index) => (
                <div
                  key={index}
                  className="mb-6 p-4 border border-gray-200 rounded-lg"
                >
                  <h3 className="font-semibold mb-3 text-lg">
                    {index + 1}. {q.question}
                  </h3>
                  <div className="space-y-2 ml-4">
                    {q.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-start">
                        <span className="font-medium mr-3 text-blue-600">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span className="flex-1">{option}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <strong className="text-green-800">Correct Answer:</strong>
                    <span className="ml-2 font-semibold text-green-700">
                      {String.fromCharCode(65 + q.correctAnswer)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* True/False Questions */}
          {questions.trueFalse.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-green-800">
                True/False Questions
              </h2>
              {questions.trueFalse.map((q, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border border-gray-200 rounded-lg"
                >
                  <h3 className="font-semibold mb-3 text-lg">
                    {index + 1}. {q.statement}
                  </h3>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <strong className="text-blue-800">Answer:</strong>
                    <span
                      className={`ml-2 font-semibold ${
                        q.answer ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {q.answer ? "True" : "False"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fill-in-the-Blank Questions */}
          {questions.fillInTheBlank.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-purple-800">
                Fill-in-the-Blank Questions
              </h2>
              {questions.fillInTheBlank.map((q, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border border-gray-200 rounded-lg"
                >
                  <h3 className="font-semibold mb-3 text-lg">
                    {index + 1}. {q.sentence}
                  </h3>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <strong className="text-yellow-800">Answer:</strong>
                    <span className="ml-2 font-semibold text-yellow-700">
                      {q.answer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Generation Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-100 p-3 rounded">
                <div className="text-2xl font-bold text-blue-800">
                  {questions.multipleChoice.length}
                </div>
                <div className="text-sm text-blue-600">Multiple Choice</div>
              </div>
              <div className="bg-green-100 p-3 rounded">
                <div className="text-2xl font-bold text-green-800">
                  {questions.trueFalse.length}
                </div>
                <div className="text-sm text-green-600">True/False</div>
              </div>
              <div className="bg-purple-100 p-3 rounded">
                <div className="text-2xl font-bold text-purple-800">
                  {questions.fillInTheBlank.length}
                </div>
                <div className="text-sm text-purple-600">Fill-in-the-Blank</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
