import type { AvailabilityInfo, Person } from '@/types'

/**
 * Takes an array of dates and an array of people, where each person has a name and
 * availability array, and returns the group availability for each date passed in.
 */
export const calculateAvailability = (dates: string[], people: Person[]): AvailabilityInfo => {
  let min = 0
  let max = people.length

  const availabilities = dates.map(date => {
    const names = people.flatMap(person =>
      person.availability.some(availableDate => availableDate === date)
        ? [person.name]
        : [],
    )

    if (names.length < min) {
      min = names.length
    }
    if (names.length > max) {
      max = names.length
    }

    return { date, people: names }
  })

  return { availabilities, min, max }
}
