import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardHelp } from '@/components/KeyboardHelp'

describe('KeyboardHelp', () => {
  test('does not render initially', () => {
    render(<KeyboardHelp />)
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  test('opens on ? key press', () => {
    render(<KeyboardHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  test('closes on Escape key press', () => {
    render(<KeyboardHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  test('closes on backdrop click', () => {
    render(<KeyboardHelp />)
    fireEvent.keyDown(window, { key: '?' })
    
    const backdrop = screen.getByTestId('keyboard-help-backdrop')
    fireEvent.click(backdrop)
    
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })

  test('does not open if typing in input', () => {
    render(
      <div>
        <input data-testid="test-input" />
        <KeyboardHelp />
      </div>
    )
    
    const input = screen.getByTestId('test-input')
    input.focus()
    fireEvent.keyDown(input, { key: '?' })
    
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument()
  })
})
