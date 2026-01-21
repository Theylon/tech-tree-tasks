-- Tech Tree Tasks - Row Level Security Policies
-- Run this in Supabase SQL Editor AFTER 00001

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if user is project member
-- ============================================
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view collaborator profiles"
    ON public.profiles FOR SELECT
    USING (
        id IN (
            SELECT pm.user_id FROM public.project_members pm
            WHERE pm.project_id IN (
                SELECT project_id FROM public.project_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================
-- PROJECTS POLICIES
-- ============================================
CREATE POLICY "Users can view their projects"
    ON public.projects FOR SELECT
    USING (is_project_member(id));

CREATE POLICY "Users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can update projects"
    ON public.projects FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners can delete projects"
    ON public.projects FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================
-- PROJECT_MEMBERS POLICIES
-- ============================================
CREATE POLICY "Members can view project members"
    ON public.project_members FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Project owners can add members"
    ON public.project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND owner_id = auth.uid()
        )
        OR (user_id = auth.uid()) -- Allow self-add when creating project
    );

CREATE POLICY "Project owners can remove members"
    ON public.project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE id = project_id AND owner_id = auth.uid()
        )
    );

-- ============================================
-- NODES POLICIES
-- ============================================
CREATE POLICY "Members can view project nodes"
    ON public.nodes FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Members can create nodes"
    ON public.nodes FOR INSERT
    WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can update nodes"
    ON public.nodes FOR UPDATE
    USING (is_project_member(project_id))
    WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can delete nodes"
    ON public.nodes FOR DELETE
    USING (is_project_member(project_id));

-- ============================================
-- DEPENDENCIES POLICIES
-- ============================================
CREATE POLICY "Members can view dependencies"
    ON public.dependencies FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Members can create dependencies"
    ON public.dependencies FOR INSERT
    WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can delete dependencies"
    ON public.dependencies FOR DELETE
    USING (is_project_member(project_id));

-- ============================================
-- USER_PROGRESS POLICIES
-- ============================================
CREATE POLICY "Members can view project progress"
    ON public.user_progress FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Users can manage own progress"
    ON public.user_progress FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- PROJECT_PROGRESS POLICIES
-- ============================================
CREATE POLICY "Members can view project progress"
    ON public.project_progress FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Members can update project progress"
    ON public.project_progress FOR UPDATE
    USING (is_project_member(project_id))
    WITH CHECK (is_project_member(project_id));

CREATE POLICY "Members can insert project progress"
    ON public.project_progress FOR INSERT
    WITH CHECK (is_project_member(project_id));

-- ============================================
-- ACHIEVEMENTS POLICIES
-- ============================================
CREATE POLICY "Everyone can view achievements"
    ON public.achievements FOR SELECT
    USING (true);

-- ============================================
-- USER_ACHIEVEMENTS POLICIES
-- ============================================
CREATE POLICY "Members can view user achievements"
    ON public.user_achievements FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "System can insert achievements"
    ON public.user_achievements FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- EVENT_LOG POLICIES
-- ============================================
CREATE POLICY "Members can view project events"
    ON public.event_log FOR SELECT
    USING (is_project_member(project_id));

CREATE POLICY "Members can create events"
    ON public.event_log FOR INSERT
    WITH CHECK (is_project_member(project_id) AND user_id = auth.uid());
