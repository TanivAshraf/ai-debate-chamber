// This is a NEW file: app/api/logs/route.js
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Fetch the last 100 items from our debate_logs list
    const debateLogs = await kv.lrange('debate_logs', 0, 99);
    
    // Parse each item from string back into an object
    const logs = debateLogs.map((item) => JSON.parse(item));

    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return new Response(JSON.stringify({ error: "Could not fetch debate logs." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
