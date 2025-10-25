export interface Person {
  name: string
  availability: string[]
  createdAt?: number
}

export interface Availability {
  date: string
  people: string[]
}

export interface AvailabilityInfo {
  availabilities: Availability[]
  min: number
  max: number
}

export interface TableCell {
  serialized: string
  minute: number
  label: string
}

export interface TableColumnHeader {
  dateLabel?: string
  weekdayLabel: string
  string: string
}

export interface TableColumn {
  header: TableColumnHeader
  cells: (TableCell | null)[]
}

export interface TableRow {
  label: string
  string: string
}

export interface TableData {
  rows: (TableRow | null)[]
  columns: (TableColumn | null)[]
}
