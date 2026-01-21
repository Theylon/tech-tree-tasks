-- Tech Tree Tasks - Database Functions
-- Run this in Supabase SQL Editor AFTER 00002

-- ============================================
-- XP SIZE MAPPING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_xp_for_size(p_size task_size)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_size
        WHEN 'S' THEN 25
        WHEN 'M' THEN 75
        WHEN 'L' THEN 200
        ELSE 75
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- LEVEL CALCULATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION calculate_level(p_total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER := 1;
    v_thresholds INTEGER[] := ARRAY[0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
BEGIN
    FOR i IN 1..array_length(v_thresholds, 1) LOOP
        IF p_total_xp >= v_thresholds[i] THEN
            v_level := i;
        ELSE
            EXIT;
        END IF;
    END LOOP;
    RETURN v_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- CHECK IF NODE CAN BE UNLOCKED
-- ============================================
CREATE OR REPLACE FUNCTION can_unlock_node(p_node_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Node can be unlocked if all prerequisite nodes are completed
    RETURN NOT EXISTS (
        SELECT 1 FROM public.dependencies d
        JOIN public.nodes n ON n.id = d.from_node_id
        WHERE d.to_node_id = p_node_id
        AND n.status != 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET INCOMPLETE PREREQUISITES
-- ============================================
CREATE OR REPLACE FUNCTION get_incomplete_prereqs(p_node_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    v_prereqs TEXT[];
BEGIN
    SELECT ARRAY_AGG(n.title) INTO v_prereqs
    FROM public.dependencies d
    JOIN public.nodes n ON n.id = d.from_node_id
    WHERE d.to_node_id = p_node_id
    AND n.status != 'completed';

    RETURN COALESCE(v_prereqs, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETE NODE FUNCTION (Main XP logic)
-- ============================================
CREATE OR REPLACE FUNCTION complete_node(
    p_node_id UUID,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_node RECORD;
    v_user_id UUID;
    v_xp_gained INTEGER;
    v_new_total_xp INTEGER;
    v_new_level INTEGER;
    v_old_level INTEGER;
    v_old_tasks INTEGER;
    v_unlocked_nodes UUID[];
    v_has_incomplete_prereqs BOOLEAN;
    v_incomplete_prereqs TEXT[];
    v_achievements_earned JSONB := '[]'::JSONB;
    v_achievement RECORD;
    v_project_xp INTEGER;
    v_project_tasks INTEGER;
BEGIN
    v_user_id := auth.uid();

    -- Get the node
    SELECT * INTO v_node FROM public.nodes WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Node not found';
    END IF;

    -- Check if user is project member
    IF NOT is_project_member(v_node.project_id) THEN
        RAISE EXCEPTION 'Not a project member';
    END IF;

    -- Check if already completed
    IF v_node.status = 'completed' THEN
        RAISE EXCEPTION 'Node already completed';
    END IF;

    -- Check for incomplete prerequisites (allow with warning)
    v_has_incomplete_prereqs := NOT can_unlock_node(p_node_id);
    IF v_has_incomplete_prereqs THEN
        v_incomplete_prereqs := get_incomplete_prereqs(p_node_id);
    END IF;

    -- Calculate XP (use node's xp_value which may have been manually overridden)
    v_xp_gained := v_node.xp_value;

    -- Update the node
    UPDATE public.nodes
    SET status = 'completed',
        completed_at = NOW(),
        completed_by = v_user_id,
        completion_notes = p_completion_notes
    WHERE id = p_node_id;

    -- Get/create user progress
    SELECT total_xp, level, tasks_completed INTO v_new_total_xp, v_old_level, v_old_tasks
    FROM public.user_progress
    WHERE user_id = v_user_id AND project_id = v_node.project_id;

    IF NOT FOUND THEN
        v_new_total_xp := 0;
        v_old_level := 1;
        v_old_tasks := 0;

        INSERT INTO public.user_progress (user_id, project_id, total_xp, level, tasks_completed, last_activity_at)
        VALUES (v_user_id, v_node.project_id, v_xp_gained, calculate_level(v_xp_gained), 1, NOW());

        v_new_total_xp := v_xp_gained;
    ELSE
        v_new_total_xp := v_new_total_xp + v_xp_gained;
        v_new_level := calculate_level(v_new_total_xp);

        UPDATE public.user_progress
        SET total_xp = v_new_total_xp,
            level = v_new_level,
            tasks_completed = tasks_completed + 1,
            last_activity_at = NOW()
        WHERE user_id = v_user_id AND project_id = v_node.project_id;
    END IF;

    v_new_level := calculate_level(v_new_total_xp);

    -- Update project progress (shared XP)
    SELECT total_xp, tasks_completed INTO v_project_xp, v_project_tasks
    FROM public.project_progress
    WHERE project_id = v_node.project_id;

    IF NOT FOUND THEN
        INSERT INTO public.project_progress (project_id, total_xp, tasks_completed)
        VALUES (v_node.project_id, v_xp_gained, 1);
    ELSE
        UPDATE public.project_progress
        SET total_xp = total_xp + v_xp_gained,
            tasks_completed = tasks_completed + 1
        WHERE project_id = v_node.project_id;
    END IF;

    -- Find and unlock dependent nodes
    SELECT ARRAY_AGG(d.to_node_id) INTO v_unlocked_nodes
    FROM public.dependencies d
    WHERE d.from_node_id = p_node_id
    AND can_unlock_node(d.to_node_id);

    -- Update unlocked nodes
    IF v_unlocked_nodes IS NOT NULL AND array_length(v_unlocked_nodes, 1) > 0 THEN
        UPDATE public.nodes
        SET status = 'unlocked'
        WHERE id = ANY(v_unlocked_nodes)
        AND status = 'locked';
    END IF;

    -- Check for achievements
    -- First task
    IF v_old_tasks = 0 THEN
        FOR v_achievement IN
            SELECT * FROM public.achievements WHERE code = 'first_task'
            AND NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = v_user_id AND achievement_id = achievements.id AND project_id = v_node.project_id
            )
        LOOP
            INSERT INTO public.user_achievements (user_id, achievement_id, project_id)
            VALUES (v_user_id, v_achievement.id, v_node.project_id);
            v_achievements_earned := v_achievements_earned || jsonb_build_object(
                'code', v_achievement.code,
                'name', v_achievement.name,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
            );
            -- Add achievement XP
            v_new_total_xp := v_new_total_xp + v_achievement.xp_reward;
            UPDATE public.user_progress SET total_xp = v_new_total_xp WHERE user_id = v_user_id AND project_id = v_node.project_id;
        END LOOP;
    END IF;

    -- Ten tasks
    IF v_old_tasks + 1 = 10 THEN
        FOR v_achievement IN
            SELECT * FROM public.achievements WHERE code = 'ten_tasks'
            AND NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = v_user_id AND achievement_id = achievements.id AND project_id = v_node.project_id
            )
        LOOP
            INSERT INTO public.user_achievements (user_id, achievement_id, project_id)
            VALUES (v_user_id, v_achievement.id, v_node.project_id);
            v_achievements_earned := v_achievements_earned || jsonb_build_object(
                'code', v_achievement.code,
                'name', v_achievement.name,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
            );
            v_new_total_xp := v_new_total_xp + v_achievement.xp_reward;
            UPDATE public.user_progress SET total_xp = v_new_total_xp WHERE user_id = v_user_id AND project_id = v_node.project_id;
        END LOOP;
    END IF;

    -- First large task
    IF v_node.size = 'L' THEN
        FOR v_achievement IN
            SELECT * FROM public.achievements WHERE code = 'first_large'
            AND NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = v_user_id AND achievement_id = achievements.id AND project_id = v_node.project_id
            )
        LOOP
            INSERT INTO public.user_achievements (user_id, achievement_id, project_id)
            VALUES (v_user_id, v_achievement.id, v_node.project_id);
            v_achievements_earned := v_achievements_earned || jsonb_build_object(
                'code', v_achievement.code,
                'name', v_achievement.name,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
            );
            v_new_total_xp := v_new_total_xp + v_achievement.xp_reward;
            UPDATE public.user_progress SET total_xp = v_new_total_xp WHERE user_id = v_user_id AND project_id = v_node.project_id;
        END LOOP;
    END IF;

    -- Level 5 achievement
    IF v_new_level >= 5 AND v_old_level < 5 THEN
        FOR v_achievement IN
            SELECT * FROM public.achievements WHERE code = 'level_5'
            AND NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = v_user_id AND achievement_id = achievements.id AND project_id = v_node.project_id
            )
        LOOP
            INSERT INTO public.user_achievements (user_id, achievement_id, project_id)
            VALUES (v_user_id, v_achievement.id, v_node.project_id);
            v_achievements_earned := v_achievements_earned || jsonb_build_object(
                'code', v_achievement.code,
                'name', v_achievement.name,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
            );
        END LOOP;
    END IF;

    -- Chain reaction (unlocked 3+ nodes)
    IF v_unlocked_nodes IS NOT NULL AND array_length(v_unlocked_nodes, 1) >= 3 THEN
        FOR v_achievement IN
            SELECT * FROM public.achievements WHERE code = 'unlocked_chain'
            AND NOT EXISTS (
                SELECT 1 FROM public.user_achievements
                WHERE user_id = v_user_id AND achievement_id = achievements.id AND project_id = v_node.project_id
            )
        LOOP
            INSERT INTO public.user_achievements (user_id, achievement_id, project_id)
            VALUES (v_user_id, v_achievement.id, v_node.project_id);
            v_achievements_earned := v_achievements_earned || jsonb_build_object(
                'code', v_achievement.code,
                'name', v_achievement.name,
                'icon', v_achievement.icon,
                'xp_reward', v_achievement.xp_reward
            );
            v_new_total_xp := v_new_total_xp + v_achievement.xp_reward;
            UPDATE public.user_progress SET total_xp = v_new_total_xp WHERE user_id = v_user_id AND project_id = v_node.project_id;
        END LOOP;
    END IF;

    -- Log the event
    INSERT INTO public.event_log (project_id, user_id, event_type, payload)
    VALUES (
        v_node.project_id,
        v_user_id,
        'task_completed',
        jsonb_build_object(
            'node_id', p_node_id,
            'node_title', v_node.title,
            'xp_gained', v_xp_gained,
            'new_total_xp', v_new_total_xp,
            'old_level', v_old_level,
            'new_level', v_new_level,
            'unlocked_nodes', COALESCE(v_unlocked_nodes, ARRAY[]::UUID[]),
            'had_incomplete_prereqs', v_has_incomplete_prereqs
        )
    );

    -- Recalculate final level after achievement XP
    v_new_level := calculate_level(v_new_total_xp);
    UPDATE public.user_progress SET level = v_new_level WHERE user_id = v_user_id AND project_id = v_node.project_id;

    RETURN jsonb_build_object(
        'success', true,
        'xp_gained', v_xp_gained,
        'total_xp', v_new_total_xp,
        'level', v_new_level,
        'level_up', v_new_level > v_old_level,
        'unlocked_nodes', COALESCE(v_unlocked_nodes, ARRAY[]::UUID[]),
        'achievements_earned', v_achievements_earned,
        'had_incomplete_prereqs', v_has_incomplete_prereqs,
        'incomplete_prereqs', COALESCE(v_incomplete_prereqs, ARRAY[]::TEXT[])
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UNDO COMPLETE NODE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION undo_complete_node(p_node_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_node RECORD;
    v_user_id UUID;
    v_xp_to_remove INTEGER;
    v_new_total_xp INTEGER;
    v_new_level INTEGER;
BEGIN
    v_user_id := auth.uid();

    -- Get the node
    SELECT * INTO v_node FROM public.nodes WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Node not found';
    END IF;

    -- Check if user is project member
    IF NOT is_project_member(v_node.project_id) THEN
        RAISE EXCEPTION 'Not a project member';
    END IF;

    -- Check if completed
    IF v_node.status != 'completed' THEN
        RAISE EXCEPTION 'Node is not completed';
    END IF;

    v_xp_to_remove := v_node.xp_value;

    -- Revert the node status
    UPDATE public.nodes
    SET status = CASE
            WHEN can_unlock_node(p_node_id) THEN 'unlocked'::task_status
            ELSE 'locked'::task_status
        END,
        completed_at = NULL,
        completed_by = NULL,
        completion_notes = NULL
    WHERE id = p_node_id;

    -- Update user progress
    UPDATE public.user_progress
    SET total_xp = GREATEST(0, total_xp - v_xp_to_remove),
        tasks_completed = GREATEST(0, tasks_completed - 1),
        level = calculate_level(GREATEST(0, total_xp - v_xp_to_remove))
    WHERE user_id = v_user_id AND project_id = v_node.project_id
    RETURNING total_xp, level INTO v_new_total_xp, v_new_level;

    -- Update project progress
    UPDATE public.project_progress
    SET total_xp = GREATEST(0, total_xp - v_xp_to_remove),
        tasks_completed = GREATEST(0, tasks_completed - 1)
    WHERE project_id = v_node.project_id;

    -- Re-lock any nodes that were unlocked by this completion
    UPDATE public.nodes
    SET status = 'locked'
    WHERE id IN (
        SELECT d.to_node_id FROM public.dependencies d
        WHERE d.from_node_id = p_node_id
    )
    AND status = 'unlocked'
    AND NOT can_unlock_node(id);

    -- Log the event
    INSERT INTO public.event_log (project_id, user_id, event_type, payload)
    VALUES (
        v_node.project_id,
        v_user_id,
        'task_uncompleted',
        jsonb_build_object(
            'node_id', p_node_id,
            'node_title', v_node.title,
            'xp_removed', v_xp_to_remove
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'xp_removed', v_xp_to_remove,
        'total_xp', COALESCE(v_new_total_xp, 0),
        'level', COALESCE(v_new_level, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLAIM TASK FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION claim_node(p_node_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_node RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_node FROM public.nodes WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Node not found';
    END IF;

    IF NOT is_project_member(v_node.project_id) THEN
        RAISE EXCEPTION 'Not a project member';
    END IF;

    IF v_node.owner_id IS NOT NULL THEN
        RAISE EXCEPTION 'Node is already claimed';
    END IF;

    IF v_node.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot claim a completed node';
    END IF;

    UPDATE public.nodes
    SET owner_id = v_user_id,
        status = 'in_progress'
    WHERE id = p_node_id;

    INSERT INTO public.event_log (project_id, user_id, event_type, payload)
    VALUES (
        v_node.project_id,
        v_user_id,
        'task_claimed',
        jsonb_build_object('node_id', p_node_id, 'node_title', v_node.title)
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UNCLAIM TASK FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION unclaim_node(p_node_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_node RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_node FROM public.nodes WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Node not found';
    END IF;

    IF NOT is_project_member(v_node.project_id) THEN
        RAISE EXCEPTION 'Not a project member';
    END IF;

    IF v_node.owner_id != v_user_id THEN
        RAISE EXCEPTION 'You can only unclaim your own tasks';
    END IF;

    IF v_node.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot unclaim a completed node';
    END IF;

    UPDATE public.nodes
    SET owner_id = NULL,
        status = CASE
            WHEN can_unlock_node(p_node_id) THEN 'unlocked'::task_status
            ELSE 'locked'::task_status
        END
    WHERE id = p_node_id;

    INSERT INTO public.event_log (project_id, user_id, event_type, payload)
    VALUES (
        v_node.project_id,
        v_user_id,
        'task_unclaimed',
        jsonb_build_object('node_id', p_node_id, 'node_title', v_node.title)
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTO-SET XP VALUE BASED ON SIZE
-- ============================================
CREATE OR REPLACE FUNCTION set_node_xp_value()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set default if xp_value wasn't explicitly provided
    IF NEW.xp_value IS NULL OR NEW.xp_value = 75 THEN
        NEW.xp_value := get_xp_for_size(NEW.size);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_node_xp_on_insert
    BEFORE INSERT ON public.nodes
    FOR EACH ROW EXECUTE FUNCTION set_node_xp_value();

-- ============================================
-- CREATE USER PROGRESS WHEN JOINING PROJECT
-- ============================================
CREATE OR REPLACE FUNCTION create_user_progress_on_join()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_progress (user_id, project_id)
    VALUES (NEW.user_id, NEW.project_id)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_progress_on_member_join
    AFTER INSERT ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION create_user_progress_on_join();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dependencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_log;
