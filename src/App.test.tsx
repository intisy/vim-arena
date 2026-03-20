import { render, screen } from '@testing-library/react'
import App from './App'

test('renders vim-arena heading', () => {
  render(<App />)
  expect(screen.getByText(/vim-arena/i)).toBeInTheDocument()
})
