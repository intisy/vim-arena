export interface Theme {
  name: string
  className: string  // CSS class applied to <html> element
  colors: {
    background: string
    foreground: string
    primary: string
    secondary: string
    accent: string
    muted: string
    mutedForeground: string
    border: string
    editorBg: string
    editorFg: string
    editorCursor: string
    editorSelection: string
    editorGutter: string
    success: string
    error: string
    warning: string
  }
}
