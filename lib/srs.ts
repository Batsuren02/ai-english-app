export type SM2Result = {
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: Date
}

export function calculateSM2(
  quality: number, // 0-5
  ease_factor: number = 2.5,
  interval_days: number = 1,
  repetitions: number = 0
): SM2Result {
  // Quality < 3 = fail, reset
  let new_repetitions: number
  let new_interval: number
  let new_ease: number

  if (quality < 3) {
    new_repetitions = 0
    new_interval = 1
    new_ease = ease_factor
  } else {
    new_repetitions = repetitions + 1
    if (repetitions === 0) {
      new_interval = 1
    } else if (repetitions === 1) {
      new_interval = 6
    } else {
      new_interval = Math.round(interval_days * ease_factor)
    }
    new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if (new_ease < 1.3) new_ease = 1.3
  }

  const next_review = new Date()
  next_review.setDate(next_review.getDate() + new_interval)

  return {
    ease_factor: parseFloat(new_ease.toFixed(2)),
    interval_days: new_interval,
    repetitions: new_repetitions,
    next_review,
  }
}

export function qualityLabel(q: number): string {
  const labels = ['Again (0)', 'Hard (1)', 'Hard (2)', 'Good (3)', 'Easy (4)', 'Perfect (5)']
  return labels[q] || 'Unknown'
}
