<template>
  <view class="availability-heatmap">
    <view class="legend" v-if="legendSegments.length">
      <view
        v-for="segment in legendSegments"
        :key="segment.count"
        class="legend__segment"
      >
        <view
          class="legend__swatch"
          :style="{
            backgroundColor: segment.color,
            borderColor: segment.count === focusCount ? segment.highlight : 'transparent',
          }"
          @tap="() => handleLegendTap(segment.count)"
        />
        <text class="legend__label">{{ segment.label }}</text>
      </view>
    </view>

    <text class="info" v-if="people.length === 0">
      暂无参与者，添加人员后即可查看可用性热力图。
    </text>

    <view class="people" v-else-if="people.length > 1">
      <view
        v-for="person in people"
        :key="person.name"
        class="people__chip"
        :class="{
          'people__chip--selected': filteredPeople.includes(person.name),
          'people__chip--focused': tempFocus === person.name,
        }"
        @tap="() => togglePerson(person.name)"
        @touchstart="() => (tempFocus = person.name)"
        @touchend="clearTempFocus"
        @touchcancel="clearTempFocus"
      >
        <text>{{ person.name }}</text>
      </view>
    </view>

    <scroll-view scroll-x class="heatmap__wrapper" v-if="tableData.columns.length">
      <view class="heatmap">
        <view class="heatmap__time-labels">
          <view
            v-for="(row, rowIndex) in tableData.rows"
            :key="`time-${rowIndex}`"
            class="heatmap__time-slot"
          >
            <text v-if="row" class="heatmap__time-text">{{ row.label }}</text>
          </view>
        </view>

        <view class="heatmap__columns">
          <view
            v-for="(column, columnIndex) in tableData.columns"
            :key="`col-${columnIndex}`"
            class="heatmap__column"
          >
            <template v-if="column">
              <view class="heatmap__column-header">
                <text v-if="column.header.dateLabel" class="heatmap__date">{{ column.header.dateLabel }}</text>
                <text class="heatmap__weekday">{{ column.header.weekdayLabel }}</text>
              </view>

              <view class="heatmap__cells">
                <view
                  v-for="(cell, cellIndex) in column.cells"
                  :key="`cell-${columnIndex}-${cellIndex}`"
                  v-if="cellIndex < column.cells.length - 1"
                  class="heatmap__cell"
                  :class="{
                    'heatmap__cell--highlight': shouldHighlight(cell?.serialized),
                    'heatmap__cell--focused': isSelected(cell?.serialized),
                  }"
                  :style="cell ? getCellStyle(cell) : greyCellStyle"
                  @tap="() => handleCellTap(cell)"
                />
              </view>
            </template>
            <view v-else class="heatmap__column heatmap__column--spacer" />
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="selectedSlot" class="details">
      <view class="details__header">
        <text class="details__title">{{ selectedSlot.availableLabel }}</text>
        <text class="details__subtitle">{{ selectedSlot.date }}</text>
      </view>

      <view class="details__lists">
        <view class="details__list">
          <text class="details__heading">可参加</text>
          <text v-if="selectedSlot.people.length === 0" class="details__empty">暂无</text>
          <view v-else class="details__chips">
            <text v-for="name in selectedSlot.people" :key="`selected-${name}`" class="details__chip">
              {{ name }}
            </text>
          </view>
        </view>
        <view class="details__list" v-if="filteredPeople.length">
          <text class="details__heading">未参加</text>
          <text v-if="selectedSlot.absent.length === 0" class="details__empty">暂无</text>
          <view v-else class="details__chips">
            <text v-for="name in selectedSlot.absent" :key="`absent-${name}`" class="details__chip details__chip--muted">
              {{ name }}
            </text>
          </view>
        </view>
      </view>

      <button
        v-if="selectedSlot.people.length"
        class="details__copy"
        type="button"
        @tap="() => emitCopy(selectedSlot)"
      >
        复制可参加名单
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { PropType } from 'vue'

import type { AvailabilityInfo, Person, TableCell, TableData } from '@/types'
import { calculateAvailability } from '@/utils/calculateAvailability'
import { calculateTable, type CalculateTableArgs } from '@/utils/calculateTable'
import { generatePalette } from '@/utils/palette'

