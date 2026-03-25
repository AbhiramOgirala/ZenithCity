import { Server, Socket } from 'socket.io';
import { GoogleGenAI, Modality } from '@google/genai';

interface SessionInfo {
  session: any;
  creating: boolean;
  failCount: number;
  lastAttempt: number;
  exerciseType: string;
  // ── Gemini's own rep tracking ──
  geminiReps: number;
  geminiValidReps: number;
  geminiFormScores: number[];  // Collect all form scores for average
  lastFeedback: string;
}

const liveSessions = new Map<string, SessionInfo>();

const MAX_FAILURES = 5;
const BACKOFF_BASE_MS = 2000;
const MAX_BACKOFF_MS = 30000;

async function createLiveSession(ai: GoogleGenAI, userId: string, exerciseType: string, socket: Socket): Promise<any | null> {
  const existing = liveSessions.get(userId);

  if (existing?.creating) {
    return existing.session;
  }

  if (existing) {
    if (existing.failCount >= MAX_FAILURES) {
      console.log(`⚠️ Gemini Live disabled for user ${userId} after ${MAX_FAILURES} failures. Using local pose detection only.`);
      return null;
    }

    const backoff = Math.min(BACKOFF_BASE_MS * Math.pow(2, existing.failCount), MAX_BACKOFF_MS);
    const elapsed = Date.now() - existing.lastAttempt;
    if (elapsed < backoff) {
      return null;
    }
  }

  liveSessions.set(userId, {
    session: null,
    creating: true,
    failCount: existing?.failCount ?? 0,
    lastAttempt: Date.now(),
    exerciseType,
    geminiReps: existing?.geminiReps ?? 0,
    geminiValidReps: existing?.geminiValidReps ?? 0,
    geminiFormScores: existing?.geminiFormScores ?? [],
    lastFeedback: existing?.lastFeedback ?? '',
  });

  try {
    console.log(`Creating Gemini Live session for user ${userId} (attempt ${(existing?.failCount ?? 0) + 1})`);

    const session = await ai.live.connect({
      model: 'gemini-2.0-flash-exp',
      config: {
        responseModalities: [Modality.TEXT],
        systemInstruction: {
          parts: [{
            text: `You are a strict fitness AI coach.
The user is performing: ${exerciseType}.
Analyze the stream of images to evaluate form.
For every image frame you receive, respond strictly with JSON:
{
  "rep_completed_this_frame": boolean,
  "current_phase": "up"|"down"|"transition",
  "form_score": 0.0-1.0,
  "feedback": "string",
  "is_valid_form": boolean
}

CRITICAL RULES:
1. "rep_completed_this_frame" must ONLY be true once per full motion cycle (when they return to the start position).
2. NEVER set it to true if they just move their arms randomly or do partial reps.
3. If they perform an incorrect exercise altogether, give feedback but keep "rep_completed_this_frame: false".
4. Keep feedback brief (1-3 words) to prevent lag.
5. "is_valid_form" = true only when form_score >= 0.85 and the movement is correct.`
          }]
        }
      },
      callbacks: {
        onmessage: (e: any) => {
          try {
            const text = e.text;
            if (!text) return;

            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            const analysis = JSON.parse(cleanJson);

            // ── Track Gemini's own rep count ──
            const info = liveSessions.get(userId);
            if (info) {
              if (analysis.form_score !== undefined) {
                info.geminiFormScores.push(analysis.form_score);
              }
              info.lastFeedback = analysis.feedback || info.lastFeedback;

              if (analysis.rep_completed_this_frame) {
                info.geminiReps += 1;
                if (analysis.is_valid_form || analysis.form_score >= 0.85) {
                  info.geminiValidReps += 1;
                }
              }
            }

            // Still emit per-frame analysis for real-time UI feedback
            socket.emit('workout:analysis', {
              ...analysis,
              // Include running Gemini totals so frontend can display them
              gemini_total_reps: info?.geminiReps ?? 0,
              gemini_valid_reps: info?.geminiValidReps ?? 0,
            });
          } catch (err) {
            // Partial/malformed response — skip
          }
        },
        onclose: () => {
          console.log(`Gemini Live session closed for user ${userId}`);
          const info = liveSessions.get(userId);
          if (info) {
            // Keep rep data intact — just mark session as dead
            liveSessions.set(userId, {
              ...info,
              session: null,
              creating: false,
              failCount: info.failCount + 1,
              lastAttempt: Date.now(),
            });
          }
        }
      }
    });

    liveSessions.set(userId, {
      session,
      creating: false,
      failCount: 0,
      lastAttempt: Date.now(),
      exerciseType,
      geminiReps: existing?.geminiReps ?? 0,
      geminiValidReps: existing?.geminiValidReps ?? 0,
      geminiFormScores: existing?.geminiFormScores ?? [],
      lastFeedback: existing?.lastFeedback ?? '',
    });

    console.log(`✅ Gemini Live session active for user ${userId}`);
    return session;
  } catch (err) {
    console.error(`❌ Failed to create Gemini Live session for user ${userId}:`, err);
    const info = liveSessions.get(userId);
    liveSessions.set(userId, {
      session: null,
      creating: false,
      failCount: (info?.failCount ?? 0) + 1,
      lastAttempt: Date.now(),
      exerciseType,
      geminiReps: info?.geminiReps ?? 0,
      geminiValidReps: info?.geminiValidReps ?? 0,
      geminiFormScores: info?.geminiFormScores ?? [],
      lastFeedback: info?.lastFeedback ?? '',
    });
    return null;
  }
}

