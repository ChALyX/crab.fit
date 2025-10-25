const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const toRGBA = (r: number, g: number, b: number, a = 1) =>
  `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(2)})`

/**
 * Generate a colour palette from a base colour.
 * The palette always goes from transparent to the base colour and provides a highlight variant.
 */
export const generatePalette = (steps: number, baseColor = '#f79e00') => {
  const [r, g, b] = baseColor
    .replace('#', '')
    .match(/.{1,2}/g)!
    .map(value => parseInt(value.length === 1 ? value.repeat(2) : value, 16))

  const colours = Array.from({ length: Math.max(steps, 2) }, (_, index) => {
    const intensity = index / Math.max(steps - 1, 1)
    const alpha = steps === 1 ? 0.25 : clamp(intensity * 0.85 + 0.15, 0.15, 1)
    const highlightAlpha = clamp(alpha + 0.3, 0, 1)

    return {
      string: toRGBA(r, g, b, alpha),
      highlight: toRGBA(r, g, b, highlightAlpha),
    }
  })

  return colours.slice(0, steps)
}
