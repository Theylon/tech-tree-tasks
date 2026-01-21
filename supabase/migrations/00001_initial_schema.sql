-- Tech Tree Tasks - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PROJECT_MEMBERS TABLE (collaboration)
-- ============================================
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- ============================================
-- NODES TABLE (Tasks in the tech tree)
-- ============================================
CREATE TYPE task_status AS ENUM ('locked', 'unlocked', 'in_progress', 'completed');
CREATE TYPE task_size AS ENUM ('S', 'M', 'L');

CREATE TABLE public.nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    description TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = unassigned (claim system)
    status task_status NOT NULL DEFAULT 'unlocked',
    size task_size NOT NULL DEFAULT 'M',
    xp_value INTEGER NOT NULL DEFAULT 75,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    branch TEXT NOT NULL DEFAULT 'dev', -- dev, biz, launch, or custom
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_nodes_project_id ON public.nodes(project_id);
CREATE INDEX idx_nodes_status ON public.nodes(status);
CREATE INDEX idx_nodes_owner_id ON public.nodes(owner_id);
CREATE INDEX idx_nodes_branch ON public.nodes(branch);

-- ============================================
-- DEPENDENCIES TABLE (Edges between nodes)
-- ============================================
CREATE TABLE public.dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    from_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    to_node_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(from_node_id, to_node_id),
    CHECK (from_node_id != to_node_id)
);

-- Indexes for dependency lookups
CREATE INDEX idx_dependencies_project_id ON public.dependencies(project_id);
CREATE INDEX idx_dependencies_from_node ON public.dependencies(from_node_id);
CREATE INDEX idx_dependencies_to_node ON public.dependencies(to_node_id);

-- ============================================
-- USER_PROGRESS TABLE (Individual XP per project)
-- ============================================
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    tasks_completed INTEGER NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, project_id)
);

-- Index for leaderboard queries
CREATE INDEX idx_user_progress_project_xp ON public.user_progress(project_id, total_xp DESC);

-- ============================================
-- PROJECT_PROGRESS TABLE (Shared project XP)
-- ============================================
CREATE TABLE public.project_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    tasks_completed INTEGER NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0
);

-- ============================================
-- USER_ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, achievement_id, project_id)
);

-- ============================================
-- EVENT_LOG TABLE (Activity feed)
-- ============================================
CREATE TABLE public.event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for event queries
CREATE INDEX idx_event_log_project_id ON public.event_log(project_id);
CREATE INDEX idx_event_log_type ON public.event_log(event_type);
CREATE INDEX idx_event_log_created_at ON public.event_log(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON public.nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_progress_updated_at
    BEFORE UPDATE ON public.project_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED ACHIEVEMENTS
-- ============================================
INSERT INTO public.achievements (code, name, description, icon, xp_reward) VALUES
    ('first_task', 'First Blood', 'Complete your first task', '🎯', 10),
    ('ten_tasks', 'Getting Started', 'Complete 10 tasks', '🔥', 50),
    ('fifty_tasks', 'Workhorse', 'Complete 50 tasks', '💪', 100),
    ('hundred_tasks', 'Centurion', 'Complete 100 tasks', '⚔️', 200),
    ('level_5', 'Apprentice', 'Reach level 5', '🌟', 25),
    ('level_10', 'Expert', 'Reach level 10', '👑', 50),
    ('first_large', 'Big Game Hunter', 'Complete your first L-sized task', '🎖️', 25),
    ('streak_3', 'On a Roll', 'Complete tasks 3 days in a row', '📈', 30),
    ('streak_7', 'Week Warrior', 'Complete tasks 7 days in a row', '🏆', 75),
    ('unlocked_chain', 'Chain Reaction', 'Unlock 3 tasks with a single completion', '⛓️', 40),
    ('branch_complete', 'Branch Manager', 'Complete all tasks in a branch', '🌳', 100),
    ('collab_complete', 'Team Player', 'You and your partner each complete a task on the same day', '🤝', 30);
