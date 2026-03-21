import { useMemo } from 'react'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

const PALETTES: [string, string, string][] = [
  ['#50fa7b', '#8be9fd', '#282a36'],
  ['#ff79c6', '#bd93f9', '#282a36'],
  ['#bd93f9', '#ff79c6', '#282a36'],
  ['#ffb86c', '#f1fa8c', '#282a36'],
  ['#8be9fd', '#50fa7b', '#282a36'],
  ['#f1fa8c', '#ffb86c', '#282a36'],
  ['#ff5555', '#ffb86c', '#282a36'],
  ['#50fa7b', '#bd93f9', '#282a36'],
]

function generateIdenticon(seed: string, size: number): string[][] {
  const hash = hashString(seed)
  const rand = seededRandom(hash)
  const palette = PALETTES[hash % PALETTES.length]
  const grid: string[][] = []

  for (let y = 0; y < size; y++) {
    const row: string[] = []
    const half = Math.ceil(size / 2)
    for (let x = 0; x < half; x++) {
      const r = rand()
      if (r > 0.65) {
        row.push(palette[0])
      } else if (r > 0.35) {
        row.push(palette[1])
      } else {
        row.push(palette[2])
      }
    }
    for (let x = half; x < size; x++) {
      row.push(row[size - 1 - x])
    }
    grid.push(row)
  }

  return grid
}

interface AvatarProps {
  seed: string
  size?: number
  pixelSize?: number
  className?: string
  onClick?: () => void
}

export function Avatar({ seed, size = 8, pixelSize = 5, className, onClick }: AvatarProps) {
  const grid = useMemo(() => generateIdenticon(seed, size), [seed, size])
  const totalSize = size * pixelSize

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      onClick={onClick}
      style={{
        borderRadius: '50%',
        cursor: onClick ? 'pointer' : undefined,
        boxShadow: '0 0 0 2px #44475a, 0 0 0 3px #6272a4',
      }}
    >
      <rect width={size} height={size} fill="#282a36" />
      {grid.map((row, y) =>
        row.map((color, x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
        )),
      )}
    </svg>
  )
}
