-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id VARCHAR(50) REFERENCES public.departments(department_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES public.users(user_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Problems Table
CREATE TABLE IF NOT EXISTS public.problems (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES public.users(user_id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'unsolved', -- 'solved' or 'unsolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    solved_at TIMESTAMP WITH TIME ZONE
);

-- 4. Alter Users Table for Expiry
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMP WITH TIME ZONE;

-- 5. Alter Events Table for Dynamic Schema
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS registration_schema JSONB;

-- 6. RLS Policies for New Tables

-- Feedback: Anyone authenticated can insert, only developer/super admin can select
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()::text AND role IN ('Super Admin', 'Developer'))
);

-- Problems: Anyone authenticated can insert, only developer/super admin can select/update
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert problems" ON public.problems FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Developers can view problems" ON public.problems FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()::text AND role IN ('Super Admin', 'Developer'))
);
CREATE POLICY "Developers can update problems" ON public.problems FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()::text AND role IN ('Super Admin', 'Developer'))
);

-- Branches: Anyone can read, only HOD/Super Admin can modify
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "HODs and Admins can manage branches" ON public.branches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid()::text AND role IN ('Super Admin', 'HOD'))
);
