'use client'

interface RatingButtonsProps {
  onRate: (quality: number) => void
}

const RATINGS = [
  { label: 'Again', q: 0, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  { label: 'Hard',  q: 2, color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  { label: 'Good',  q: 3, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  { label: 'Easy',  q: 5, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
]

export default function RatingButtons({ onRate }: RatingButtonsProps) {
  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-1.5">
        {RATINGS.map(({ label, q, color, bg }, i) => (
          <button
            key={q}
            onClick={() => onRate(q)}
            className="py-3 rounded-xl transition-all duration-150 active:scale-95 flex flex-col items-center gap-0.5"
            style={{ background: bg, color, border: `1.5px solid ${color}35` }}
          >
            <span className="text-[13px] font-bold leading-none">{label}</span>
            <span className="text-[9px] opacity-40 hidden md:block">[{i + 1}]</span>
          </button>
        ))}
      </div>
    </div>
  )
}
