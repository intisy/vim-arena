import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { DesktopGate } from '@/components/DesktopGate'
import { KeyboardHelp } from '@/components/KeyboardHelp'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/layouts/MainLayout'
import {
  HomePage,
  LessonsPage,
  LessonViewPage,
  ChallengesPage,
  ChallengeViewPage,
  StatsPage,
  SettingsPage,
  NotFoundPage,
} from '@/router'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DesktopGate>
          <KeyboardHelp />
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<Suspense fallback={null}><HomePage /></Suspense>} />
                <Route path="lessons" element={<ProtectedRoute><Suspense fallback={null}><LessonsPage /></Suspense></ProtectedRoute>} />
                <Route path="challenges" element={<ProtectedRoute><Suspense fallback={null}><ChallengesPage /></Suspense></ProtectedRoute>} />
                <Route path="challenges/:challengeId" element={<ProtectedRoute><Suspense fallback={null}><ChallengeViewPage /></Suspense></ProtectedRoute>} />
                <Route path="stats" element={<ProtectedRoute><Suspense fallback={null}><StatsPage /></Suspense></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute><Suspense fallback={null}><SettingsPage /></Suspense></ProtectedRoute>} />
                <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
              </Route>
              <Route path="lessons/:lessonId" element={<ProtectedRoute><Suspense fallback={null}><LessonViewPage /></Suspense></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </DesktopGate>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
