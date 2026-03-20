import { lazy } from 'react'

// Lazy load pages for code splitting (good practice even in dev)
const HomePage = lazy(() => import('@/pages/HomePage'))
const LessonsPage = lazy(() => import('@/pages/LessonsPage'))
const LessonViewPage = lazy(() => import('@/pages/LessonViewPage'))
const ChallengesPage = lazy(() => import('@/pages/ChallengesPage'))
const ChallengeViewPage = lazy(() => import('@/pages/ChallengeViewPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export {
  HomePage,
  LessonsPage,
  LessonViewPage,
  ChallengesPage,
  ChallengeViewPage,
  SettingsPage,
  NotFoundPage,
}
