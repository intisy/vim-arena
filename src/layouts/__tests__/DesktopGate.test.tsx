import { render, screen } from '@testing-library/react'
import { DesktopGate } from '@/components/DesktopGate'

describe('DesktopGate', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  test('renders children when viewport is wide (≥1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
    render(
      <DesktopGate>
        <div>Content</div>
      </DesktopGate>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  test('shows mobile gate message when viewport is narrow (<1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 })
    render(
      <DesktopGate>
        <div>Content</div>
      </DesktopGate>
    )
    expect(screen.getByText(/vim-arena requires a keyboard/i)).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  test('mobile gate has role="alert" for accessibility', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    render(<DesktopGate><div>x</div></DesktopGate>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
