type CommandCategory =
  | 'basic-motion'
  | 'word-motion'
  | 'line-motion'
  | 'vertical-motion'
  | 'search-motion'
  | 'editing'
  | 'insert'
  | 'visual'
  | 'yank-paste'
  | 'undo-redo'
  | 'text-object'

const COMMAND_CATEGORIES: Record<string, CommandCategory> = {
  h: 'basic-motion',
  j: 'vertical-motion',
  k: 'vertical-motion',
  l: 'basic-motion',
  w: 'word-motion',
  W: 'word-motion',
  b: 'word-motion',
  B: 'word-motion',
  e: 'word-motion',
  E: 'word-motion',
  ge: 'word-motion',
  '0': 'line-motion',
  '^': 'line-motion',
  $: 'line-motion',
  f: 'search-motion',
  F: 'search-motion',
  t: 'search-motion',
  T: 'search-motion',
  '/': 'search-motion',
  '?': 'search-motion',
  n: 'search-motion',
  N: 'search-motion',
  gg: 'vertical-motion',
  G: 'vertical-motion',
  '{': 'vertical-motion',
  '}': 'vertical-motion',
  H: 'vertical-motion',
  M: 'vertical-motion',
  L: 'vertical-motion',

  x: 'editing',
  X: 'editing',
  r: 'editing',
  d: 'editing',
  dd: 'editing',
  dw: 'editing',
  db: 'editing',
  de: 'editing',
  dW: 'editing',
  dB: 'editing',
  dE: 'editing',
  D: 'editing',
  diw: 'editing',
  daw: 'editing',
  'di(': 'editing',
  'da(': 'editing',
  'di{': 'editing',
  'da{': 'editing',
  'di[': 'editing',
  'da[': 'editing',
  'di"': 'editing',
  "di'": 'editing',
  'da"': 'editing',
  "da'": 'editing',
  'di`': 'editing',
  'da`': 'editing',
  dip: 'editing',
  dap: 'editing',
  c: 'editing',
  cc: 'editing',
  cw: 'editing',
  cb: 'editing',
  ce: 'editing',
  C: 'editing',
  ciw: 'editing',
  caw: 'editing',
  'ci(': 'editing',
  'ca(': 'editing',
  'ci{': 'editing',
  'ca{': 'editing',
  'ci[': 'editing',
  'ca[': 'editing',
  'ci"': 'editing',
  "ci'": 'editing',
  'ca"': 'editing',
  "ca'": 'editing',
  'ci`': 'editing',
  'ca`': 'editing',
  cip: 'editing',
  cap: 'editing',
  s: 'editing',
  S: 'editing',
  J: 'editing',

  i: 'insert',
  I: 'insert',
  a: 'insert',
  A: 'insert',
  o: 'insert',
  O: 'insert',

  v: 'visual',
  V: 'visual',

  y: 'yank-paste',
  yy: 'yank-paste',
  yw: 'yank-paste',
  yiw: 'yank-paste',
  yaw: 'yank-paste',
  p: 'yank-paste',
  P: 'yank-paste',

  u: 'undo-redo',

  iw: 'text-object',
  aw: 'text-object',
  ip: 'text-object',
  ap: 'text-object',
  'i(': 'text-object',
  'a(': 'text-object',
  'i{': 'text-object',
  'a{': 'text-object',
  'i[': 'text-object',
  'a[': 'text-object',
  'i"': 'text-object',
  "i'": 'text-object',
  'a"': 'text-object',
  "a'": 'text-object',
  'i`': 'text-object',
  'a`': 'text-object',
}

const CATEGORY_HIERARCHY: Record<CommandCategory, CommandCategory[]> = {
  'basic-motion': [],
  'word-motion': ['basic-motion'],
  'line-motion': ['basic-motion'],
  'vertical-motion': ['basic-motion', 'line-motion'],
  'search-motion': ['basic-motion', 'word-motion', 'line-motion', 'vertical-motion'],
  'editing': ['basic-motion', 'word-motion', 'line-motion', 'vertical-motion', 'search-motion'],
  'insert': ['basic-motion', 'word-motion', 'line-motion', 'vertical-motion'],
  'visual': ['basic-motion', 'word-motion', 'line-motion', 'vertical-motion'],
  'yank-paste': ['basic-motion', 'word-motion', 'line-motion', 'vertical-motion'],
  'undo-redo': [],
  'text-object': [],
}

const ALWAYS_ALLOWED_KEYS = new Set(['Escape', 'Enter', 'Backspace', 'Tab'])

function getCategory(command: string): CommandCategory | undefined {
  return COMMAND_CATEGORIES[command]
}

function getAllKeysForCategories(categories: Set<CommandCategory>): Set<string> {
  const keys = new Set<string>()
  for (const [cmd, cat] of Object.entries(COMMAND_CATEGORIES)) {
    if (categories.has(cat)) {
      if (cmd.length === 1) {
        keys.add(cmd)
      }
    }
  }
  return keys
}

export function buildAllowedKeys(requiredCommands: string[]): string[] | undefined {
  if (requiredCommands.length === 0) return undefined

  const requiredCategories = new Set<CommandCategory>()
  const explicitKeys = new Set<string>()

  for (const cmd of requiredCommands) {
    const cat = getCategory(cmd)
    if (cat) {
      requiredCategories.add(cat)
      for (const dep of CATEGORY_HIERARCHY[cat]) {
        requiredCategories.add(dep)
      }
    }

    for (const ch of cmd) {
      explicitKeys.add(ch)
    }
  }

  if (requiredCategories.has('editing') || requiredCategories.has('insert')) {
    requiredCategories.add('undo-redo')
  }

  const categoryKeys = getAllKeysForCategories(requiredCategories)

  const allAllowed = new Set([...categoryKeys, ...explicitKeys, ...ALWAYS_ALLOWED_KEYS])

  for (const ch of '0123456789') {
    allAllowed.add(ch)
  }

  return [...allAllowed]
}

export function buildPracticeKeys(requiredCommands: string[]): string[] | undefined {
  if (requiredCommands.length === 0) return undefined

  const keys = new Set<string>()
  for (const cmd of requiredCommands) {
    for (const ch of cmd) {
      keys.add(ch)
    }
  }

  keys.add('Escape')

  return [...keys]
}

export function shouldBlockKey(key: string, allowedKeys: string[] | undefined): boolean {
  if (!allowedKeys) return false
  if (ALWAYS_ALLOWED_KEYS.has(key)) return false
  if (key.length > 1 && key.startsWith('Arrow')) return false
  if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return false
  return !allowedKeys.includes(key)
}
