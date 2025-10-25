import { Temporal } from '@js-temporal/polyfill'

import type { TableData } from '@/types'
import { splitArrayBy } from '@/utils/splitArrayBy'

const parseSpecificDate = (str: string): Temporal.ZonedDateTime => {
  if (str.length !== 13) {
    throw new Error('String must be in HHmm-DDMMYYYY format')
  }

  const [hour, minute] = [Number(str.substring(0, 2)), Number(str.substring(2, 4))]
  const [day, month, year] = [Number(str.substring(5, 7)), Number(str.substring(7, 9)), Number(str.substring(9))]

  return Temporal.ZonedDateTime.from({
    hour,
    minute,
    day,
    month,
    year,
    timeZone: 'UTC',
  })
}

const parseWeekdayDate = (str: string, timezone: string): Temporal.ZonedDateTime => {
  if (str.length !== 6) {
    throw new Error('String must be in HHmm-d format')
  }

  const [hour, minute] = [Number(str.substring(0, 2)), Number(str.substring(2, 4))]
  const dayOfWeek = Number(str.substring(5))

  const today = Temporal.Now.zonedDateTimeISO('UTC').round('day')
  const dayDelta = dayOfWeek - today.dayOfWeek
  let resultDate = today.add({ days: dayDelta }).with({ hour, minute })

  const dayInTz = resultDate.withTimeZone(timezone)
  const todayInTz = today.withTimeZone(timezone)
  if (dayInTz.weekOfYear > todayInTz.weekOfYear) {
    resultDate = resultDate.subtract({ days: 7 })
  }

  return resultDate
}

const convertTimesToDates = (times: string[], timezone: string): Temporal.ZonedDateTime[] => {
  const isSpecificDates = times[0]?.length === 13

  return times.map(time => (isSpecificDates
    ? parseSpecificDate(time).withTimeZone(timezone)
    : parseWeekdayDate(time, timezone).withTimeZone(timezone)))
}

const calculateColumns = (dates: Temporal.ZonedDateTime[]): (Temporal.PlainDate | null)[] => {
  const sortedDates = Array.from(new Map(dates.map(date => {
    const plain = date.toPlainDate()
    return [plain.toString(), plain]
  })).values())
    .sort(Temporal.PlainDate.compare)

  const partitionedDates = splitArrayBy(sortedDates, (a, b) => !a.add({ days: 1 }).equals(b))

  return partitionedDates.reduce<(Temporal.PlainDate | null)[]>((columns, partition, index) => ([
    ...columns,
    ...partition,
    ...(index < partitionedDates.length - 1 ? [null] : []),
  ]), [])
}

const calculateRows = (dates: Temporal.ZonedDateTime[]): (Temporal.PlainTime | null)[] => {
  const sortedDates = [...new Map(dates.map(date => {
    const plain = date.toPlainTime()
    return [plain.toString({ smallestUnit: 'minute' }), plain]
  })).values()]
    .sort(Temporal.PlainTime.compare)

  const partitionedDates = splitArrayBy(sortedDates, (a, b) => !a.add({ minutes: 15 }).equals(b))

  return partitionedDates.reduce<(Temporal.PlainTime | null)[]>((rows, partition, index) => ([
    ...rows,
    ...partition,
    partition[partition.length - 1].add({ minutes: 15 }),
    ...(index < partitionedDates.length - 1 ? [null, null] : []),
  ]), [])
}

const serializeTime = (time: Temporal.ZonedDateTime, isSpecificDates: boolean) => {
  const t = time.withTimeZone('UTC')
  const [hour, minute, day, month] = [t.hour, t.minute, t.day, t.month].map(value => value.toString().padStart(2, '0'))
  const [year, dayOfWeek] = [t.year.toString().padStart(4, '0'), (t.dayOfWeek === 7 ? 0 : t.dayOfWeek).toString()]

  return isSpecificDates
    ? `${hour}${minute}-${day}${month}${year}`
    : `${hour}${minute}-${dayOfWeek}`
}

export interface CalculateTableArgs {
  times: string[]
  locale: string
  timeFormat: '12h' | '24h'
  timezone: string
}

export const calculateTable = ({ times, locale, timeFormat, timezone }: CalculateTableArgs): TableData => {
  const dates = convertTimesToDates(times, timezone)
  const rows = calculateRows(dates)
  const columns = calculateColumns(dates)
  const isSpecificDates = times[0]?.length === 13

  return {
    rows: rows.map(row => (row && row.minute === 0
      ? {
        label: row.toLocaleString(locale, { hour: 'numeric', hourCycle: timeFormat === '12h' ? 'h12' : 'h24' }),
        string: row.toString(),
      }
      : null)),
    columns: columns.map(column => (column
      ? {
        header: {
          dateLabel: isSpecificDates
            ? column.toLocaleString(locale, { month: 'short', day: 'numeric' })
            : undefined,
          weekdayLabel: column.toLocaleString(locale, { weekday: 'short' }),
          string: column.toString(),
        },
        cells: rows.map(row => {
          if (!row) return null

          const date = column.toZonedDateTime({ timeZone: timezone, plainTime: row })
          const serialized = serializeTime(date, isSpecificDates)

          if (!times.includes(serialized)) return null

          return {
            serialized,
            minute: date.minute,
            label: isSpecificDates
              ? date.toLocaleString(locale, {
                dateStyle: 'long',
                timeStyle: 'short',
                hourCycle: timeFormat === '12h' ? 'h12' : 'h24',
              })
              : `${date.toLocaleString(locale, {
                timeStyle: 'short',
                hourCycle: timeFormat === '12h' ? 'h12' : 'h24',
              })}, ${date.toLocaleString(locale, { weekday: 'long' })}`,
          }
        }),
      }
      : null)),
  }
}
