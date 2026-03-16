'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import ImportForm from '@/components/ImportForm'
import { supabase } from '@/lib/supabase'
import type { ParsedWord } from '@/lib/csv-parser'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import SurfaceCard from '@/components/design/SurfaceCard'
import InteractiveButton from '@/components/design/InteractiveButton'

export default function ImportPage() {
  const [importError, setImportError] = useState<string>('')

  const handleImport = async (words: ParsedWord[]) => {
    setImportError('')

    if (words.length === 0) {
      setImportError('No words to import')
      return
    }

    try {
      // Format words for database
      const wordsToInsert = words.map((word) => ({
        word: word.word,
        definition: word.definition,
        mongolian: word.mongolian,
        part_of_speech: word.part_of_speech || 'noun',
        ipa: word.ipa || '',
        cefr_level: word.cefr_level || 'A2',
        examples: word.examples || [],
        word_family: word.word_family || [],
        collocations: word.collocations || [],
        confused_with: word.confused_with || [],
        etymology_hint: word.etymology_hint || '',
        category: word.category || 'daily',
        goal_tag: word.goal_tag || 'general',
        notes: word.notes || '',
        audio_url: '',
      }))

      // Insert into database and get back the inserted rows (need IDs for reviews)
      const { data: insertedWords, error } = await supabase
        .from('words')
        .insert(wordsToInsert)
        .select('id')

      if (error) {
        // Check if it's a duplicate key error
        if (error.message.includes('duplicate')) {
          setImportError(
            `Some words already exist. ${words.length} words were processed. Check the results.`
          )
        } else {
          setImportError(`Import failed: ${error.message}`)
        }
      }

      // Create review entries for all successfully imported words
      if (insertedWords && insertedWords.length > 0) {
        const reviewRows = insertedWords.map((w: { id: string }) => ({
          word_id: w.id,
        }))
        const { error: reviewError } = await supabase
          .from('reviews')
          .insert(reviewRows)

        if (reviewError) {
          console.error('Failed to create review entries:', reviewError)
        }
      }
    } catch (err) {
      setImportError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err
    }
  }

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/words">
          <InteractiveButton variant="ghost" size="sm" className="gap-2 -ml-1">
            <ArrowLeft size={14} />
            Back to Words
          </InteractiveButton>
        </Link>
        <h1 className="h2 text-[var(--text)]">Bulk Import</h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Upload a CSV or Excel file to quickly add multiple words to your vocabulary.
        </p>
      </div>

      {/* Error Message */}
      {importError && (
        <div className="rounded-xl border border-[var(--warning)]/30 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-[13px] text-amber-900 dark:text-amber-200">{importError}</p>
        </div>
      )}

      {/* Instructions */}
      <SurfaceCard padding="lg">
        <h2 className="text-[13px] font-semibold text-[var(--text)] mb-4">How to use</h2>
        <ol className="space-y-3 text-[13px] text-[var(--text-secondary)] list-decimal list-inside">
          <li>
            <span className="font-semibold text-[var(--text)]">Option A:</span> Download the CSV template, fill it in, upload it.
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Option B:</span> Use your own CSV or Excel with these columns:
            <code className="block mt-2 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">
              word, definition, mongolian, part_of_speech, ipa, cefr_level,{'\n'}examples, word_family, collocations, confused_with, category
            </code>
          </li>
          <li>
            <span className="font-semibold text-[var(--text)]">Array fields</span> use semicolons to separate values:
            <code className="block mt-2 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)]">
              "family1; family2; family3"
            </code>
          </li>
          <li>Required: <span className="font-semibold text-[var(--text)]">word, definition, mongolian</span></li>
        </ol>
      </SurfaceCard>

      {/* Import Form */}
      <ImportForm onImportComplete={handleImport} />
    </div>
  )
}
