'use client'

import { useEffect, useState } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void
}

function ToastItem({ id, message, type, duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(id), 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const bgColor = {
    success: 'rgba(22, 163, 74, 0.1)',
    error: 'rgba(220, 38, 38, 0.1)',
    warning: 'rgba(217, 119, 6, 0.1)',
    info: 'rgba(37, 99, 235, 0.1)',
  }[type]

  const borderColor = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
  }[type]

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[type]

  const iconColor = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
  }[type]

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
        animation: isExiting ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-in',
        opacity: isExiting ? 0 : 1,
      }}
    >
      <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--ink)', fontSize: 14 }}>{message}</span>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(() => onClose(id), 300)
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-light)',
          padding: 0,
          display: 'flex',
        }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const add = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const success = (message: string, duration?: number) => add(message, 'success', duration)
  const error = (message: string, duration?: number) => add(message, 'error', duration)
  const warning = (message: string, duration?: number) => add(message, 'warning', duration)
  const info = (message: string, duration?: number) => add(message, 'info', duration)

  return {
    toasts,
    add,
    remove,
    success,
    error,
    warning,
    info,
  }
}
