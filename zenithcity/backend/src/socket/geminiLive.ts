import { Server, Socket } from 'socket.io';
import { GoogleGenAI, Modality } from '@google/genai';

const liveSessions = new Map<string, any>();

async function createLiveSession(ai: GoogleGenAI, userId: string, exerciseType: string, socket: Socket) {
  const session = await ai.live.connect({
    model: 'gemini-2.0-flash-exp', // Or the latest live model
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction: {
        parts: [{
          text: `You are a strict fitness AI coach.
The user is performing: ${exerciseType}.
Analyze the stream of images to evaluate form.
For every image frame you receive, respond strictly with JSON:
{
  "rep_completed_this_frame": boolean, // true ONLY on the exact frame a full rep finishes
  "current_phase": "up"|"down"|"transition",
  "form_score": 0.0-1.0,    // quality of current form
  "feedback": "string",     // real-time coaching tip
  "is_valid_form": boolean  // true if form is good enough to count
}

CRITICAL RULES:
1. "rep_completed_this_frame" must ONLY be true once per full motion cycle (when they return to the start position).
2. NEVER set it to true if they just move their arms randomly or do partial reps. Give feedback like "Full range of motion".
3. If they perform an incorrect exercise altogether, give feedback but keep "rep_completed_this_frame: false".
4. Keep feedback brief (1-3 words) to prevent lag.`
        }]
      }
    },
    callbacks: {
      onmessage: (e: any) => {
        try {
          const text = e.text;
          if (text) {
            // Strip markdown if exists
            const cleanJson = text.replace(/```json\n?|\n?```/g, '');
            const analysis = JSON.parse(cleanJson);
            socket.emit('workout:analysis', analysis);
          }
        } catch (err) {
          console.error('Failed to parse Gemini response:', err);
        }
      },
      onclose: () => {
        console.log(`Live session closed for user ${userId}`);
        liveSessions.delete(userId);
      }
    }
  });
  
  // Add to our session map
  liveSessions.set(userId, session);
  return session;
}

export function setupGeminiSocket(io: Server) {
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    socket.on('workout:frame', async ({ frame, exerciseType }) => {
      if (!userId || !ai) return;

      try {
        let session = liveSessions.get(userId);
        
        if (!session) {
          console.log(`Creating new Gemini Live session for user ${userId}`);
          session = await createLiveSession(ai, userId, exerciseType, socket);
        }

        // Send frame to Gemini
        await session.sendRealtimeInput({
          mediaChunks: [{
            mimeType: 'image/jpeg',
            data: frame, // base64 payload
          }]
        });
      } catch (err) {
        console.error(`Error sending frame to Gemini for user ${userId}:`, err);
      }
    });

    socket.on('workout:end', async () => {
      if (!userId) return;
      const session = liveSessions.get(userId);
      if (session) {
        session.close();
        liveSessions.delete(userId);
      }
    });

    socket.on('disconnect', () => {
      if (!userId) return;
      const session = liveSessions.get(userId);
      if (session) {
        session.close();
        liveSessions.delete(userId);
      }
    });
  });
}
