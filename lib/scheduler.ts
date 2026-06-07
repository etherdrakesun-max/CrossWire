/**
 * Scheduler helper to calculate the next execution date based on frequency configuration.
 */
export function calculateNextRunAt(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  baseDate: Date = new Date()
): Date {
  const next = new Date(baseDate.getTime())

  // Reset hours/minutes/seconds/ms to standard execution time (e.g. 09:00:00 AM UTC)
  next.setUTCHours(9, 0, 0, 0)

  // If next is in the past compared to baseDate, start by adjusting to the future
  if (next.getTime() <= baseDate.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  const freq = frequency.toLowerCase()

  if (freq === 'daily') {
    // Already set to next day or base day 9:00 AM
    return next
  }

  if (freq === 'weekly') {
    // dayOfWeek is 0 (Sunday) to 6 (Saturday)
    const targetDay = dayOfWeek !== null ? dayOfWeek : 1 // default to Monday
    while (next.getUTCDay() !== targetDay) {
      next.setUTCDate(next.getUTCDate() + 1)
    }
    return next
  }

  if (freq === 'biweekly') {
    // Bi-weekly is defined as every 14 days
    next.setUTCDate(next.getUTCDate() + 13) // We already added 1 day above, so add 13 more
    return next
  }

  if (freq === 'monthly') {
    // dayOfMonth is 1 to 31
    const targetDay = dayOfMonth !== null ? dayOfMonth : 1
    
    // Set to target day in the current or next month
    next.setUTCDate(targetDay)
    
    // If setting to targetDay placed us in the past relative to baseDate, move to next month
    if (next.getTime() <= baseDate.getTime()) {
      next.setUTCMonth(next.getUTCMonth() + 1)
      next.setUTCDate(targetDay)
    }
    return next
  }

  // Fallback default is tomorrow
  return next
}
