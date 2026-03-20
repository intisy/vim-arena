import { terminalGreen } from './terminal-green'
import { cyberpunkNeon } from './cyberpunk-neon'
import { cleanLight } from './clean-light'
import { dracula } from './dracula'
import type { Theme } from './types'

export const themes: Theme[] = [terminalGreen, cyberpunkNeon, cleanLight, dracula]
export const defaultTheme = 'theme-dracula'
export type { Theme }
export { terminalGreen, cyberpunkNeon, cleanLight, dracula }
