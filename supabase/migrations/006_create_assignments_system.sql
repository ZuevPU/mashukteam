-- Create User Types table
CREATE TABLE IF NOT EXISTS public.user_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default user types
INSERT INTO public.user_types (name, slug) VALUES
('Тип 1', 'type_1'),
('Тип 2', 'type_2'),
('Тип 3', 'type_3'),
('Тип 4', 'type_4'),
('Тип 5', 'type_5')
ON CONFLICT (slug) DO NOTHING;

-- Create Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    answer_format TEXT DEFAULT 'text' CHECK (answer_format IN ('text', 'number', 'link')),
    reward INTEGER DEFAULT 0 NOT NULL,
    target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'user_type', 'individual')),
    target_values TEXT[] DEFAULT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create Assignment Submissions table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, assignment_id)
);

-- Disable RLS for service_role access (backend uses service_role key)
ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service_role (backend)
CREATE POLICY "Service role full access on user_types" ON public.user_types FOR ALL USING (true);
CREATE POLICY "Service role full access on assignments" ON public.assignments FOR ALL USING (true);
CREATE POLICY "Service role full access on submissions" ON public.assignment_submissions FOR ALL USING (true);
