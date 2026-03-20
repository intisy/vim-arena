# vim-arena ⚔️

Master Vim. Compete. Dominate.

Vim Arena is an interactive learning platform designed to help you master Vim motions and commands through structured lessons and timed challenges. Whether you're a beginner or a seasoned pro, Vim Arena provides the tools to sharpen your skills and track your progress.

## Features

- 📚 **8 lesson categories** with 40+ interactive lessons
- ⚡ **Timed challenges** with scoring (efficiency + speed)
- 🎨 **4 themes**: Terminal Green, Cyberpunk Neon, Clean Light, Dracula
- 💾 **Progress saved locally** (no account needed)
- ⌨️ **Desktop-only** (vim on a keyboard, always)

## Tech Stack

- **Frontend**: React 19 + Vite 8 + TypeScript 5
- **Editor**: CodeMirror 6 with @replit/codemirror-vim
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest

## Development

```bash
git clone https://github.com/YOUR_USERNAME/vim-arena.git
cd vim-arena
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # run tests
npm run build    # production build
```

## Deployment

This project is configured to automatically deploy to GitHub Pages via GitHub Actions whenever changes are pushed to the `master` branch.

## License

MIT
