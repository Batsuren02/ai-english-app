'use client'

import { useEffect, useState, useRef } from 'react'
import { Mic, Square } from 'lucide-react'
import { RecordingSession, checkSpeechSupport } from '@/lib/speech-utils'
import { Button } from '@/components/ui/button'
import { Word } from '@/lib/supabase'

interface AudioRecorderProps {
  word: Word
  onRecordingComplete: (blob: Blob) => void
}

export default function AudioRecorder({ word, onRecordingComplete }: AudioRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'error'>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<RecordingSession | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const support = checkSpeechSupport()

  useEffect(() => {
    if (!support.mediaRecorder) {
      setState('error')
      setError('Your browser does not support audio recording. Try Chrome, Edge, or Firefox.')
    }
  }, [support])

  const startRecording = async () => {
    try {
      setState('recording')
      setError(null)
      setDuration(0)

      sessionRef.current = new RecordingSession()
      await sessionRef.current.start()

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err: any) {
      setState('error')
      setError(err.message || 'Failed to start recording')
    }
  }

  const stopRecording = async () => {
    try {
      if (!sessionRef.current) return

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      const blob = await sessionRef.current.stop()
      setState('recorded')
      onRecordingComplete(blob)
    } catch (err: any) {
      setState('error')
      setError(err.message || 'Failed to stop recording')
    }
  }

  if (state === 'error' && error) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-100">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {state === 'idle' && (
        <Button
          onClick={startRecording}
          className="h-16 w-16 rounded-full bg-[var(--accent)] hover:opacity-90"
          title="Click to start recording"
        >
          <Mic size={24} />
        </Button>
      )}

      {state === 'recording' && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono text-sm text-[var(--ink-light)]">
              {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
            </span>
          </div>
          <Button
            onClick={stopRecording}
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
            title="Click to stop recording"
          >
            <Square size={24} className="fill-white" />
          </Button>
        </>
      )}

      {state === 'recorded' && (
        <div className="text-center text-sm text-[var(--ink-light)]">
          <p>✓ Recording complete ({duration}s)</p>
          <p className="text-xs mt-1">You can review and download below</p>
        </div>
      )}
    </div>
  )
}
