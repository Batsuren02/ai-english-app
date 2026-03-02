/**
 * Web Notifications API utilities for study reminders.
 * Handles permissions, scheduling, and local storage of notification config.
 */

export type NotificationConfig = {
  enabled: boolean
  scheduledHour: number           // 0-23, default 9 (9am)
  quietHoursStart: number         // 0-23, default 22 (10pm)
  quietHoursEnd: number           // 0-23, default 7 (7am)
  frequency: 'daily' | 'twice_daily'
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: false,
  scheduledHour: 9,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  frequency: 'daily',
}

/**
 * Check browser notification support and current permission status.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Request notification permission from user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  return await Notification.requestPermission()
}

/**
 * Fire a notification immediately.
 */
export function fireReviewReminder(dueCount: number): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification('Time to study! 📚', {
    body: `You have ${dueCount} ${dueCount === 1 ? 'word' : 'words'} due for review`,
    icon: '/icon-192.png',
    tag: 'review-reminder',
    requireInteraction: false,
  })

  // Click handler: open the learn page
  notification.onclick = () => {
    window.location.href = '/learn'
    notification.close()
  }
}

/**
 * Check if current time is within quiet hours.
 */
export function isInQuietHours(config: NotificationConfig, nowHour?: number): boolean {
  const currentHour = nowHour ?? new Date().getHours()

  if (config.quietHoursStart < config.quietHoursEnd) {
    // Normal range (no midnight wrap), e.g., 8am–8pm
    return currentHour >= config.quietHoursStart && currentHour < config.quietHoursEnd
  } else {
    // Wrapped around midnight, e.g., 10pm–7am
    return currentHour >= config.quietHoursStart || currentHour < config.quietHoursEnd
  }
}

/**
 * Schedule notification checks at the configured hour.
 * Returns a cleanup function to cancel the scheduler.
 */
export function scheduleNotification(
  config: NotificationConfig,
  getDueCount: () => Promise<number>
): () => void {
  let timeoutId: NodeJS.Timeout | null = null

  const scheduleNext = async () => {
    const now = new Date()
    const targetTime = new Date()
    targetTime.setHours(config.scheduledHour, 0, 0, 0)

    // If target time has passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }

    const msUntil = targetTime.getTime() - now.getTime()

    timeoutId = setTimeout(async () => {
      try {
        // Check if in quiet hours
        if (!isInQuietHours(config)) {
          const dueCount = await getDueCount()
          if (dueCount > 0) {
            fireReviewReminder(dueCount)
          }
        }

        // Reschedule for next day
        await scheduleNext()
      } catch (err) {
        console.error('Notification scheduler error:', err)
        // Retry on next scheduled time
        await scheduleNext()
      }
    }, msUntil)
  }

  // Start the scheduler
  scheduleNext()

  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
}

/**
 * Save notification config to localStorage.
 */
export function saveNotificationConfig(config: NotificationConfig): void {
  try {
    localStorage.setItem('notification_config', JSON.stringify(config))
  } catch (err) {
    console.error('Failed to save notification config:', err)
  }
}

/**
 * Load notification config from localStorage.
 */
export function loadNotificationConfig(): NotificationConfig {
  try {
    const saved = localStorage.getItem('notification_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        enabled: parsed.enabled ?? DEFAULT_NOTIFICATION_CONFIG.enabled,
        scheduledHour: parsed.scheduledHour ?? DEFAULT_NOTIFICATION_CONFIG.scheduledHour,
        quietHoursStart: parsed.quietHoursStart ?? DEFAULT_NOTIFICATION_CONFIG.quietHoursStart,
        quietHoursEnd: parsed.quietHoursEnd ?? DEFAULT_NOTIFICATION_CONFIG.quietHoursEnd,
        frequency: parsed.frequency ?? DEFAULT_NOTIFICATION_CONFIG.frequency,
      }
    }
  } catch (err) {
    console.error('Failed to load notification config:', err)
  }

  return DEFAULT_NOTIFICATION_CONFIG
}
