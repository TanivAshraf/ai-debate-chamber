"use client";

import { useState } from "react";

// --- THE FIX: We are defining the exact "shape" of our data ---
interface Turn {
  persona: string;
  argument: string;
}

interface Judgment {
  winner: string;
  justification: string;
}

interface DebateResult {
  transcript: Turn[];
  judgment: Judgment;
}
// --- END FIX ---

export default function HomePage() {
  const [topic, setTopic] = useState("");
  
  // --- THE FIX: We tell TypeScript the state can be DebateResult OR null ---
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // --- THE FIX: We tell TypeScript the state can be a string OR null ---
  const [error, setError] = useState<string | null>(null);

  const handleDebate = async () => {
    setIsLoading(true);
    setError(null);
    setDebateResult(null);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }
      setDebateResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen p-4 sm:p-8 bg-gray-900 text-white">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-center text-cyan-400">Dialectica</h1>
        <p className="mt-2 text-center text-gray-400">The AI Debate Chamber</p>

        <div className="w-full mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a controversial topic..."
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
          />
          <button
            onClick={handleDebate}
            disabled={isLoading || !topic}
            className="w-full px-4 py-3 mt-4 font-semibold text-gray-900 bg-cyan-400 rounded-md shadow-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Debating..." : "Start Debate"}
          </button>
        </div>

        {isLoading && <div className="mt-8 text-center"><p className="mt-2 text-gray-400">The debaters are taking the stage... This may take a minute.</p></div>}
        {error && <div className="mt-6 text-red-400 bg-red-900 bg-opacity-30 p-4 rounded-md w-full font-medium">{error}</div>}
        
        {debateResult && (
          <div className="w-full mt-8">
            {/* The Transcript */}
            <div className="space-y-6">
              {debateResult.transcript.map((turn, index) => (
                <div key={index} className={`flex flex-col ${turn.persona === 'Proponent' ? 'items-start' : 'items-end'}`}>
                  <div className={`p-4 rounded-lg max-w-xl ${turn.persona === 'Proponent' ? 'bg-blue-900 bg-opacity-40' : 'bg-purple-900 bg-opacity-40'}`}>
                    <p className={`font-bold ${turn.persona === 'Proponent' ? 'text-blue-300' : 'text-purple-300'}`}>{turn.persona}</p>
                    <p className="mt-1 text-gray-300 whitespace-pre-wrap">{turn.argument}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* The Judgment */}
            <div className="mt-12 p-6 bg-gray-800 border-2 border-yellow-500 rounded-lg shadow-2xl">
              <h2 className="text-2xl font-bold text-center text-yellow-400">The Verdict</h2>
              <p className="mt-4 text-center text-xl font-semibold">Winner: <span className="text-yellow-300">{debateResult.judgment.winner}</span></p>
              <p className="mt-2 text-center text-gray-400 italic">Justification:</p>
              <p className="mt-2 text-center text-gray-300">{debateResult.judgment.justification}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
