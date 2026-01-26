-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum para tipos de log
CREATE TYPE public.log_type AS ENUM ('login', 'task_completed', 'task_failed', 'inspect_attempt', 'ban_attempt', 'error');

-- Tabela de contas de estudantes salvas
CREATE TABLE public.student_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ra TEXT NOT NULL,
  student_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, ra)
);

-- Tabela de RAs banidos
CREATE TABLE public.banned_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra TEXT NOT NULL UNIQUE,
  student_name TEXT,
  reason TEXT NOT NULL,
  banned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de logs de atividades
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ra TEXT,
  student_name TEXT,
  log_type log_type NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas para student_accounts (usuários autenticados podem gerenciar suas contas)
CREATE POLICY "Users can view their own accounts"
  ON public.student_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON public.student_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.student_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.student_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para banned_students (todos podem ler para verificar ban, apenas admin pode modificar)
CREATE POLICY "Anyone can check if RA is banned"
  ON public.banned_students FOR SELECT
  USING (true);

CREATE POLICY "Only admins can ban students"
  ON public.banned_students FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update bans"
  ON public.banned_students FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can remove bans"
  ON public.banned_students FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para activity_logs (apenas admin pode ler, inserção pública para logs anônimos)
CREATE POLICY "Only admins can view logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Políticas para user_roles (apenas admin pode gerenciar)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_student_accounts_updated_at
  BEFORE UPDATE ON public.student_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();