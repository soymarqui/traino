export type Muscle = {
  id: string
  name: string
  slug: string
}

export type Exercise = {
  id: string
  user_id: string
  name: string
  muscle_id: string
  secondary_muscles: string[]
  suggested_sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
  equipment: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  notes: string | null
  active: boolean
  video_url: string | null
  created_at: string
  muscle?: Muscle
}

export type MuscleGroup = {
  id: string
  user_id: string
  name: string
  muscles: string[]
  is_default: boolean
  created_at: string
}

export type Workout = {
  id: string
  user_id: string
  muscle_group_id: string | null
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
}

export type Set = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps_target: number | null
  reps_actual: number | null
  rpe: number | null
  completed: boolean
  created_at: string
}