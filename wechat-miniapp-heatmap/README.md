# WeChat Mini Program Availability Heatmap

This folder contains a standalone Vue 3 component that reproduces the core behaviour of the Crab Fit availability heatmap for reuse inside a WeChat mini program (for example, when using the [uni-app](https://uniapp.dcloud.io/) or [Taro](https://taro.zone/) frameworks).

## Features

- Renders a time grid with per-slot availability colours
- Displays a dynamic legend that can be used to filter by availability counts
- Allows filtering participants and temporary focus via press-and-hold
- Shows the detailed list of available and unavailable participants for the currently selected slot
- Works with both concrete dates (`HHmm-DDMMYYYY`) and weekly recurring slots (`HHmm-d`) as used by Crab Fit

## File structure

```
wechat-miniapp-heatmap/
├── README.md
├── package.json
├── src/
│   ├── components/
│   │   └── AvailabilityHeatmap.vue
│   ├── types.ts
│   └── utils/
│       ├── calculateAvailability.ts
│       ├── calculateTable.ts
│       ├── palette.ts
│       └── splitArrayBy.ts
└── tsconfig.json
```

## Getting started

1. Install the dependencies into your mini program project:

   ```bash
   npm install @js-temporal/polyfill
   ```

   If your build tooling supports tree-shaking you can also copy the utility files directly instead of installing the Temporal polyfill.

2. Copy the `src` folder into your project (or import the files through a workspace configuration).
3. Register the `AvailabilityHeatmap` component with your page or parent component and provide it with the event data:

   ```vue
   <script setup lang="ts">
   import AvailabilityHeatmap from '@/components/AvailabilityHeatmap.vue'
   import type { Person, TableData } from '@/components/types'
   import { calculateTable } from '@/components/utils/calculateTable'

   const times = ['0930-12032024', '1000-12032024']
   const people: Person[] = [
     { name: 'Alice', availability: ['0930-12032024'], createdAt: 1709760000 },
     { name: 'Bob', availability: ['0930-12032024', '1000-12032024'], createdAt: 1709846400 },
   ]

   const table: TableData = calculateTable({
     times,
     locale: 'zh-CN',
     timeFormat: '24h',
     timezone: 'Asia/Shanghai',
   })
   </script>

   <template>
     <AvailabilityHeatmap
       :times="times"
       :people="people"
       :table="table"
       timezone="Asia/Shanghai"
       locale="zh-CN"
       time-format="24h"
     />
   </template>
   ```

4. Ensure that the page or component style sheet imports the CSS variables declared inside `AvailabilityHeatmap.vue` if you want to customise colours.

## Notes

- The component only uses WeChat mini program friendly primitives (`<view>`, `<scroll-view>`, `<text>`), so it can run inside WebView-like environments.
- Clipboard support is exposed via the optional `@copy` event because WeChat mini programs expose clipboard APIs through `wx.setClipboardData` rather than the standard `navigator.clipboard` API.
- When using recurring weekly slots (`HHmm-d`), pass the same timezone you used when creating the event to ensure the table aligns with the original Crab Fit behaviour.
- You can customise the colour palette by providing your own `palette` prop (an array of CSS colour strings ordered from low to high availability).

