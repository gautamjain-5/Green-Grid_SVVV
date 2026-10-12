CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First account created becomes the campus admin; later sign-ups get no access until granted.
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_assign_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_admin();

CREATE TABLE public.device_controls (
  device_id text PRIMARY KEY,
  is_on boolean NOT NULL DEFAULT true,
  auto_mode boolean NOT NULL DEFAULT false,
  setpoint integer NOT NULL DEFAULT 24 CHECK (setpoint BETWEEN 16 AND 30),
  fan_speed integer NOT NULL DEFAULT 3 CHECK (fan_speed BETWEEN 0 AND 5),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.device_controls TO authenticated;
GRANT ALL ON public.device_controls TO service_role;
ALTER TABLE public.device_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read controls" ON public.device_controls FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert controls" ON public.device_controls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update controls" ON public.device_controls FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.control_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  action text NOT NULL,
  actor uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX control_log_created_idx ON public.control_log (created_at DESC);
GRANT SELECT, INSERT ON public.control_log TO authenticated;
GRANT ALL ON public.control_log TO service_role;
ALTER TABLE public.control_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read log" ON public.control_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write log" ON public.control_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.device_controls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.control_log;