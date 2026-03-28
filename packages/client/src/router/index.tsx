import { lazy } from 'react'

const HomePage = lazy(() => import('@/pages/HomePage'))
const LessonsPage = lazy(() => import('@/pages/LessonsPage'))
const LessonViewPage = lazy(() => import('@/pages/LessonViewPage'))
const ChallengesPage = lazy(() => import('@/pages/ChallengesPage'))
const ChallengeViewPage = lazy(() => import('@/pages/ChallengeViewPage'))
const StatsPage = lazy(() => import('@/pages/StatsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const PvPPage = lazy(() => import('@/pages/PvPPage'))
const PvPRace = lazy(() => import('@/components/PvPRace'))
const PvPReplay = lazy(() => import('@/pages/PvPReplay'))

export {
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
  PvPReplay,
}
