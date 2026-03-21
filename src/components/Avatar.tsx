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

const PALETTES = [
  ['#50fa7b', '#1e1f29'],
  ['#ff79c6', '#1e1f29'],
  ['#bd93f9', '#1e1f29'],
  ['#ffb86c', '#1e1f29'],
  ['#8be9fd', '#1e1f29'],
  ['#f1fa8c', '#1e1f29'],
  ['#ff5555', '#1e1f29'],
  ['#6272a4', '#1e1f29'],
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
      row.push(rand() > 0.5 ? palette[0] : palette[1])
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

export function Avatar({ seed, size = 5, pixelSize = 6, className, onClick }: AvatarProps) {
  const grid = useMemo(() => generateIdenticon(seed, size), [seed, size])
  const totalSize = size * pixelSize

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      onClick={onClick}
      style={{ borderRadius: '50%', cursor: onClick ? 'pointer' : undefined }}
    >
      <rect width={size} height={size} fill="#1e1f29" />
      {grid.map((row, y) =>
        row.map((color, x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
        )),
      )}
    </svg>
  )
}