interface PaletteColor {
  string: string
  highlight: string
}

const props = defineProps({
  times: {
    type: Array as PropType<string[]>,
    required: true,
  },
  people: {
    type: Array as PropType<Person[]>,
    default: () => [],
  },
  table: {
    type: Object as PropType<TableData | null>,
    default: null,
  },
  timezone: {
    type: String,
    required: true,
  },
  locale: {
    type: String,
    default: 'en-US',
  },
  timeFormat: {
    type: String as PropType<'12h' | '24h'>,
    default: '24h',
  },
  highlightMax: {
    type: Boolean,
    default: true,
  },
  palette: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  baseColor: {
    type: String,
    default: '#f79e00',
  },
})

const emit = defineEmits<{
  (e: 'copy', payload: { label: string; people: string[] }): void
}>()

const filteredPeople = ref(props.people.map(person => person.name))
const tempFocus = ref<string>()
const focusCount = ref<number>()
const selectedSerialized = ref<string>()

watch(
  () => props.people.map(person => person.name).join('|'),
  () => {
    filteredPeople.value = props.people.map(person => person.name)
  },
)

watch(filteredPeople, newValue => {
  if (selectedSerialized.value && newValue.length === 0) {
    selectedSerialized.value = undefined
  }
})

const tableData = computed<TableData>(() => props.table ?? calculateTable({
  times: props.times,
  locale: props.locale,
  timeFormat: props.timeFormat as CalculateTableArgs['timeFormat'],
  timezone: props.timezone,
}))

const availability = computed<AvailabilityInfo>(() => calculateAvailability(
  props.times,
  props.people.filter(person => filteredPeople.value.includes(person.name)),
))

const palette = computed<PaletteColor[]>(() => {
  if (props.palette.length > 0) {
    return props.palette.map(color => ({ string: color, highlight: color }))
  }
  const steps = Math.max(availability.value.max - availability.value.min + 1, 2)
  return generatePalette(steps, props.baseColor)
})

const availabilityIndex = computed(() => new Map(
  availability.value.availabilities.map(entry => [entry.date, entry.people]),
))

const legendSegments = computed(() => {
  const min = availability.value.min
  const max = availability.value.max
  if (max === 0) {
    return []
  }

  return Array.from({ length: max - min + 1 }, (_, index) => {
    const count = min + index
    const paletteIndex = Math.max(Math.min(index, palette.value.length - 1), 0)

    return {
      count,
      label: `${count} 人可用`,
      color: palette.value[paletteIndex]?.string ?? 'transparent',
      highlight: palette.value[paletteIndex]?.highlight ?? 'transparent',
    }
  })
})

const greyCellStyle = reactive({
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
})

const getCellStyle = (cell: TableCell | null) => {
  if (!cell) {
    return greyCellStyle
  }
  const peopleHere = availabilityIndex.value.get(cell.serialized) ?? []
  const filtered = tempFocus.value ? peopleHere.filter(name => name === tempFocus.value) : peopleHere
  const paletteIndex = tempFocus.value && filtered.length
    ? palette.value.length - 1
    : Math.max(Math.min(filtered.length - availability.value.min, palette.value.length - 1), 0)

  const isFocused = focusCount.value === undefined || focusCount.value === filtered.length
  const backgroundColor = isFocused ? palette.value[paletteIndex]?.string ?? 'transparent' : 'transparent'

  return {
    backgroundColor,
    borderTopColor: cell.minute !== 0 && cell.minute !== 30 ? 'transparent' : undefined,
    borderTopStyle: cell.minute === 30 ? 'dotted' : 'solid',
  }
}

const shouldHighlight = (serialized?: string | null) => {
  if (!serialized || !props.highlightMax) return false
  const peopleHere = availabilityIndex.value.get(serialized) ?? []
  if (focusCount.value !== undefined && peopleHere.length !== focusCount.value) return false
  return tempFocus.value ? peopleHere.includes(tempFocus.value) : peopleHere.length === availability.value.max
}

const isSelected = (serialized?: string | null) => selectedSerialized.value === serialized

const handleLegendTap = (count: number) => {
  if (focusCount.value === count) {
    focusCount.value = undefined
  } else {
    focusCount.value = count
  }
}

