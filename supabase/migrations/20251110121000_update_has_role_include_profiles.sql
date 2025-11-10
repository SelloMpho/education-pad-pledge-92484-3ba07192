-- Migration: 20251110121000
-- Update has_role to also check profiles.user_type for role membership

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  ) OR (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND user_type::text = _role::text
    )
  );
$$;