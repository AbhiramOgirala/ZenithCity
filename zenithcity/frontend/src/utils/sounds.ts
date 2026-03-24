/**
 * Sound effects for ZenithCity.
 * Uses Web Audio API to generate synth sounds — no external files needed.
 */

const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

/** Play a bright success chime (building unlock / workout complete) */
export function playSuccessSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    
    // Two-note ascending chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  } catch {}
}

/** Play a triumphant fanfare (streak milestone / leaderboard climb) */
export function playFanfareSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.25, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.6);
    });
  } catch {}
}

/** Play a coin / points earned sound  */
export function playPointsSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}

/** Play a building upgrade sound (deeper, more satisfying) */
export function playBuildingUpgradeSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    
    // Low rumble + high chime
    const bass = ac.createOscillator();
    const bassGain = ac.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(110, now);
    bass.frequency.exponentialRampToValueAtTime(220, now + 0.3);
    bassGain.gain.setValueAtTime(0.15, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bass.connect(bassGain).connect(ac.destination);
    bass.start(now);
    bass.stop(now + 0.6);

    // Chime
    setTimeout(() => {
      const chime = ac.createOscillator();
      const chimeGain = ac.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, ac.currentTime);
      chimeGain.gain.setValueAtTime(0.2, ac.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      chime.connect(chimeGain).connect(ac.destination);
      chime.start(ac.currentTime);
      chime.stop(ac.currentTime + 0.5);
    }, 200);
  } catch {}
}

/** Play a warning / decline sound */
export function playWarningSound() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;
    
    [440, 370].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      gain.gain.setValueAtTime(0.1, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.3);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.35);
    });
  } catch {}
}
