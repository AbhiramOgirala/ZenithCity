import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';

/**
 * Gemini Integration — ONE-SHOT verification only.
 * 
 * No Live streaming. MediaPipe handles all real-time rep counting on the frontend.
 * When the user ends a workout, the backend uses a single Gemini API call to
 * verify the workout summary (not video frames). This avoids:
 *   - Infinite session create/close loops
 *   - API quota burn from streaming 30fps
 *   - Interference with local MediaPipe rep counting
 */

interface WorkoutSummary {
  exerciseType: string;
  totalReps: number;
  validReps: number;
  avgFormScore: number;
  durationSeconds: number;
  recentFormScores: number[];
}

const pendingSummaries = new Map<string, WorkoutSummary>();

export function setupGeminiSocket(io: Server) {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  if (!ai) {
    console.log('⚠️ No GEMINI_API_KEY set — Gemini verification disabled, using local MediaPipe only');
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    // ── Receive workout progress updates (lightweight, no Gemini calls) ──
    socket.on('workout:progress', (data: Partial<WorkoutSummary>) => {
      if (!userId) return;
      const existing = pendingSummaries.get(userId) || {
        exerciseType: 'unknown',
        totalReps: 0,
        validReps: 0,
        avgFormScore: 1.0,
        durationSeconds: 0,
        recentFormScores: [],
      };
      pendingSummaries.set(userId, { ...existing, ...data });
    });

    // ── Workout End: One-shot Gemini verification ──
    socket.on('workout:end', async () => {
      if (!userId) return;

      const summary = pendingSummaries.get(userId);
      pendingSummaries.delete(userId);

      if (!ai || !summary || summary.totalReps === 0) {
        socket.emit('workout:verification', {
          gemini_total_reps: summary?.totalReps ?? 0,
          gemini_valid_reps: summary?.validReps ?? 0,
          gemini_avg_form_score: summary?.avgFormScore ?? 0,
          gemini_frames_analyzed: 0,
          gemini_was_active: false,
          gemini_feedback: 'Local AI only — no server verification available.',
        });
        return;
      }

      try {
        const prompt = `You are a strict fitness verification AI. A user just completed a workout. Analyze this data and determine if the rep count seems legitimate.

WORKOUT DATA:
- Exercise: ${summary.exerciseType}
- Total reps claimed: ${summary.totalReps}
- Valid reps claimed (form >= 85%): ${summary.validReps}
- Average form score: ${Math.round(summary.avgFormScore * 100)}%
- Duration: ${summary.durationSeconds} seconds
- Recent form scores: [${summary.recentFormScores.map(s => Math.round(s * 100) + '%').join(', ')}]

VERIFICATION RULES:
1. A typical rep takes 2-5 seconds depending on exercise type.
2. If total reps / duration suggests < 1.5 seconds per rep, they are likely inflated.
3. If valid reps > total reps, that's impossible.
4. Planks and cardio may have 0 reps (they're time-based).

Respond ONLY with this JSON (no markdown, no explanation):
{
  "verified_total_reps": number,
  "verified_valid_reps": number,
  "verified_form_score": 0.0-1.0,
  "is_legitimate": boolean,
  "feedback": "brief coaching tip"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const text = response.text ?? '';
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const verification = JSON.parse(cleanJson);

        console.log(`📊 Gemini verification for user ${userId}: ${verification.verified_valid_reps}/${verification.verified_total_reps} reps (legitimate: ${verification.is_legitimate})`);

        socket.emit('workout:verification', {
          gemini_total_reps: verification.verified_total_reps,
          gemini_valid_reps: verification.verified_valid_reps,
          gemini_avg_form_score: verification.verified_form_score,
          gemini_frames_analyzed: summary.recentFormScores.length,
          gemini_was_active: true,
          gemini_feedback: verification.feedback || '',
          gemini_is_legitimate: verification.is_legitimate,
        });
      } catch (err: any) {
        console.error(`❌ Gemini verification failed for user ${userId}:`, err.message);
        socket.emit('workout:verification', {
          gemini_total_reps: summary.totalReps,
          gemini_valid_reps: summary.validReps,
          gemini_avg_form_score: summary.avgFormScore,
          gemini_frames_analyzed: 0,
          gemini_was_active: false,
          gemini_feedback: 'Server verification unavailable — using local AI data.',
        });
      }
    });

    socket.on('disconnect', () => {
      if (userId) pendingSummaries.delete(userId);
    });
  });
}
