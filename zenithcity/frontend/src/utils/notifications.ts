/**
 * Browser notification system for workout reminders and alerts.
 * Uses the Notifications API (no external dependencies).
 */

/** Request notification permission from the browser */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/** Check if notifications are enabled */
export function isNotificationEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/** Send a browser notification */
export function sendNotification(title: string, body: string, icon?: string) {
  if (!isNotificationEnabled()) return;
  
  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'zenithcity',
      requireInteraction: false,
      silent: false,
    });
  } catch {
    // Notifications may fail in some environments
  }
}

/** Schedule a workout reminder (uses setTimeout for simplicity) */
let reminderTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleWorkoutReminder(delayMs: number = 4 * 60 * 60 * 1000) {
  // Cancel any existing reminder
  if (reminderTimer) clearTimeout(reminderTimer);

  reminderTimer = setTimeout(() => {
    sendNotification(
      '🏋️ Time to Work Out!',
      'Your city awaits! Complete a workout to keep your streak alive and grow your empire.',
    );
  }, delayMs);
}

export function cancelReminder() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
}

/** Send streak warning */
export function sendStreakWarning(currentStreak: number) {
  sendNotification(
    `🔥 ${currentStreak}-Day Streak at Risk!`,
    'Work out today to keep your streak going. Don\'t let your city decline!',
  );
}

/** Send city decline alert */
export function sendCityDeclineAlert() {
  sendNotification(
    '⚠️ City Decline Active',
    'Your buildings are taking damage! Complete a workout to halt the decay.',
  );
}

/** Send building unlock notification */
export function sendBuildingUnlockNotification(buildingName: string) {
  sendNotification(
    '🏗️ New Building Unlocked!',
    `${buildingName} has been constructed in your city!`,
  );
}
