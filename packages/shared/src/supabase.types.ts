// TypeScript types matching the Supabase DB schema (001_initial.sql)
// These are the row-level types used throughout the app.
// NOTE: All row types MUST be `type` aliases (not `interface`) so they satisfy
// Record<string, unknown> required by @supabase/postgrest-js GenericTable.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Profile = {
  id: string
  username: string
  avatar_seed: string
  solo_elo: number
  solo_peak_elo: number
  solo_games_played: number
  solo_wins: number
  solo_losses: number
  pvp_elo: number
  pvp_peak_elo: number
  pvp_games_played: number
  pvp_wins: number
  pvp_losses: number
  theme: string
  created_at: string
  updated_at: string
}

export type SoloEloHistoryRow = {
  id: string
  user_id: string
  rating: number
  difficulty: 1 | 2 | 3 | 4 | 5
  score: number
  created_at: string
}

export type LessonProgressRow = {
  user_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
  attempts: number
  steps_completed: number
}

export type ChallengeStatsRow = {
  user_id: string
  template_id: string
  attempts: number
  best_score: number
  best_time_seconds: number
  average_efficiency: number
}

export type ChallengeResultRow = {
  id: string
  user_id: string
  template_id: string
  snippet_id: string
  time_seconds: number
  keystroke_count: number
  reference_keystroke_count: number
  efficiency_score: number
  speed_score: number
  total_score: number
  timed_out: boolean
  created_at: string
}

export type UserStatsRow = {
  user_id: string
  lessons_completed: number
  challenges_attempted: number
  challenges_completed: number
  total_practice_time_seconds: number
  average_challenge_score: number
  best_challenge_score: number
  streak_days: number
  last_active_date: string
  joined_date: string
}

export type PvpMatchStatus = 'active' | 'completed' | 'forfeit' | 'timeout'

export type PvpMatchRow = {
  id: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  challenge_seed: number
  challenge_template_id: string
  challenge_difficulty: 1 | 2 | 3 | 4 | 5
  player1_time_seconds: number | null
  player1_keystrokes: number | null
  player1_completed: boolean
  player2_time_seconds: number | null
  player2_keystrokes: number | null
  player2_completed: boolean
  player1_elo_before: number
  player2_elo_before: number
  player1_elo_after: number | null
  player2_elo_after: number | null
  status: PvpMatchStatus
  time_limit: number
  started_at: string
  finished_at: string | null
}

export type MatchmakingQueueRow = {
  id: string
  user_id: string
  pvp_elo: number
  queued_at: string
}

// Supabase Database type map (for typed client usage)
// Includes Relationships, Views, Functions required by @supabase/postgrest-js GenericSchema.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'username'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      solo_elo_history: {
        Row: SoloEloHistoryRow
        Insert: Omit<SoloEloHistoryRow, 'id' | 'created_at'>
        Update: Partial<Omit<SoloEloHistoryRow, 'id'>>
        Relationships: [
          {
            foreignKeyName: "solo_elo_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: LessonProgressRow
        Insert: Partial<LessonProgressRow> & Pick<LessonProgressRow, 'user_id' | 'lesson_id'>
        Update: Partial<Omit<LessonProgressRow, 'user_id' | 'lesson_id'>>
        Relationships: [
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_stats: {
        Row: ChallengeStatsRow
        Insert: Partial<ChallengeStatsRow> & Pick<ChallengeStatsRow, 'user_id' | 'template_id'>
        Update: Partial<Omit<ChallengeStatsRow, 'user_id' | 'template_id'>>
        Relationships: [
          {
            foreignKeyName: "challenge_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_results: {
        Row: ChallengeResultRow
        Insert: Omit<ChallengeResultRow, 'id' | 'created_at'>
        Update: Partial<Omit<ChallengeResultRow, 'id'>>
        Relationships: [
          {
            foreignKeyName: "challenge_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: UserStatsRow
        Insert: Partial<UserStatsRow> & Pick<UserStatsRow, 'user_id'>
        Update: Partial<Omit<UserStatsRow, 'user_id'>>
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_matches: {
        Row: PvpMatchRow
        Insert: Omit<PvpMatchRow, 'id' | 'started_at' | 'finished_at' | 'winner_id' | 'player1_time_seconds' | 'player1_keystrokes' | 'player1_completed' | 'player2_time_seconds' | 'player2_keystrokes' | 'player2_completed' | 'player1_elo_after' | 'player2_elo_after' | 'status'> & Partial<Pick<PvpMatchRow, 'status' | 'time_limit'>>
        Update: Partial<Omit<PvpMatchRow, 'id' | 'started_at'>>
        Relationships: [
          {
            foreignKeyName: "pvp_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pvp_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: MatchmakingQueueRow
        Insert: Omit<MatchmakingQueueRow, 'id' | 'queued_at'>
        Update: Partial<Omit<MatchmakingQueueRow, 'id'>>
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      join_matchmaking_queue: {
        Args: Record<string, never>
        Returns: Json
      }
      leave_matchmaking_queue: {
        Args: Record<string, never>
        Returns: Json
      }
      get_matchmaking_status: {
        Args: Record<string, never>
        Returns: Json
      }
      submit_race_result: {
        Args: {
          p_match_id: string
          p_time_seconds?: number | null
          p_keystroke_count?: number
          p_completed?: boolean
        }
        Returns: Json
      }
      submit_replay_data: {
        Args: {
          p_match_id: string
          p_replay_data: string
        }
        Returns: Json
      }
      get_pvp_history: {
        Args: {
          p_limit?: number
        }
        Returns: Json
      }
      get_match_replay: {
        Args: {
          p_match_id: string
        }
        Returns: Json
      }
      submit_solo_result: {
        Args: {
          p_template_id: string
          p_snippet_id: string
          p_time_seconds: number
          p_keystroke_count: number
          p_reference_keystroke_count: number
          p_difficulty: number
          p_timed_out: boolean
          p_time_limit: number
          p_is_practice?: boolean
          p_is_retry?: boolean
        }
        Returns: Json
      }
      record_lesson_completed: {
        Args: {
          p_lesson_id: string
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
