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

export default function TextAnalyzer() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      // Send file to server for processing
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process file");
      }

      const result = await response.json();
      setText(result.text);
    } catch (err: any) {
      setError(err.message || "Failed to process file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) {
      setError("Please enter or upload some text to analyze.");
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
        throw new Error("Failed to analyze text");
      }

      const result = await response.json();
      setQuestions(result.questions);
    } catch (err) {
      setError("Failed to analyze text. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        AI Text Analysis & Question Generator
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload or Enter Text</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Text File (.txt)
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Currently supports TXT files (max 10MB). PDF and DOCX support coming
            soon!
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or Enter Text Directly
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here for analysis..."
            className="w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={analyzeText}
          disabled={loading || !text.trim()}
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
              <h2 className="text-2xl font-bold mb-4">
                Multiple-Choice Questions
              </h2>
              {questions.multipleChoice.map((q, index) => (
                <div
                  key={index}
                  className="mb-6 p-4 border border-gray-200 rounded"
                >
                  <h3 className="font-semibold mb-3">
                    {index + 1}. {q.question}
                  </h3>
                  <div className="space-y-2">
                    {q.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center">
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <strong>Answer:</strong>{" "}
                    {String.fromCharCode(65 + q.correctAnswer)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* True/False Questions */}
          {questions.trueFalse.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">True/False Questions</h2>
              {questions.trueFalse.map((q, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border border-gray-200 rounded"
                >
                  <h3 className="font-semibold mb-2">
                    {index + 1}. {q.statement}
                  </h3>
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <strong>Answer:</strong> {q.answer ? "True" : "False"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fill-in-the-Blank Questions */}
          {questions.fillInTheBlank.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">
                Fill-in-the-Blank Questions
              </h2>
              {questions.fillInTheBlank.map((q, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border border-gray-200 rounded"
                >
                  <h3 className="font-semibold mb-2">
                    {index + 1}. {q.sentence}
                  </h3>
                  <div className="mt-3 p-2 bg-green-50 rounded">
                    <strong>Answer:</strong> {q.answer}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
