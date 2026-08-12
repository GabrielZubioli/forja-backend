import { column, Schema, Table } from "@powersync/common";

/**
 * Schema local (SQLite) do PowerSync — espelho das tabelas do Postgres/Supabase.
 *
 * O PowerSync gerencia a coluna `id` (text) implicitamente, então ela não é
 * declarada aqui. Tipos locais são limitados a text / integer / real:
 *  - TIMESTAMPTZ, DATE, UUID, enums  → text
 *  - NUMERIC                          → real
 *  - BOOLEAN                          → integer (0/1)
 *
 * Inclui tabelas ainda não criadas no Postgres (exercise_muscles,
 * progression_settings, tdee_estimates) — elas entram nas migrations do
 * Milestone 1; o schema local já as antecipa.
 */

const profiles = new Table({
  display_name: column.text,
  avatar_url: column.text,
  sex: column.text,
  birth_date: column.text,
  height_cm: column.real,
  activity_level: column.text,
  goal: column.text,
  unit_system: column.text,
  onboarding_completed: column.integer,
  daily_kcal_target: column.real,
  protein_g_target: column.real,
  carbs_g_target: column.real,
  fat_g_target: column.real,
  fiber_g_target: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const user_roles = new Table({
  user_id: column.text,
  role: column.text,
  created_at: column.text,
});

const exercises = new Table(
  {
    owner_id: column.text,
    name: column.text,
    category: column.text,
    equipment: column.text,
    primary_muscle: column.text,
    instructions: column.text,
    is_public: column.integer,
    deleted_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { owner: ["owner_id"], primary: ["primary_muscle"] } },
);

const exercise_muscles = new Table(
  {
    exercise_id: column.text,
    muscle: column.text,
    weight: column.real,
    is_primary: column.integer,
    created_at: column.text,
  },
  { indexes: { exercise: ["exercise_id"] } },
);

const workout_templates = new Table({
  user_id: column.text,
  name: column.text,
  notes: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const workout_template_exercises = new Table(
  {
    template_id: column.text,
    exercise_id: column.text,
    position: column.integer,
    target_sets: column.integer,
    target_reps: column.integer,
    rest_seconds: column.integer,
    superset_group: column.integer,
    notes: column.text,
    created_at: column.text,
  },
  { indexes: { template: ["template_id"] } },
);

const progression_settings = new Table(
  {
    user_id: column.text,
    exercise_id: column.text,
    min_reps: column.integer,
    max_reps: column.integer,
    increment_kg: column.real,
    working_sets: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { user_exercise: ["user_id", "exercise_id"] } },
);

const workout_sessions = new Table(
  {
    user_id: column.text,
    template_id: column.text,
    name: column.text,
    started_at: column.text,
    ended_at: column.text,
    duration_seconds: column.integer,
    notes: column.text,
    total_volume_kg: column.real,
    deleted_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { user_started: ["user_id", "started_at"] } },
);

const workout_sets = new Table(
  {
    session_id: column.text,
    exercise_id: column.text,
    position: column.integer,
    set_index: column.integer,
    set_type: column.text,
    weight_kg: column.real,
    reps: column.integer,
    distance_m: column.real,
    duration_seconds: column.integer,
    rpe: column.real,
    rest_seconds: column.integer,
    /** Descanso efetivamente registrado pelo cronômetro (segundos). */
    rest_actual_seconds: column.integer,
    is_pr: column.integer,
    completed: column.integer,
    notes: column.text,
    created_at: column.text,
  },
  { indexes: { session: ["session_id"], exercise: ["exercise_id"] } },
);

const foods = new Table(
  {
    owner_id: column.text,
    name: column.text,
    brand: column.text,
    barcode: column.text,
    source: column.text,
    serving_size_g: column.real,
    serving_unit: column.text,
    kcal: column.real,
    protein_g: column.real,
    carbs_g: column.real,
    fat_g: column.real,
    fiber_g: column.real,
    sugar_g: column.real,
    sodium_mg: column.real,
    saturated_fat_g: column.real,
    is_public: column.integer,
    deleted_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { barcode: ["barcode"] } },
);

const food_log_entries = new Table(
  {
    user_id: column.text,
    food_id: column.text,
    log_date: column.text,
    meal_type: column.text,
    servings: column.real,
    grams: column.real,
    notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { user_date: ["user_id", "log_date"] } },
);

const recipes = new Table({
  user_id: column.text,
  name: column.text,
  servings: column.real,
  notes: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_items = new Table(
  {
    recipe_id: column.text,
    food_id: column.text,
    grams: column.real,
    created_at: column.text,
  },
  { indexes: { recipe: ["recipe_id"] } },
);

const body_weights = new Table(
  {
    user_id: column.text,
    log_date: column.text,
    weight_kg: column.real,
    notes: column.text,
    created_at: column.text,
  },
  { indexes: { user_date: ["user_id", "log_date"] } },
);

const body_measurements = new Table(
  {
    user_id: column.text,
    log_date: column.text,
    chest_cm: column.real,
    waist_cm: column.real,
    hip_cm: column.real,
    arm_cm: column.real,
    thigh_cm: column.real,
    neck_cm: column.real,
    body_fat_pct: column.real,
    notes: column.text,
    created_at: column.text,
  },
  { indexes: { user_date: ["user_id", "log_date"] } },
);

const progress_photos = new Table({
  user_id: column.text,
  log_date: column.text,
  storage_path: column.text,
  angle: column.text,
  created_at: column.text,
});

const tdee_estimates = new Table(
  {
    user_id: column.text,
    date: column.text,
    weight_kg: column.real,
    tdee_kcal: column.real,
    weight_var: column.real,
    tdee_var: column.real,
    created_at: column.text,
  },
  { indexes: { user_date: ["user_id", "date"] } },
);

export const AppSchema = new Schema({
  profiles,
  user_roles,
  exercises,
  exercise_muscles,
  workout_templates,
  workout_template_exercises,
  progression_settings,
  workout_sessions,
  workout_sets,
  foods,
  food_log_entries,
  recipes,
  recipe_items,
  body_weights,
  body_measurements,
  progress_photos,
  tdee_estimates,
});

export type Database = (typeof AppSchema)["types"];