const togglePerson = (name: string) => {
  if (filteredPeople.value.includes(name)) {
    filteredPeople.value = filteredPeople.value.filter(item => item !== name)
  } else {
    filteredPeople.value = [...filteredPeople.value, name]
  }
  tempFocus.value = undefined
}

const clearTempFocus = () => {
  tempFocus.value = undefined
}

const handleCellTap = (cell: TableCell | null) => {
  if (!cell) return
  selectedSerialized.value = selectedSerialized.value === cell.serialized
    ? undefined
    : cell.serialized
}

const selectedSlot = computed(() => {
  if (!selectedSerialized.value) return null
  const cell = availability.value.availabilities.find(entry => entry.date === selectedSerialized.value)
  const tableCell = tableData.value.columns
    .flatMap(column => column?.cells ?? [])
    .find(item => item?.serialized === selectedSerialized.value)

  if (!cell || !tableCell) {
    return null
  }

  const absent = filteredPeople.value.filter(name => !cell.people.includes(name))

  return {
    people: cell.people,
    absent,
    availableLabel: `${cell.people.length} / ${filteredPeople.value.length} 人可用`,
    date: tableCell.label,
  }
})

const emitCopy = (slot: { date: string; people: string[] }) => {
  emit('copy', { label: slot.date, people: slot.people })
}
</script>

<style scoped lang="scss">
.availability-heatmap {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  color: #1f2933;
  font-size: 26rpx;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;

  &__segment {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__swatch {
    width: 32rpx;
    height: 32rpx;
    border-radius: 8rpx;
    border-width: 4rpx;
    border-style: solid;
  }

  &__label {
    font-size: 24rpx;
    color: #52606d;
  }
}

.info {
  color: #52606d;
}

.people {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__chip {
    padding: 12rpx 20rpx;
    border-radius: 999rpx;
    border: 2rpx solid #d9e2ec;
    color: #33404d;
    background-color: #f5f7fa;
    transition: all 0.2s ease;

    &--selected {
      background-color: #243b53;
      color: #fff;
      border-color: #243b53;
    }

    &--focused {
      box-shadow: 0 0 0 4rpx rgba(36, 59, 83, 0.2);
    }
  }
}

.heatmap__wrapper {
  width: 100%;
}

.heatmap {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12rpx;
  min-height: 400rpx;
}

.heatmap__time-labels {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.heatmap__time-slot {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8rpx;
  color: #52606d;
}

.heatmap__time-text {
  font-size: 24rpx;
}

.heatmap__columns {
  display: flex;
  gap: 12rpx;
}

.heatmap__column {
  display: flex;
  flex-direction: column;
  gap: 4rpx;

  &--spacer {
    width: 24rpx;
  }
}

.heatmap__column-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding-bottom: 8rpx;
}

.heatmap__date {
  font-size: 22rpx;
  color: #829ab1;
}

.heatmap__weekday {
  font-weight: 600;
  font-size: 26rpx;
}

.heatmap__cells {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.heatmap__cell {
  width: 80rpx;
  min-height: 64rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.08);

  &--highlight {
    border-color: rgba(36, 59, 83, 0.4);
    box-shadow: 0 0 0 4rpx rgba(36, 59, 83, 0.15);
  }

  &--focused {
    outline: 4rpx solid rgba(36, 59, 83, 0.35);
  }
}

.details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 16rpx;
  border-radius: 16rpx;
  background-color: #f5f7fa;
  border: 2rpx solid #d9e2ec;
}

.details__header {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.details__title {
  font-weight: 600;
  font-size: 28rpx;
}

.details__subtitle {
  font-size: 24rpx;
  color: #52606d;
}

.details__lists {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.details__list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.details__heading {
  font-weight: 600;
  font-size: 26rpx;
}

.details__empty {
  font-size: 24rpx;
  color: #829ab1;
}

.details__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.details__chip {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  background-color: rgba(36, 59, 83, 0.12);
  color: #243b53;
  font-size: 24rpx;

  &--muted {
    background-color: rgba(130, 154, 177, 0.2);
    color: #829ab1;
  }
}

.details__copy {
  padding: 16rpx;
  border: none;
  border-radius: 12rpx;
  background-color: #f79e00;
  color: #fff;
  font-size: 26rpx;
}
</style>
