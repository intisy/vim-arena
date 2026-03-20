import { HashRouter, Routes, Route } from 'react-router-dom'
import { Suspense } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { DesktopGate } from '@/components/DesktopGate'
import { KeyboardHelp } from '@/components/KeyboardHelp'
import { MainLayout } from '@/layouts/MainLayout'
import {
  HomePage,
  LessonsPage,
  LessonViewPage,
  ChallengesPage,
  ChallengeViewPage,
  SettingsPage,
  NotFoundPage,
} from '@/router'

function App() {
  return (
    <ThemeProvider>
      <DesktopGate>
        <KeyboardHelp />
        <HashRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<Suspense fallback={null}><HomePage /></Suspense>} />
              <Route path="lessons" element={<Suspense fallback={null}><LessonsPage /></Suspense>} />
              <Route path="lessons/:lessonId" element={<Suspense fallback={null}><LessonViewPage /></Suspense>} />
              <Route path="challenges" element={<Suspense fallback={null}><ChallengesPage /></Suspense>} />
              <Route path="challenges/:challengeId" element={<Suspense fallback={null}><ChallengeViewPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={null}><SettingsPage /></Suspense>} />
              <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
            </Route>
          </Routes>
        </HashRouter>
      </DesktopGate>
    </ThemeProvider>
  )
}

export default App
