export const splitArrayBy = <T>(
  values: readonly T[],
  isBreak: (current: T, next: T) => boolean,
): T[][] => {
  if (values.length === 0) return []

  const partitions: T[][] = []
  let cursor: T[] = [values[0]]

  for (let i = 1; i < values.length; i += 1) {
    const previous = values[i - 1]
    const current = values[i]

    if (isBreak(previous, current)) {
      partitions.push(cursor)
      cursor = [current]
    } else {
      cursor.push(current)
    }
  }

  partitions.push(cursor)
  return partitions
}
