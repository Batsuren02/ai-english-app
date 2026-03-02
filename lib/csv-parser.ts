import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Word } from './supabase'

export interface ParsedWord {
  word: string
  definition: string
  mongolian: string
  part_of_speech?: string
  ipa?: string
  cefr_level?: string
  examples?: string[]
  word_family?: string[]
  collocations?: string[]
  confused_with?: string[]
  etymology_hint?: string
  category?: string
  goal_tag?: string
  notes?: string
}

interface CSVRow {
  [key: string]: string
}

/**
 * Parse CSV file and convert to Word objects
 */
export async function parseCSV(file: File): Promise<{
  words: ParsedWord[]
  errors: string[]
  skipped: number
}> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      complete: (results: { data: CSVRow[]; errors: Papa.ParseError[] }) => {
        const { data, errors: parseErrors } = results
        const words: ParsedWord[] = []
        const errors: string[] = []
        let skipped = 0

        if (parseErrors.length > 0) {
          parseErrors.forEach((e) => {
            errors.push(`Row ${e.row}: ${e.message}`)
          })
        }

        // Skip header row
        const rows = data.slice(1) as CSVRow[]

        rows.forEach((row, index) => {
          const validation = validateWordRow(row)
          if (!validation.valid) {
            errors.push(`Row ${index + 2}: ${validation.error}`)
            skipped++
            return
          }

          const word = mapRowToWord(row)
          if (word) {
            words.push(word)
          } else {
            skipped++
          }
        })

        resolve({ words, errors, skipped })
      },
      header: false,
      skipEmptyLines: true,
    })
  })
}

/**
 * Parse XLSX file and convert to Word objects
 */
export async function parseXLSX(file: File): Promise<{
  words: ParsedWord[]
  errors: string[]
  skipped: number
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<CSVRow>(worksheet)

        const words: ParsedWord[] = []
        const errors: string[] = []
        let skipped = 0

        rows.forEach((row, index) => {
          const validation = validateWordRow(row)
          if (!validation.valid) {
            errors.push(`Row ${index + 2}: ${validation.error}`)
            skipped++
            return
          }

          const word = mapRowToWord(row)
          if (word) {
            words.push(word)
          } else {
            skipped++
          }
        })

        resolve({ words, errors, skipped })
      } catch (err) {
        reject(new Error(`Failed to parse XLSX: ${err instanceof Error ? err.message : 'Unknown error'}`))
      }
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Validate that a row has required fields
 */
export function validateWordRow(row: CSVRow): { valid: boolean; error?: string } {
  const word = row['word']?.trim()
  const definition = row['definition']?.trim()
  const mongolian = row['mongolian']?.trim()

  if (!word) {
    return { valid: false, error: 'Missing "word" column' }
  }
  if (!definition) {
    return { valid: false, error: 'Missing "definition" column' }
  }
  if (!mongolian) {
    return { valid: false, error: 'Missing "mongolian" column' }
  }

  return { valid: true }
}

/**
 * Map CSV row to ParsedWord object
 */
export function mapRowToWord(row: CSVRow): ParsedWord | null {
  try {
    const word = row['word']?.trim()
    const definition = row['definition']?.trim()
    const mongolian = row['mongolian']?.trim()

    if (!word || !definition || !mongolian) {
      return null
    }

    // Parse arrays from comma-separated strings
    const parseArray = (str?: string): string[] => {
      if (!str) return []
      return str.split(';').map((s) => s.trim()).filter(Boolean)
    }

    return {
      word,
      definition,
      mongolian,
      part_of_speech: row['part_of_speech']?.trim() || 'noun',
      ipa: row['ipa']?.trim() || '',
      cefr_level: row['cefr_level']?.trim() || 'A2',
      examples: parseArray(row['examples']),
      word_family: parseArray(row['word_family']),
      collocations: parseArray(row['collocations']),
      confused_with: parseArray(row['confused_with']),
      etymology_hint: row['etymology_hint']?.trim() || '',
      category: row['category']?.trim() || 'daily',
      goal_tag: row['goal_tag']?.trim() || 'general',
      notes: row['notes']?.trim() || '',
    }
  } catch (err) {
    console.error('Error mapping row:', err)
    return null
  }
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
  const headers = [
    'word',
    'definition',
    'mongolian',
    'part_of_speech',
    'ipa',
    'cefr_level',
    'examples',
    'word_family',
    'collocations',
    'confused_with',
    'etymology_hint',
    'category',
    'goal_tag',
    'notes',
  ]

  const example = [
    'wake up',
    'to open your eyes and become alert after sleeping',
    'сэргээх',
    'phrasal verb',
    '/weɪk ʌp/',
    'A1',
    'My brother has a hard time waking up in the morning;She has been asleep for over eleven hours',
    'wake;awake;awakening',
    'wake up at;wake up in;wake up to',
    'get up;stand up',
    "From Old English 'wacan' meaning to wake",
    'phrasal_verb',
    'general',
    'Very common in daily life',
  ]

  return [headers.join(','), example.join(',')].join('\n')
}
