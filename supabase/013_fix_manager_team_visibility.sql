-- ================================================================
-- Migration 013: Fix Manager Team Visibility
-- ================================================================
-- Problem: Managers can only see employees/data whose manager_id is
-- explicitly set to their ID. Employees in the same company (PT)
-- don't appear in the manager's team.
--
-- Fix: Add SECURITY DEFINER helper + update RLS policies on
-- profiles, attendances, leave_requests, and overtimes to use
-- same-company logic instead of only manager_id.
-- ================================================================

-- 1. Helper function to get current user's company_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Helper: check if a given user_id is in the same company as auth user
CREATE OR REPLACE FUNCTION public.is_same_company(target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_user_id
      AND p.company_id IS NOT NULL
      AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ================================================================
-- 2. PROFILES: Allow same-company visibility
-- ================================================================
CREATE POLICY "Same company can view profiles" ON public.profiles
  FOR SELECT USING (
    company_id IS NOT NULL
    AND company_id = public.get_auth_company_id()
  );

-- ================================================================
-- 3. ATTENDANCES: Allow managers to view same-company attendance
-- ================================================================
-- Drop old policy that only checks manager_id
DROP POLICY IF EXISTS "Managers can view team attendance" ON public.attendances;

-- New policy: managers can view attendance of same-company employees
CREATE POLICY "Managers can view team attendance" ON public.attendances
  FOR SELECT USING (
    public.get_auth_role() = 'manager'
    AND public.is_same_company(user_id)
  );

-- ================================================================
-- 4. LEAVE_REQUESTS: Allow managers to view/update same-company requests
-- ================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Managers can view and update requests from their employees" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can update requests from their employees" ON public.leave_requests;

-- New policies: managers handle leave requests from same-company employees
CREATE POLICY "Managers can view team leave requests" ON public.leave_requests
  FOR SELECT USING (
    public.get_auth_role() = 'manager'
    AND public.is_same_company(user_id)
  );

CREATE POLICY "Managers can update team leave requests" ON public.leave_requests
  FOR UPDATE USING (
    public.get_auth_role() = 'manager'
    AND public.is_same_company(user_id)
  );

-- ================================================================
-- 5. OVERTIMES: Allow managers to view/update same-company overtimes
-- ================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Managers view team overtimes" ON public.overtimes;
DROP POLICY IF EXISTS "Managers update team overtimes" ON public.overtimes;

-- New policies: managers handle overtimes from same-company employees
CREATE POLICY "Managers can view team overtimes" ON public.overtimes
  FOR SELECT USING (
    public.get_auth_role() = 'manager'
    AND public.is_same_company(user_id)
  );

CREATE POLICY "Managers can update team overtimes" ON public.overtimes
  FOR UPDATE USING (
    public.get_auth_role() = 'manager'
    AND public.is_same_company(user_id)
  );
