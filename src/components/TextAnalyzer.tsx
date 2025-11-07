"use client";

import { useState } from "react";

type DifficultyLevel = 'easy' | 'moderate' | 'challenging';

interface QuestionSet {
  multipleChoice: MultipleChoiceQuestion[];
  trueFalse: TrueFalseQuestion[];
  fillInTheBlank: FillInTheBlankQuestion[];
  identification: IdentificationQuestion[];
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

interface IdentificationQuestion {
  question: string;
  answer: string;
}

export default function TextAnalyzer() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("moderate");
  const [fileName, setFileName] = useState<string>("");
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'rule-based' | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

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
      setFileName(file.name);
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
        body: JSON.stringify({ text, difficulty }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze text");
      }

      const result = await response.json();
      console.log('📦 Full API Response:', result);
      console.log('📊 Metadata:', result.metadata);
      console.log('🔧 Generation Method:', result.metadata?.generationMethod);
      
      setQuestions(result.questions);
      setGenerationMethod(result.metadata?.generationMethod || null);
      
      // Log to console for user visibility
      if (result.metadata?.generationMethod === 'ai') {
        console.log('🤖 Questions generated using AI (Bytez.com GPT-4o-mini)');
      } else {
        console.log('📋 Questions generated using rule-based method (fallback)');
      }
      
      console.log('✅ State updated - generationMethod:', result.metadata?.generationMethod);
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
            Upload Document File
          </label>
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supports .txt, .pdf, and .docx files (max 10MB)
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Difficulty Level
          </label>
          <div className="flex gap-3">
            {(['easy', 'moderate', 'challenging'] as DifficultyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  difficulty === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {difficulty === 'easy' && '✓ Fewer questions, straightforward concepts'}
            {difficulty === 'moderate' && '✓ Balanced mix of question types and complexity'}
            {difficulty === 'challenging' && '✓ More questions, deeper analysis required'}
          </p>
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
          {/* Header with source info and generation method badge */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-blue-900">
                  📘 Source: {fileName || 'Direct Text Input'}
                </h2>
                <p className="text-sm text-blue-700 mt-1">
                  Difficulty: <span className="font-medium capitalize">{difficulty}</span> | 
                  Total Questions: {questions.multipleChoice.length + questions.trueFalse.length + 
                    questions.fillInTheBlank.length + questions.identification.length}
                </p>
              </div>
              
              {/* Generation Method Badge */}
              {generationMethod && (
                <div className={`ml-4 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  generationMethod === 'ai' 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                }`}>
                  {generationMethod === 'ai' ? (
                    <span className="flex items-center gap-1">
                      🤖 AI-Powered
                      <span className="text-[10px] opacity-75">(GPT-4o-mini)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      📋 Rule-Based
                      <span className="text-[10px] opacity-75">(Fallback)</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Multiple Choice Questions */}
          {questions.multipleChoice.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">
                🧩 Multiple Choice Questions
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
              <h2 className="text-2xl font-bold mb-4">✅ True/False Questions</h2>
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
                ✏️ Fill-in-the-Blank Questions
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

          {/* Identification Questions */}
          {questions.identification.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">
                🔍 Identification Questions
              </h2>
              {questions.identification.map((q, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border border-gray-200 rounded"
                >
                  <h3 className="font-semibold mb-2">
                    {index + 1}. {q.question}
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
