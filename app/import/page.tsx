'use client'

import { useState } from 'react'
import ImportForm from '@/components/ImportForm'
import { supabase } from '@/lib/supabase'
import type { ParsedWord } from '@/lib/csv-parser'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <Link href="/words">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Words
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">Bulk Import Vocabulary</h1>
          <p className="text-muted-foreground">
            Upload a CSV or Excel file to quickly add multiple words to your vocabulary list.
          </p>
        </div>

        {/* Error Message */}
        {importError && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">{importError}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">How to use:</h2>
          <ol className="space-y-2 text-sm list-decimal list-inside">
            <li>
              <strong>Option A:</strong> Download the CSV template below, fill it with your words, and upload it.
            </li>
            <li>
              <strong>Option B:</strong> Prepare your own CSV or Excel file with these columns:
              <span className="block mt-2 bg-background p-2 rounded font-mono text-xs">
                word, definition, mongolian, part_of_speech, ipa, cefr_level, examples, word_family,
                collocations, confused_with, etymology_hint, category, goal_tag
              </span>
            </li>
            <li>
              <strong>Array fields</strong> (examples, word_family, etc.) should use semicolons to separate values:
              <span className="block mt-2 bg-background p-2 rounded font-mono text-xs">
                word family → "family1; family2; family3"
              </span>
            </li>
            <li>Required columns: <strong>word, definition, mongolian</strong></li>
            <li>Click upload, preview your data, and confirm the import.</li>
          </ol>
        </div>

        {/* Import Form */}
        <ImportForm onImportComplete={handleImport} />
      </div>
  )
}
