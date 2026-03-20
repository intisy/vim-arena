import { render, screen } from '@testing-library/react'
import { VimEditor } from '@/components/VimEditor'

describe('VimEditor', () => {
  test('renders without crashing', () => {
    render(
      <VimEditor initialContent="hello world" />
    )
    // Mode indicator always renders
    expect(screen.getByTestId('vim-mode-indicator')).toBeInTheDocument()
  })

  test('shows NORMAL mode indicator by default', () => {
    render(<VimEditor initialContent="test content" />)
    expect(screen.getByText(/normal/i)).toBeInTheDocument()
  })

  test('accepts language prop without crashing', () => {
    const { unmount } = render(
      <VimEditor initialContent="const x = 1" language="typescript" />
    )
    expect(screen.getByTestId('vim-mode-indicator')).toBeInTheDocument()
    unmount()
  })

  test('mode indicator has accessible aria-label', () => {
    render(<VimEditor initialContent="x" />)
    expect(screen.getByLabelText(/vim mode/i)).toBeInTheDocument()
  })
})
