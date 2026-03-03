/**
 * Browser Speech API utilities for pronunciation practice.
 * Uses MediaRecorder for audio capture and Web Audio API for visualization.
 */

export type SpeechSupport = {
  mediaRecorder: boolean
  speechRecognition: boolean
  speechSynthesis: boolean
}

export type RecordingState = 'idle' | 'recording' | 'recorded' | 'error'

/**
 * Check what speech APIs are supported by the browser.
 */
export function checkSpeechSupport(): SpeechSupport {
  return {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    speechRecognition:
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition !== undefined || (window as any).webkitSpeechRecognition !== undefined),
    speechSynthesis: typeof window !== 'undefined' && window.speechSynthesis !== undefined,
  }
}

/**
 * Wrapper for MediaRecorder lifecycle.
 * Handles mic permission, recording, and blob generation.
 */
export class RecordingSession {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []

  async start(): Promise<void> {
    try {
      // Request mic permission
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create MediaRecorder with best available codec
      const options = { mimeType: 'audio/webm' }
      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.chunks = []

      // Collect audio chunks
      this.mediaRecorder.addEventListener('dataavailable', (e) => {
        this.chunks.push(e.data)
      })

      this.mediaRecorder.start()
    } catch (err: any) {
      throw new Error(`Recording failed: ${err.message}`)
    }
  }

  async stop(): Promise<Blob> {
    if (!this.mediaRecorder) {
      throw new Error('Recording not started')
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.addEventListener('stop', () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' })
        this.stopStream()
        resolve(blob)
      })

      this.mediaRecorder!.addEventListener('error', (e) => {
        this.stopStream()
        reject(new Error(`Recording error: ${e.error}`))
      })

      this.mediaRecorder!.stop()
    })
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }
}

/**
 * Extract waveform data from audio blob for visualization.
 * Returns normalized samples [-1, 1] downsampled to specified point count.
 */
export async function buildWaveformData(blob: Blob, pointCount: number = 200): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  // Resume audio context if suspended (required on some browsers)
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Get mono channel (mix stereo to mono if needed)
  const channelData =
    audioBuffer.numberOfChannels === 1
      ? audioBuffer.getChannelData(0)
      : audioBuffer.getChannelData(0) // Use left channel for stereo

  // Downsample to requested point count
  const samples = downsample(channelData, pointCount)

  return samples
}

/**
 * Downsample audio samples to a target point count.
 * Uses max-pooling to preserve peaks.
 */
function downsample(samples: Float32Array, targetPoints: number): Float32Array {
  if (samples.length <= targetPoints) {
    return samples
  }

  const result = new Float32Array(targetPoints)
  const blockSize = Math.ceil(samples.length / targetPoints)

  for (let i = 0; i < targetPoints; i++) {
    let max = 0
    const start = i * blockSize
    const end = Math.min(start + blockSize, samples.length)

    for (let j = start; j < end; j++) {
      max = Math.max(max, Math.abs(samples[j]))
    }

    result[i] = max
  }

  return result
}

/**
 * Capture speech transcription using Web Speech API.
 * Returns transcript and confidence score.
 */
export async function captureTranscript(language: string = 'en-US'): Promise<{ transcript: string; confidence: number }> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      reject(new Error('Speech Recognition not supported'))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.language = language
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      let transcript = ''
      let maxConfidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        transcript += result[0].transcript + ' '
        maxConfidence = Math.max(maxConfidence, result[0].confidence)
      }

      resolve({
        transcript: transcript.trim(),
        confidence: maxConfidence,
      })
    }

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`))
    }

    recognition.start()
  })
}

/**
 * Download audio blob as a file.
 */
export function downloadRecording(blob: Blob, filename: string = 'recording.webm'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Convert blob to data URL for preview playback.
 */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Use browser TTS to speak a word.
 */
export function speakWord(word: string, language: string = 'en-US'): void {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(word)
  ;(utterance as any).language = language
  utterance.rate = 0.8 // Slower for clarity
  window.speechSynthesis.speak(utterance)
}
