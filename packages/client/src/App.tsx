import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
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
  PvPPage,
  PvPRace,
} from '@/router'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DesktopGate>
            <KeyboardHelp />
            <BrowserRouter basename="/vim-arena">
              <Routes>
                <Route element={<MainLayout />}>
                  <Route index element={<Suspense fallback={null}><HomePage /></Suspense>} />
                  <Route path="lessons" element={<ProtectedRoute><Suspense fallback={null}><LessonsPage /></Suspense></ProtectedRoute>} />
                  <Route path="challenges" element={<Suspense fallback={null}><ChallengesPage /></Suspense>} />
                  <Route path="challenges/:challengeId" element={<Suspense fallback={null}><ChallengeViewPage /></Suspense>} />
                  <Route path="pvp" element={<ProtectedRoute><Suspense fallback={null}><PvPPage /></Suspense></ProtectedRoute>} />
                  <Route path="pvp/race/:matchId" element={<ProtectedRoute><Suspense fallback={null}><PvPRace /></Suspense></ProtectedRoute>} />
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
    </QueryClientProvider>
  )
}

export default App
