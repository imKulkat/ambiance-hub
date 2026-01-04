-- Create admin user for Kulkat11
-- Note: The user will need to sign up first, then we'll upgrade them to admin
-- This function will be called manually or we can create a trigger

-- Create a function to make a user admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Check if they already have admin role
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin');
    END IF;
  END IF;
END;
$$;