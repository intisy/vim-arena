export interface VimCommand {
  description: string
  category: string
  example?: string  // optional usage example
}

export const SUPPORTED_VIM_COMMANDS: Record<string, VimCommand> = {
  // Basic Movement
  'h': { description: 'Move cursor left', category: 'basic-movement', example: '5h (move 5 left)' },
  'j': { description: 'Move cursor down', category: 'basic-movement', example: '3j (move 3 down)' },
  'k': { description: 'Move cursor up', category: 'basic-movement' },
  'l': { description: 'Move cursor right', category: 'basic-movement' },

  // Word Movement
  'w': { description: 'Move to next word start', category: 'word-movement', example: 'dw (delete word)' },
  'e': { description: 'Move to word end', category: 'word-movement', example: 'de (delete to word end)' },
  'b': { description: 'Move to previous word start', category: 'word-movement' },
  'W': { description: 'Move to next WORD start (ignores punctuation)', category: 'word-movement' },
  'E': { description: 'Move to WORD end', category: 'word-movement' },
  'B': { description: 'Move to previous WORD start', category: 'word-movement' },

  // Line Movement
  '0': { description: 'Move to absolute line start', category: 'line-movement' },
  '^': { description: 'Move to first non-blank character', category: 'line-movement' },
  '$': { description: 'Move to line end', category: 'line-movement', example: 'd$ (delete to end)' },

  // Vertical Movement
  'gg': { description: 'Go to first line', category: 'vertical-movement', example: 'gg (top of file)' },
  'G': { description: 'Go to last line', category: 'vertical-movement' },
  '{': { description: 'Jump to previous blank line (paragraph start)', category: 'vertical-movement' },
  '}': { description: 'Jump to next blank line (paragraph end)', category: 'vertical-movement' },
  'Ctrl-u': { description: 'Scroll half page up', category: 'vertical-movement' },
  'Ctrl-d': { description: 'Scroll half page down', category: 'vertical-movement' },

  // Insert Mode
  'i': { description: 'Enter insert mode before cursor', category: 'insert-mode' },
  'a': { description: 'Enter insert mode after cursor', category: 'insert-mode' },
  'I': { description: 'Enter insert mode at line start', category: 'insert-mode' },
  'A': { description: 'Append at line end', category: 'insert-mode' },
  'o': { description: 'Open new line below and enter insert', category: 'insert-mode' },
  'O': { description: 'Open new line above and enter insert', category: 'insert-mode' },
  's': { description: 'Substitute character (delete + insert)', category: 'insert-mode' },
  'S': { description: 'Substitute entire line', category: 'insert-mode' },
  'Esc': { description: 'Return to normal mode', category: 'modes' },

  // Basic Editing
  'x': { description: 'Delete character under cursor', category: 'editing' },
  'X': { description: 'Delete character before cursor', category: 'editing' },
  'r': { description: 'Replace single character (stays in normal mode)', category: 'editing' },
  'R': { description: 'Enter replace mode (overwrite)', category: 'editing' },

  // Delete Operator
  'd': { description: 'Delete operator (requires motion or text object)', category: 'operators', example: 'dw, db, d3j, diw' },
  'dd': { description: 'Delete current line', category: 'operators' },
  'D': { description: 'Delete from cursor to end of line', category: 'operators' },

  // Change Operator
  'c': { description: 'Change operator (delete + enter insert)', category: 'operators', example: 'cw, ci", ca{' },
  'cc': { description: 'Change entire line', category: 'operators' },
  'C': { description: 'Change from cursor to end of line', category: 'operators' },

  // Yank Operator
  'y': { description: 'Yank (copy) operator', category: 'operators', example: 'yy, yw, yi"' },
  'yy': { description: 'Yank current line', category: 'operators' },
  'Y': { description: 'Yank to end of line', category: 'operators' },

  // Paste
  'p': { description: 'Paste after cursor / below line', category: 'operators' },
  'P': { description: 'Paste before cursor / above line', category: 'operators' },

  // Find / Till
  'f': { description: 'Find character forward (cursor ON char)', category: 'find', example: 'fa (find next a)' },
  'F': { description: 'Find character backward', category: 'find' },
  't': { description: 'Till character forward (cursor BEFORE char)', category: 'find', example: 'dt; (delete till semicolon)' },
  'T': { description: 'Till character backward', category: 'find' },
  ';': { description: 'Repeat last f/F/t/T forward', category: 'find' },
  ',': { description: 'Repeat last f/F/t/T backward', category: 'find' },

  // Search
  '/': { description: 'Search forward', category: 'search', example: '/function (find next function)' },
  '?': { description: 'Search backward', category: 'search' },
  'n': { description: 'Jump to next search match', category: 'search' },
  'N': { description: 'Jump to previous search match', category: 'search' },
  '*': { description: 'Search word under cursor forward', category: 'search' },
  '#': { description: 'Search word under cursor backward', category: 'search' },

  // Visual Mode
  'v': { description: 'Enter characterwise visual mode', category: 'visual' },
  'V': { description: 'Enter linewise visual mode', category: 'visual' },

  // Text Objects (used after operators d/c/y/v)
  'iw': { description: 'Inner word text object', category: 'text-objects', example: 'diw (delete word without space)' },
  'aw': { description: 'Around word (includes trailing space)', category: 'text-objects', example: 'daw (delete word with space)' },
  'iW': { description: 'Inner WORD text object', category: 'text-objects' },
  'aW': { description: 'Around WORD text object', category: 'text-objects' },
  'i"': { description: 'Inside double quotes', category: 'text-objects', example: 'ci" (change inside quotes)' },
  'a"': { description: 'Around double quotes (includes quotes)', category: 'text-objects' },
  "i'": { description: 'Inside single quotes', category: 'text-objects' },
  "a'": { description: 'Around single quotes', category: 'text-objects' },
  'i`': { description: 'Inside backticks', category: 'text-objects' },
  'a`': { description: 'Around backticks', category: 'text-objects' },
  'i(': { description: 'Inside parentheses', category: 'text-objects', example: 'di( (delete inside parens)' },
  'a(': { description: 'Around parentheses', category: 'text-objects' },
  'i{': { description: 'Inside curly braces', category: 'text-objects', example: 'ci{ (change inside braces)' },
  'a{': { description: 'Around curly braces', category: 'text-objects' },
  'i[': { description: 'Inside square brackets', category: 'text-objects' },
  'a[': { description: 'Around square brackets', category: 'text-objects' },
  'i<': { description: 'Inside angle brackets', category: 'text-objects' },
  'a<': { description: 'Around angle brackets', category: 'text-objects' },
  'ip': { description: 'Inner paragraph', category: 'text-objects' },
  'ap': { description: 'Around paragraph', category: 'text-objects' },

  // Misc
  '.': { description: 'Repeat last change', category: 'misc' },
  'u': { description: 'Undo last change', category: 'misc' },
  'Ctrl-r': { description: 'Redo (reverse undo)', category: 'misc' },
}

// Convenience: set of all supported command keys for fast lookup
export const SUPPORTED_COMMAND_KEYS = new Set(Object.keys(SUPPORTED_VIM_COMMANDS))

// The BLACKLISTED commands — must never appear in lesson requiredCommands
export const UNSUPPORTED_VIM_COMMANDS = ['zc', 'zo', 'zR', 'zM', '%', ':g', 'U', 'gh', 'gH'] as const
