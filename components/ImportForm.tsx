'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseCSV, parseXLSX, generateCSVTemplate, type ParsedWord } from '@/lib/csv-parser'
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface ImportFormProps {
  onImportComplete: (words: ParsedWord[]) => Promise<void>
}

export default function ImportForm({ onImportComplete }: ImportFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<ParsedWord[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [stats, setStats] = useState<{ total: number; skipped: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setErrors(['Please upload a CSV or XLSX file'])
      return
    }

    setFile(selectedFile)
    setIsLoading(true)
    setErrors([])
    setPreview([])

    try {
      let result
      if (ext === 'csv') {
        result = await parseCSV(selectedFile)
      } else {
        result = await parseXLSX(selectedFile)
      }

      const { words, errors: parseErrors, skipped } = result

      setPreview(words.slice(0, 5)) // Show first 5 for preview
      setErrors(parseErrors)
      setStats({ total: words.length, skipped })
    } catch (err) {
      setErrors([`Error parsing file: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-accent/10', 'border-accent')
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-accent/10', 'border-accent')
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-accent/10', 'border-accent')

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(droppedFile)
        input.files = dataTransfer.files
        await handleFileChange({ target: input } as any)
      }
    }
  }

  const handleSubmit = async () => {
    if (!preview.length) return

    setIsSubmitting(true)
    try {
      await onImportComplete(preview)
      setImportSuccess(true)
      setFile(null)
      setPreview([])
      setStats(null)
      setErrors([])

      // Reset success message after 3 seconds
      setTimeout(() => setImportSuccess(false), 3000)
    } catch (err) {
      setErrors([`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vocabulary-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Template Download */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
          Don't have a file yet? Download a CSV template and fill it with your words.
        </p>
        <Button
          onClick={handleDownloadTemplate}
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </Button>
      </div>

      {/* Success Message */}
      {importSuccess && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-900 dark:text-green-100">
            ✓ {stats?.total || 0} words imported successfully!
          </p>
        </div>
      )}

      {/* File Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors hover:bg-accent/5"
      >
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-lg font-medium mb-2">Drag and drop your file here</p>
        <p className="text-sm text-muted-foreground mb-4">or</p>
        <label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="default" size="sm" asChild>
            <span>Select CSV or Excel File</span>
          </Button>
        </label>
        {file && (
          <p className="text-sm text-muted-foreground mt-4">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Parsing file...</span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100 mb-2">
                Issues found ({errors.length}):
              </p>
              <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {errors.length > 5 && <li>• ... and {errors.length - 5} more</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="bg-accent/10 border border-accent rounded-lg p-4">
          <p className="text-sm">
            <span className="font-medium">{stats.total}</span> valid words ready to import
            {stats.skipped > 0 && (
              <span className="text-muted-foreground ml-2">
                ({stats.skipped} rows skipped due to errors)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Preview (First {preview.length} words)</h3>
            <span className="text-xs text-muted-foreground">
              Total: {stats?.total || preview.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Word</th>
                  <th className="text-left p-2 font-medium">Definition</th>
                  <th className="text-left p-2 font-medium">Mongolian</th>
                  <th className="text-left p-2 font-medium">Level</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((word, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{word.word}</td>
                    <td className="p-2 text-muted-foreground">{word.definition.substring(0, 40)}...</td>
                    <td className="p-2">{word.mongolian}</td>
                    <td className="p-2">{word.cefr_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {preview.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import {stats?.total} Words
            </>
          )}
        </Button>
      )}
    </div>
  )
}
