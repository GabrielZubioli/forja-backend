
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TYPE public.sex_t AS ENUM ('male','female','other');
CREATE TYPE public.activity_level_t AS ENUM ('sedentary','light','moderate','active','very_active');
CREATE TYPE public.goal_t AS ENUM ('lose','maintain','gain');
CREATE TYPE public.unit_system_t AS ENUM ('metric','imperial');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  sex public.sex_t,
  birth_date DATE,
  height_cm NUMERIC(5,1),
  activity_level public.activity_level_t DEFAULT 'moderate',
  goal public.goal_t DEFAULT 'maintain',
  unit_system public.unit_system_t NOT NULL DEFAULT 'metric',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  daily_kcal_target NUMERIC(6,1),
  protein_g_target NUMERIC(6,1),
  carbs_g_target NUMERIC(6,1),
  fat_g_target NUMERIC(6,1),
  fiber_g_target NUMERIC(6,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TYPE public.equipment_t AS ENUM ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','band','other','cardio');
CREATE TYPE public.muscle_t AS ENUM (
  'chest','back','lats','traps','shoulders','front_delts','side_delts','rear_delts',
  'biceps','triceps','forearms','core','abs','obliques',
  'quads','hamstrings','glutes','calves','adductors','abductors','cardio','full_body'
);
CREATE TYPE public.exercise_category_t AS ENUM ('strength','cardio','stretching','plyometrics','olympic');

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.exercise_category_t NOT NULL DEFAULT 'strength',
  equipment public.equipment_t NOT NULL DEFAULT 'barbell',
  primary_muscle public.muscle_t NOT NULL,
  secondary_muscles public.muscle_t[] NOT NULL DEFAULT '{}',
  instructions TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_exercises_owner ON public.exercises(owner_id);
CREATE INDEX idx_exercises_primary ON public.exercises(primary_muscle);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exercises" ON public.exercises FOR SELECT TO authenticated USING (deleted_at IS NULL AND (is_public OR owner_id = auth.uid()));
CREATE POLICY "insert own exercise" ON public.exercises FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own exercise" ON public.exercises FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own exercise" ON public.exercises FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own templates" ON public.workout_templates FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position INT NOT NULL,
  target_sets INT DEFAULT 3,
  target_reps INT DEFAULT 10,
  rest_seconds INT DEFAULT 90,
  superset_group INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_template_exercises TO authenticated;
GRANT ALL ON public.workout_template_exercises TO service_role;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own template exercises" ON public.workout_template_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  notes TEXT,
  total_volume_kg NUMERIC(10,2),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user_started ON public.workout_sessions(user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TYPE public.set_type_t AS ENUM ('warmup','working','drop','failure');
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position INT NOT NULL,
  set_index INT NOT NULL,
  set_type public.set_type_t NOT NULL DEFAULT 'working',
  weight_kg NUMERIC(7,2),
  reps INT,
  distance_m NUMERIC(9,2),
  duration_seconds INT,
  rpe NUMERIC(3,1),
  rest_seconds INT,
  is_pr BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sets_session ON public.workout_sets(session_id);
CREATE INDEX idx_sets_exercise ON public.workout_sets(exercise_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.workout_sets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  serving_size_g NUMERIC(8,2) NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  kcal NUMERIC(7,2) NOT NULL DEFAULT 0,
  protein_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  sugar_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  sodium_mg NUMERIC(8,2) NOT NULL DEFAULT 0,
  saturated_fat_g NUMERIC(7,2) NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foods_name ON public.foods USING gin (to_tsvector('simple', name));
CREATE INDEX idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;
GRANT ALL ON public.foods TO service_role;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read foods" ON public.foods FOR SELECT TO authenticated USING (deleted_at IS NULL AND (is_public OR owner_id = auth.uid()));
CREATE POLICY "insert own food" ON public.foods FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own food" ON public.foods FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own food" ON public.foods FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER trg_foods_updated BEFORE UPDATE ON public.foods FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TYPE public.meal_type_t AS ENUM ('breakfast','lunch','dinner','snack');
CREATE TABLE public.food_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type public.meal_type_t NOT NULL DEFAULT 'breakfast',
  servings NUMERIC(8,3) NOT NULL DEFAULT 1,
  grams NUMERIC(8,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_food_log_user_date ON public.food_log_entries(user_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_log_entries TO authenticated;
GRANT ALL ON public.food_log_entries TO service_role;
ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own log entries" ON public.food_log_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_food_log_updated BEFORE UPDATE ON public.food_log_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  servings NUMERIC(6,2) NOT NULL DEFAULT 1,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipes" ON public.recipes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_recipes_updated BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  grams NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_items TO authenticated;
GRANT ALL ON public.recipe_items TO service_role;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipe items" ON public.recipe_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

CREATE TABLE public.body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(6,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
CREATE INDEX idx_body_weights_user_date ON public.body_weights(user_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_weights TO authenticated;
GRANT ALL ON public.body_weights TO service_role;
ALTER TABLE public.body_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weights" ON public.body_weights FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chest_cm NUMERIC(5,1),
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  arm_cm NUMERIC(5,1),
  thigh_cm NUMERIC(5,1),
  neck_cm NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_measures_user_date ON public.body_measurements(user_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measures" ON public.body_measurements FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  angle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.progress_photos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own photo read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Seed exercises
INSERT INTO public.exercises (owner_id, name, category, equipment, primary_muscle, secondary_muscles) VALUES
(NULL,'Supino Reto com Barra','strength','barbell','chest', ARRAY['triceps','front_delts']::public.muscle_t[]),
(NULL,'Supino Inclinado com Barra','strength','barbell','chest', ARRAY['front_delts','triceps']::public.muscle_t[]),
(NULL,'Supino Reto com Halteres','strength','dumbbell','chest', ARRAY['triceps','front_delts']::public.muscle_t[]),
(NULL,'Supino Inclinado com Halteres','strength','dumbbell','chest', ARRAY['front_delts','triceps']::public.muscle_t[]),
(NULL,'Crucifixo com Halteres','strength','dumbbell','chest', ARRAY['front_delts']::public.muscle_t[]),
(NULL,'Crossover no Cabo','strength','cable','chest', ARRAY['front_delts']::public.muscle_t[]),
(NULL,'Peck Deck','strength','machine','chest', ARRAY[]::public.muscle_t[]),
(NULL,'Flexão de Braço','strength','bodyweight','chest', ARRAY['triceps','core']::public.muscle_t[]),
(NULL,'Mergulho no Paralelo','strength','bodyweight','chest', ARRAY['triceps','front_delts']::public.muscle_t[]),
(NULL,'Agachamento Livre','strength','barbell','quads', ARRAY['glutes','hamstrings','core']::public.muscle_t[]),
(NULL,'Agachamento Frontal','strength','barbell','quads', ARRAY['glutes','core']::public.muscle_t[]),
(NULL,'Leg Press 45°','strength','machine','quads', ARRAY['glutes','hamstrings']::public.muscle_t[]),
(NULL,'Cadeira Extensora','strength','machine','quads', ARRAY[]::public.muscle_t[]),
(NULL,'Cadeira Flexora','strength','machine','hamstrings', ARRAY[]::public.muscle_t[]),
(NULL,'Mesa Flexora','strength','machine','hamstrings', ARRAY['glutes']::public.muscle_t[]),
(NULL,'Stiff','strength','barbell','hamstrings', ARRAY['glutes','back']::public.muscle_t[]),
(NULL,'Levantamento Terra','strength','barbell','back', ARRAY['hamstrings','glutes','traps','core']::public.muscle_t[]),
(NULL,'Terra Romeno','strength','barbell','hamstrings', ARRAY['glutes','back']::public.muscle_t[]),
(NULL,'Avanço','strength','dumbbell','quads', ARRAY['glutes','hamstrings']::public.muscle_t[]),
(NULL,'Búlgaro','strength','dumbbell','quads', ARRAY['glutes']::public.muscle_t[]),
(NULL,'Hip Thrust','strength','barbell','glutes', ARRAY['hamstrings']::public.muscle_t[]),
(NULL,'Elevação Pélvica','strength','bodyweight','glutes', ARRAY['hamstrings']::public.muscle_t[]),
(NULL,'Panturrilha em Pé','strength','machine','calves', ARRAY[]::public.muscle_t[]),
(NULL,'Panturrilha Sentado','strength','machine','calves', ARRAY[]::public.muscle_t[]),
(NULL,'Barra Fixa (Pull-up)','strength','bodyweight','lats', ARRAY['biceps','back']::public.muscle_t[]),
(NULL,'Barra Fixa Pegada Supinada','strength','bodyweight','lats', ARRAY['biceps']::public.muscle_t[]),
(NULL,'Puxada na Frente','strength','cable','lats', ARRAY['biceps','back']::public.muscle_t[]),
(NULL,'Puxada Aberta','strength','cable','lats', ARRAY['back']::public.muscle_t[]),
(NULL,'Remada Curvada com Barra','strength','barbell','back', ARRAY['lats','biceps','rear_delts']::public.muscle_t[]),
(NULL,'Remada Cavalinho','strength','barbell','back', ARRAY['lats','biceps']::public.muscle_t[]),
(NULL,'Remada Baixa Cabo','strength','cable','back', ARRAY['lats','biceps']::public.muscle_t[]),
(NULL,'Remada Unilateral com Halter','strength','dumbbell','back', ARRAY['lats','biceps']::public.muscle_t[]),
(NULL,'Pullover com Halter','strength','dumbbell','lats', ARRAY['chest']::public.muscle_t[]),
(NULL,'Encolhimento com Halteres','strength','dumbbell','traps', ARRAY[]::public.muscle_t[]),
(NULL,'Encolhimento com Barra','strength','barbell','traps', ARRAY[]::public.muscle_t[]),
(NULL,'Face Pull','strength','cable','rear_delts', ARRAY['traps']::public.muscle_t[]),
(NULL,'Desenvolvimento com Barra','strength','barbell','shoulders', ARRAY['triceps','front_delts']::public.muscle_t[]),
(NULL,'Desenvolvimento com Halteres','strength','dumbbell','shoulders', ARRAY['triceps','front_delts']::public.muscle_t[]),
(NULL,'Desenvolvimento Arnold','strength','dumbbell','shoulders', ARRAY['triceps']::public.muscle_t[]),
(NULL,'Elevação Lateral','strength','dumbbell','side_delts', ARRAY[]::public.muscle_t[]),
(NULL,'Elevação Frontal','strength','dumbbell','front_delts', ARRAY[]::public.muscle_t[]),
(NULL,'Crucifixo Invertido','strength','dumbbell','rear_delts', ARRAY['traps']::public.muscle_t[]),
(NULL,'Rosca Direta com Barra','strength','barbell','biceps', ARRAY['forearms']::public.muscle_t[]),
(NULL,'Rosca Direta com Halteres','strength','dumbbell','biceps', ARRAY['forearms']::public.muscle_t[]),
(NULL,'Rosca Alternada','strength','dumbbell','biceps', ARRAY[]::public.muscle_t[]),
(NULL,'Rosca Martelo','strength','dumbbell','biceps', ARRAY['forearms']::public.muscle_t[]),
(NULL,'Rosca Scott','strength','barbell','biceps', ARRAY[]::public.muscle_t[]),
(NULL,'Rosca Concentrada','strength','dumbbell','biceps', ARRAY[]::public.muscle_t[]),
(NULL,'Tríceps Testa','strength','barbell','triceps', ARRAY[]::public.muscle_t[]),
(NULL,'Tríceps Corda','strength','cable','triceps', ARRAY[]::public.muscle_t[]),
(NULL,'Tríceps Barra','strength','cable','triceps', ARRAY[]::public.muscle_t[]),
(NULL,'Tríceps Francês','strength','dumbbell','triceps', ARRAY[]::public.muscle_t[]),
(NULL,'Mergulho entre Bancos','strength','bodyweight','triceps', ARRAY['chest']::public.muscle_t[]),
(NULL,'Abdominal Supra','strength','bodyweight','abs', ARRAY[]::public.muscle_t[]),
(NULL,'Abdominal Infra','strength','bodyweight','abs', ARRAY[]::public.muscle_t[]),
(NULL,'Prancha','strength','bodyweight','core', ARRAY['abs']::public.muscle_t[]),
(NULL,'Prancha Lateral','strength','bodyweight','obliques', ARRAY['core']::public.muscle_t[]),
(NULL,'Russian Twist','strength','bodyweight','obliques', ARRAY['abs']::public.muscle_t[]),
(NULL,'Elevação de Pernas','strength','bodyweight','abs', ARRAY['core']::public.muscle_t[]),
(NULL,'Ab Wheel','strength','other','core', ARRAY['abs']::public.muscle_t[]),
(NULL,'Rosca de Punho','strength','barbell','forearms', ARRAY[]::public.muscle_t[]),
(NULL,'Corrida na Esteira','cardio','cardio','cardio', ARRAY[]::public.muscle_t[]),
(NULL,'Bicicleta Ergométrica','cardio','cardio','cardio', ARRAY[]::public.muscle_t[]),
(NULL,'Elíptico','cardio','cardio','cardio', ARRAY[]::public.muscle_t[]),
(NULL,'Remo Ergômetro','cardio','cardio','cardio', ARRAY['back','lats']::public.muscle_t[]),
(NULL,'Escada','cardio','cardio','cardio', ARRAY[]::public.muscle_t[]),
(NULL,'Pular Corda','cardio','cardio','cardio', ARRAY['calves']::public.muscle_t[]),
(NULL,'Caminhada','cardio','cardio','cardio', ARRAY[]::public.muscle_t[]);

INSERT INTO public.foods (owner_id, name, source, serving_size_g, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, saturated_fat_g) VALUES
(NULL,'Arroz branco cozido','tbca',100,128,2.5,28.1,0.2,1.6,1,0.1,0.1),
(NULL,'Arroz integral cozido','tbca',100,124,2.6,25.8,1.0,2.7,1,0.4,0.2),
(NULL,'Feijão preto cozido','tbca',100,77,4.5,14.0,0.5,8.4,2,0.3,0.1),
(NULL,'Feijão carioca cozido','tbca',100,76,4.8,13.6,0.5,8.5,2,0.3,0.1),
(NULL,'Frango peito grelhado','tbca',100,159,32.0,0,3.5,0,80,0,1.0),
(NULL,'Patinho bovino cozido','tbca',100,219,35.9,0,7.3,0,60,0,3.0),
(NULL,'Ovo de galinha inteiro cozido','tbca',100,146,13.3,0.6,9.5,0,140,0.6,3.0),
(NULL,'Batata inglesa cozida','tbca',100,52,1.2,11.9,0.1,1.3,3,0.5,0.0),
(NULL,'Batata doce cozida','tbca',100,77,0.6,18.4,0.1,2.2,9,4.2,0.0),
(NULL,'Mandioca cozida','tbca',100,125,0.6,30.1,0.3,1.6,3,1.7,0.1),
(NULL,'Aveia em flocos','tbca',100,394,13.9,66.6,8.5,9.1,5,0.9,1.6),
(NULL,'Pão francês','tbca',50,150,4.0,29.0,1.5,1.0,320,0.5,0.3),
(NULL,'Leite integral','tbca',100,58,3.2,4.6,3.3,0,50,4.6,2.0),
(NULL,'Iogurte natural','tbca',100,51,4.1,3.7,1.9,0,60,3.7,1.2),
(NULL,'Queijo minas frescal','tbca',100,264,17.4,3.2,20.2,0,340,3.2,12.0),
(NULL,'Banana prata','tbca',100,98,1.3,26.0,0.1,2.0,0,17.4,0.0),
(NULL,'Maçã fuji','tbca',100,56,0.3,15.2,0.1,1.3,0,10.4,0.0),
(NULL,'Mamão papaia','tbca',100,40,0.5,10.4,0.1,1.0,0,7.8,0.0),
(NULL,'Laranja pera','tbca',100,37,1.0,8.9,0.1,4.0,0,7.5,0.0),
(NULL,'Tomate','tbca',100,15,1.1,3.1,0.2,1.2,4,2.6,0.0),
(NULL,'Alface','tbca',100,11,1.4,1.7,0.1,2.0,7,0.4,0.0),
(NULL,'Azeite de oliva extra virgem','tbca',100,884,0,0,100,0,0,0,13.8),
(NULL,'Whey protein (média)','custom',30,120,24.0,3.0,1.5,0.5,60,1.5,0.5),
(NULL,'Creatina monohidratada','custom',5,0,0,0,0,0,0,0,0),
(NULL,'Amendoim cru','tbca',100,544,27.2,20.3,43.9,8.0,3,4.7,6.3);
