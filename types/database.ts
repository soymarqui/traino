export type Muscle = {
  id: string
  name: string
  slug: string
}

export type Exercise = {
  id: string
  name: string
  muscle_id: string
  secondary_muscles: string[]
  suggested_sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
  equipment: string[] | null
  unit: 'reps' | 'time'
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  notes: string | null
  active: boolean
  is_warmup: boolean
  video_url: string | null
  created_at: string
  muscle?: Muscle
}

export type ExerciseRequest = {
  id: string
  user_id: string
  name: string
  muscle_id: string
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type MuscleGroup = {
  id: string
  user_id: string
  name: string
  muscles: string[]
  is_default: boolean
  created_at: string
}

export type Equipment =
  | 'maquina'
  | 'mancuernas'
  | 'barra'
  | 'polea'
  | 'peso_corporal'

export type UserExerciseSet = {
  id: string
  user_exercise_id: string
  set_number: number
  reps: number | null
  reps_max: number | null
  duration_seconds: number | null
  to_failure: boolean
  weight: number | null
}

export type UserExercise = {
  id: string
  user_id: string
  exercise_id: string
  rest_seconds: number | null
  equipment: Equipment | null
  unilateral: boolean
  notes: string | null
  position: number
  created_at: string
  exercise?: Exercise
  sets?: UserExerciseSet[]
}

export type RoutineVisibility = 'private' | 'unlisted' | 'public'

export type Routine = {
  id: string
  owner_id: string
  name: string
  is_public: boolean
  visibility: RoutineVisibility
  created_at: string
  exercises?: RoutineExercise[]
}

export type RoutineDay = {
  id: string
  routine_id: string
  name: string
  position: number
}

export type RoutineExercise = {
  id: string
  routine_id: string
  routine_day_id: string | null
  exercise_id: string
  rest_seconds: number | null
  equipment: Equipment | null
  unilateral: boolean
  notes: string | null
  position: number
  exercise?: Exercise
  sets?: RoutineExerciseSet[]
}

export type RoutineExerciseSet = {
  id: string
  routine_exercise_id: string
  set_number: number
  reps: number | null
  reps_max: number | null
  duration_seconds: number | null
  to_failure: boolean
  weight: number | null
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