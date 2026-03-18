'use client'

import { Volume2, X, Star, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import InteractiveButton from '@/components/design/InteractiveButton'
import { cn } from '@/lib/utils'
import { speakWord } from '@/lib/speech-utils'
import { Word } from '@/lib/supabase'
import { WordWithReview, CATEGORIES, LEVELS } from './types'
import { getMasteryBadgeColor, getMasteryLabel, getLevelColor } from './WordCard'

interface WordModalProps {
  selectedWord: WordWithReview
  showDetails: boolean
  editMode: boolean
  editForm: Partial<Word>
  saving: boolean
  deleteConfirmId: string | null
  words: WordWithReview[]
  setShowDetails: (v: boolean) => void
  setEditMode: (v: boolean) => void
  setEditForm: (updater: (prev: Partial<Word>) => Partial<Word>) => void
  setDeleteConfirmId: (id: string | null) => void
  onUpdateWord: () => void
  onDeleteWord: (id: string) => void
}

export default function WordModal({
  selectedWord,
  showDetails,
  editMode,
  editForm,
  saving,
  deleteConfirmId,
  words,
  setShowDetails,
  setEditMode,
  setEditForm,
  setDeleteConfirmId,
  onUpdateWord,
  onDeleteWord,
}: WordModalProps) {
  if (!selectedWord || !showDetails) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm backdrop-enter"
        onClick={() => { setShowDetails(false); setEditMode(false) }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="modal-enter w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border)]"
          style={{ boxShadow: 'var(--shadow-2xl)' }}
        >
          {/* Modal header */}
          <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="h3 text-[var(--text)] flex items-center gap-2 flex-wrap">
                <span className="truncate">{selectedWord.word}</span>
                <button
                  onClick={() => speakWord(selectedWord.word)}
                  className="p-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-all flex-shrink-0"
                  title="Pronounce"
                >
                  <Volume2 size={16} />
                </button>
              </h2>
              {selectedWord.ipa && (
                <p className="label text-[var(--text-secondary)] mt-2">{selectedWord.ipa}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(false)}
              className="flex-shrink-0"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Modal body - scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Edit Form */}
            {editMode && (
              <div className="p-6 space-y-4">
                {([
                  { key: 'word', label: 'Word', placeholder: 'e.g. eloquent' },
                  { key: 'definition', label: 'Definition', placeholder: 'English definition…' },
                  { key: 'mongolian', label: 'Mongolian', placeholder: 'Mongolian translation…' },
                  { key: 'ipa', label: 'IPA', placeholder: '/ɛləkwənt/' },
                  { key: 'part_of_speech', label: 'Part of Speech', placeholder: 'noun, verb, adjective…' },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="label text-[var(--text)]">{label}</label>
                    <Input
                      placeholder={placeholder}
                      value={(editForm as any)[key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label text-[var(--text)]">CEFR Level</label>
                    <Select
                      value={editForm.cefr_level || 'B1'}
                      onValueChange={v => setEditForm(p => ({ ...p, cefr_level: v as Word['cefr_level'] }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label text-[var(--text)]">Category</label>
                    <Select
                      value={editForm.category || 'daily'}
                      onValueChange={v => setEditForm(p => ({ ...p, category: v as Word['category'] }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="label text-[var(--text)]">Personal Notes</label>
                  <Textarea
                    placeholder="Mnemonics, memory tricks, context, example sentences…"
                    rows={3}
                    value={(editForm as any).notes || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* View Mode */}
            {!editMode && (
              <div className="p-6 space-y-6">
                {/* Mastery status */}
                <div>
                  <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                    Progress
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getMasteryBadgeColor(selectedWord.masteryLevel)}`}>
                      {getMasteryLabel(selectedWord.masteryLevel)}
                    </Badge>
                    <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full bg-gradient-to-r',
                          selectedWord.masteryLevel === 'mastered'
                            ? 'from-emerald-400 to-emerald-500'
                            : selectedWord.masteryLevel === 'learning'
                              ? 'from-blue-400 to-blue-500'
                              : 'from-amber-400 to-amber-500'
                        )}
                        style={{ width: `${selectedWord.progressPercent || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)] min-w-[40px]">
                      {Math.round(selectedWord.progressPercent || 0)}%
                    </span>
                  </div>
                  {selectedWord.review && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Reviewed {selectedWord.review.repetitions} times
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedWord.part_of_speech && (
                    <Badge variant="outline" className="text-xs">
                      {selectedWord.part_of_speech}
                    </Badge>
                  )}
                  {selectedWord.cefr_level && (
                    <Badge className={`text-xs ${getLevelColor(selectedWord.cefr_level)}`}>
                      {selectedWord.cefr_level}
                    </Badge>
                  )}
                  {selectedWord.category && (
                    <Badge variant="outline" className="text-xs">
                      {selectedWord.category.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                {/* Definition */}
                <div>
                  <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                    Definition
                  </p>
                  <p className="body text-[var(--text)] leading-relaxed">{selectedWord.definition}</p>
                  {selectedWord.mongolian && (
                    <p className="text-sm text-[var(--text-secondary)] italic mt-3">
                      {selectedWord.mongolian}
                    </p>
                  )}
                </div>

                {/* Examples */}
                {(selectedWord.examples as string[] | undefined || []).length > 0 && (
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                      Examples
                    </p>
                    <div className="space-y-2">
                      {(selectedWord.examples as string[]).map((ex, i) => (
                        <p
                          key={i}
                          className="text-sm text-[var(--text)] italic px-3 py-2 bg-[var(--bg)] rounded border-l-2 border-[var(--accent)]"
                        >
                          &ldquo;{ex}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collocations */}
                {(selectedWord.collocations as string[] | undefined || []).length > 0 && (
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
                      Collocations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedWord.collocations as string[]).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memory hint */}
                {selectedWord.etymology_hint && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                      💡 {selectedWord.etymology_hint}
                    </p>
                  </div>
                )}

                {/* Personal notes */}
                {selectedWord.notes && (
                  <div>
                    <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">My Notes</p>
                    <blockquote className="text-sm text-[var(--text)] px-3 py-2 bg-[var(--bg)] rounded border-l-2 border-[var(--accent)]/50 italic leading-relaxed">
                      {selectedWord.notes}
                    </blockquote>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal footer - sticky */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex gap-2 flex-shrink-0">
            {editMode ? (
              <>
                <InteractiveButton
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </InteractiveButton>
                <InteractiveButton
                  variant="primary"
                  size="md"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={onUpdateWord}
                  isLoading={saving}
                >
                  <Check size={16} />
                  Save Changes
                </InteractiveButton>
              </>
            ) : (
              <>
                <InteractiveButton
                  variant="secondary"
                  size="md"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => {
                    setEditForm(() => ({
                      word: selectedWord.word,
                      definition: selectedWord.definition,
                      mongolian: selectedWord.mongolian || '',
                      ipa: selectedWord.ipa || '',
                      part_of_speech: selectedWord.part_of_speech || '',
                      cefr_level: selectedWord.cefr_level || 'B1',
                      category: selectedWord.category || 'daily',
                      notes: selectedWord.notes || '',
                    }))
                    setEditMode(true)
                  }}
                >
                  <Star size={16} />
                  Edit
                </InteractiveButton>
                <InteractiveButton
                  variant="danger"
                  size="md"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => setDeleteConfirmId(selectedWord.id)}
                >
                  <Trash2 size={16} />
                  Delete
                </InteractiveButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{words.find(w => w.id === deleteConfirmId)?.word}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the word and all its review history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteConfirmId && onDeleteWord(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
