'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  loadNotificationConfig,
  saveNotificationConfig,
  getNotificationPermission,
  requestNotificationPermission,
  fireReviewReminder,
  scheduleNotification,
  NotificationConfig,
} from '@/lib/notifications'

export default function NotificationSettings() {
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [dueCount, setDueCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    initialize()
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  const initialize = async () => {
    // Check permission status
    const perm = getNotificationPermission()
    setPermission(perm)

    // Load config
    const savedConfig = loadNotificationConfig()
    setConfig(savedConfig)

    // Fetch due word count
    try {
      const { count } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .lte('next_review', new Date().toISOString())

      setDueCount(count ?? 0)
    } catch (err) {
      console.error('Failed to fetch due count:', err)
    }

    setLoading(false)
  }

  const handlePermissionRequest = async () => {
    try {
      const perm = await requestNotificationPermission()
      setPermission(perm)
    } catch (err) {
      console.error('Permission request failed:', err)
    }
  }

  const handleConfigChange = (updates: Partial<NotificationConfig>) => {
    if (!config) return

    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    saveNotificationConfig(newConfig)

    // Reschedule if enabled
    if (newConfig.enabled && permission === 'granted') {
      if (cleanupRef.current) cleanupRef.current()

      cleanupRef.current = scheduleNotification(newConfig, async () => {
        try {
          const { count } = await supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .lte('next_review', new Date().toISOString())

          return count ?? 0
        } catch {
          return 0
        }
      })
    }
  }

  const testNotification = () => {
    fireReviewReminder(dueCount ?? 5)
  }

  if (loading || !config) {
    return <div className="text-sm text-[var(--ink-light)]">Loading notification settings...</div>
  }

  if (permission === 'unsupported') {
    return (
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-[var(--ink)]">Notifications not supported</h3>
            <p className="text-sm text-[var(--ink-light)] mt-1">
              Your browser doesn't support notifications. Try upgrading to a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={20} />
        <h3 className="font-semibold text-[var(--ink)]">Study Reminders</h3>
      </div>

      {/* Permission request */}
      {permission === 'default' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">Enable browser notifications to get study reminders</p>
          <Button onClick={handlePermissionRequest} variant="default" size="sm">
            Enable Notifications
          </Button>
        </div>
      )}

      {/* Permission denied */}
      {permission === 'denied' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Notification permission was denied. Please enable it in browser settings.
          </p>
        </div>
      )}

      {/* Settings (only if permission is granted) */}
      {permission === 'granted' && (
        <>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-[var(--ink)]">Enable daily reminders</span>
            </label>
          </div>

          {config.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Remind me at
                </label>
                <select
                  value={config.scheduledHour}
                  onChange={(e) => handleConfigChange({ scheduledHour: parseInt(e.target.value) })}
                  className="input w-full"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00 ({i < 12 ? 'AM' : 'PM'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                    Quiet hours from
                  </label>
                  <select
                    value={config.quietHoursStart}
                    onChange={(e) => handleConfigChange({ quietHoursStart: parseInt(e.target.value) })}
                    className="input w-full"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                    Until
                  </label>
                  <select
                    value={config.quietHoursEnd}
                    onChange={(e) => handleConfigChange({ quietHoursEnd: parseInt(e.target.value) })}
                    className="input w-full"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Button onClick={testNotification} variant="ghost" size="sm" className="w-full">
                  Test notification
                </Button>
              </div>

              <p className="text-xs text-[var(--ink-light)] italic">
                💡 Notifications only work while the app is open, or when installed as a PWA.
              </p>
            </>
          )}
        </>
      )}

      {dueCount !== null && (
        <div className="pt-3 border-t border-[var(--border)] text-xs text-[var(--ink-light)]">
          You have <strong>{dueCount}</strong> {dueCount === 1 ? 'word' : 'words'} due right now
        </div>
      )}
    </div>
  )
}
