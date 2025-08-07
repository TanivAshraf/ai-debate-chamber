// This is the file: app/api/debate/route.js
import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createHash } from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// Helper function to call the AI for a single debate turn
async function generateArgument(persona, topic, transcript) {
  const historyForPrompt = transcript.map(turn => 
    `${turn.persona}: "${turn.argument}"`
  ).join('\n\n');

  const prompt = `${persona.prompt}

The debate topic is: "${topic}"

Here is the debate transcript so far:
---
${historyForPrompt}
---

Based on the transcript, please provide your next argument. Make it concise, logical, and stay in character.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// The main function that orchestrates the entire debate
export async function POST(request) {
  try {
    const { topic } = await request.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "A topic is required." }), { status: 400 });
    }

    // Caching logic: check if this debate has been run before
    const cacheKey = `debate:${createHash('sha256').update(topic).digest('hex')}`;
    const cachedResult = await kv.get(cacheKey);
    if (cachedResult) {
      console.log("CACHE HIT");
      return new Response(JSON.stringify(cachedResult), { status: 200 });
    }
    console.log("CACHE MISS");

    // --- The Debate Setup ---
    const transcript = [];
    const NUM_ROUNDS = 2; // Each round has one argument from each side

    const personaA = {
      name: "Proponent",
      prompt: "You are a progressive sociologist and tech ethicist arguing FOR the debate topic. You believe in social progress, collective well-being, and the potential for technology to solve systemic problems. Your arguments should be principled and forward-looking."
    };
    const personaB = {
      name: "Opponent",
      prompt: "You are a pragmatic, fiscally conservative economist arguing AGAINST the debate topic. You believe in market-based solutions, individual responsibility, and are skeptical of large-scale interventions. Your arguments should be data-driven and focus on second-order consequences and economic viability."
    };

    // --- The Debate Loop ---
    for (let i = 0; i < NUM_ROUNDS; i++) {
      console.log(`Round ${i+1}: Proponent's turn`);
      const argumentA = await generateArgument(personaA, topic, transcript);
      transcript.push({ persona: personaA.name, argument: argumentA });
      
      console.log(`Round ${i+1}: Opponent's turn`);
      const argumentB = await generateArgument(personaB, topic, transcript);
      transcript.push({ persona: personaB.name, argument: argumentB });
    }

    // --- The Judgment ---
    console.log("Debate finished. Calling the judge.");
    const finalTranscript = transcript.map(turn => `${turn.persona}: "${turn.argument}"`).join('\n\n');
    const judgePrompt = `You are an impartial, expert debate judge. Read the entire debate transcript below. Your task is to declare a winner. Base your decision SOLELY on the logical consistency, evidence presented, and rhetorical strength of the arguments within this transcript. Do not use outside knowledge. Respond with a JSON object with the keys: "winner" ('Proponent' or 'Opponent') and "justification" (your reasoning in 2-3 sentences).

DEBATE TRANSCRIPT:
---
${finalTranscript}
---`;
    
    const judgeResult = await model.generateContent(judgePrompt);
    const judgeResponseText = judgeResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const judgment = JSON.parse(judgeResponseText);

    // Combine results and save to cache
    const finalResult = { transcript, judgment };
    await kv.set(cacheKey, finalResult, { ex: 86400 }); // Cache for 24 hours

    return new Response(JSON.stringify(finalResult), { status: 200 });

  } catch (error) {
    console.error("An error occurred in the debate:", error);
    return new Response(JSON.stringify({ error: error.message || "An internal server error occurred." }), { status: 500 });
  }
}
