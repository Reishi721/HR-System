-- 1. Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee'::public.user_role)
  );

  -- Give some initial leave balance assuming they are just started
  -- (Can be adjusted or moved to HR management)
  INSERT INTO public.leave_balances (user_id, year, total_allocated, total_used)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::INT, 12, 0);

  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users triggering the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
