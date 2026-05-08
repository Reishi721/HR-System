-- 1. Create a helper function to check roles without triggering RLS recursion
-- SECURITY DEFINER allows the function to bypass RLS check for its Internal query
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Clean up old recursive policies on Profiles
DROP POLICY IF EXISTS "HR can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only HR can insert/update profiles" ON public.profiles;

-- 3. Create new non-recursive policies for Profiles
CREATE POLICY "HR can view all profiles" ON public.profiles 
  FOR SELECT USING (public.get_auth_role() = 'hr');

CREATE POLICY "Only HR can managing all profiles" ON public.profiles 
  FOR ALL USING (public.get_auth_role() = 'hr');

-- 4. Apply the same fix to Leave Balances
DROP POLICY IF EXISTS "HR can view all leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "HR can insert/update leave balances" ON public.leave_balances;

CREATE POLICY "HR can view all leave balances" ON public.leave_balances 
  FOR SELECT USING (public.get_auth_role() = 'hr');

CREATE POLICY "HR manage all leave balances" ON public.leave_balances 
  FOR ALL USING (public.get_auth_role() = 'hr');

-- 5. Apply the same fix to Leave Requests
DROP POLICY IF EXISTS "HR can view and update all requests" ON public.leave_requests;

CREATE POLICY "HR manage all leave requests" ON public.leave_requests 
  FOR ALL USING (public.get_auth_role() = 'hr');