export function setupGeminiSocket(io: Server) {
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  if (!ai) {
    console.log('⚠️ No GEMINI_API_KEY set — Gemini Live disabled, using local MediaPipe only');
  }

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    socket.on('workout:frame', async ({ frame, exerciseType }) => {
      if (!userId || !ai) return;

      try {
        const info = liveSessions.get(userId);
        let session = info?.session;

        if (!session) {
          session = await createLiveSession(ai, userId, exerciseType, socket);
          if (!session) return;
        }

        // If exercise type changed mid-session, close old and start new
        if (info && info.exerciseType !== exerciseType && session) {
          try { session.close(); } catch {}
          liveSessions.delete(userId);
          session = await createLiveSession(ai, userId, exerciseType, socket);
          if (!session) return;
        }

        await session.sendRealtimeInput({
          mediaChunks: [{
            mimeType: 'image/jpeg',
            data: frame,
          }]
        });
      } catch (err: any) {
        const info = liveSessions.get(userId);
        if (info) {
          liveSessions.set(userId, {
            ...info,
            session: null,
            failCount: info.failCount + 1,
            lastAttempt: Date.now(),
          });
        }
      }
    });

    // ── Workout End: Send verification with Gemini's final counts ──
    socket.on('workout:end', async () => {
      if (!userId) return;
      const info = liveSessions.get(userId);

      if (info) {
        // Calculate average form score from all Gemini observations
        const avgFormScore = info.geminiFormScores.length > 0
          ? info.geminiFormScores.reduce((a, b) => a + b, 0) / info.geminiFormScores.length
          : 0;

        // Emit the final verification data to the frontend
        socket.emit('workout:verification', {
          gemini_total_reps: info.geminiReps,
          gemini_valid_reps: info.geminiValidReps,
          gemini_avg_form_score: Math.round(avgFormScore * 100) / 100,
          gemini_frames_analyzed: info.geminiFormScores.length,
          gemini_was_active: info.geminiFormScores.length > 0,
        });

        console.log(`📊 Workout verification for user ${userId}: Gemini counted ${info.geminiReps} total, ${info.geminiValidReps} valid reps (avg form: ${Math.round(avgFormScore * 100)}%)`);

        // Close the session
        if (info.session) {
          try { info.session.close(); } catch {}
        }
      } else {
        // No Gemini data — send empty verification
        socket.emit('workout:verification', {
          gemini_total_reps: 0,
          gemini_valid_reps: 0,
          gemini_avg_form_score: 0,
          gemini_frames_analyzed: 0,
          gemini_was_active: false,
        });
      }

      liveSessions.delete(userId);
    });

    socket.on('disconnect', () => {
      if (!userId) return;
      const info = liveSessions.get(userId);
      if (info?.session) {
        try { info.session.close(); } catch {}
      }
      liveSessions.delete(userId);
    });
  });
}
