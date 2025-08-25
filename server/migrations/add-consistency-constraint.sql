-- Migration: Add data consistency constraint for tasks-ideas-todolists relationship
-- This prevents the invariant violation: task.todoListId must match the groupId of its linked idea

-- Create a view that exposes the consistency check
CREATE OR REPLACE VIEW task_consistency_check AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    t.todolist_id,
    t.idea_id,
    i.group_id as idea_group_id,
    tl.group_id as todolist_group_id,
    (i.group_id = tl.group_id) as is_consistent
FROM tasks t
LEFT JOIN ideas i ON t.idea_id = i.id
LEFT JOIN todolists tl ON t.todolist_id = tl.id;

-- Create a function to validate consistency
CREATE OR REPLACE FUNCTION validate_task_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation if task has no linked idea (orphan task)
    IF NEW.idea_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if the todoList's group matches the idea's group
    IF NOT EXISTS (
        SELECT 1 
        FROM ideas i
        JOIN todolists tl ON i.group_id = tl.group_id
        WHERE i.id = NEW.idea_id 
        AND tl.id = NEW.todolist_id
    ) THEN
        RAISE EXCEPTION 'Task consistency violation: Task todoListId (%) does not match the groupId of its linked idea (%). Use moveTasksToGroup() API instead of direct updates.', 
            NEW.todolist_id, NEW.idea_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to enforce consistency on INSERT and UPDATE
DROP TRIGGER IF EXISTS validate_task_consistency_trigger ON tasks;
CREATE TRIGGER validate_task_consistency_trigger
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_consistency();

-- Create trigger for ideas table to prevent orphaning tasks
CREATE OR REPLACE FUNCTION validate_idea_group_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If group_id is changing and there are linked tasks
    IF OLD.group_id IS DISTINCT FROM NEW.group_id AND EXISTS (
        SELECT 1 FROM tasks WHERE idea_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Cannot directly change idea.group_id (%) when tasks are linked. Use reassignIdeaGroup() API to maintain consistency.', 
            NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_idea_group_change_trigger ON ideas;
CREATE TRIGGER validate_idea_group_change_trigger
    BEFORE UPDATE ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION validate_idea_group_change();

-- Create a function to safely reassign an idea to a new group
CREATE OR REPLACE FUNCTION reassign_idea_group(
    p_idea_id VARCHAR,
    p_new_group_id VARCHAR,
    p_user_id VARCHAR DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_old_group_id VARCHAR;
    v_target_todolist_id VARCHAR;
    v_tasks_moved INTEGER := 0;
    v_result JSON;
BEGIN
    -- Get current group_id
    SELECT group_id INTO v_old_group_id FROM ideas WHERE id = p_idea_id;
    
    IF v_old_group_id IS NULL THEN
        RAISE EXCEPTION 'Idea not found: %', p_idea_id;
    END IF;
    
    -- If no change, return early
    IF v_old_group_id = p_new_group_id THEN
        RETURN json_build_object(
            'success', true,
            'idea_id', p_idea_id,
            'old_group_id', v_old_group_id,
            'new_group_id', p_new_group_id,
            'tasks_moved', 0,
            'message', 'No change needed'
        );
    END IF;
    
    -- Find target TodoList for new group
    SELECT id INTO v_target_todolist_id 
    FROM todolists 
    WHERE group_id = p_new_group_id 
    AND (p_user_id IS NULL OR user_id = p_user_id)
    LIMIT 1;
    
    -- Disable the consistency trigger temporarily
    SET session_replication_role = replica;
    
    BEGIN
        -- Update idea's group_id
        UPDATE ideas 
        SET group_id = p_new_group_id, updated_at = NOW()
        WHERE id = p_idea_id;
        
        -- If target TodoList exists, move linked tasks
        IF v_target_todolist_id IS NOT NULL THEN
            UPDATE tasks 
            SET todolist_id = v_target_todolist_id
            WHERE idea_id = p_idea_id;
            
            GET DIAGNOSTICS v_tasks_moved = ROW_COUNT;
        END IF;
        
        -- Re-enable the consistency trigger
        SET session_replication_role = DEFAULT;
        
        SELECT json_build_object(
            'success', true,
            'idea_id', p_idea_id,
            'old_group_id', v_old_group_id,
            'new_group_id', p_new_group_id,
            'target_todolist_id', v_target_todolist_id,
            'tasks_moved', v_tasks_moved,
            'message', CASE 
                WHEN v_target_todolist_id IS NULL THEN 'Idea moved, but no TodoList exists for target group'
                ELSE 'Idea and tasks moved successfully'
            END
        ) INTO v_result;
        
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Re-enable the trigger in case of error
        SET session_replication_role = DEFAULT;
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_idea_todolist ON tasks(idea_id, todolist_id);
CREATE INDEX IF NOT EXISTS idx_ideas_group_id ON ideas(group_id);
CREATE INDEX IF NOT EXISTS idx_todolists_group_id ON todolists(group_id);

-- Add comments for documentation
COMMENT ON FUNCTION validate_task_consistency() IS 'Ensures tasks todoListId matches their linked ideas groupId';
COMMENT ON FUNCTION validate_idea_group_change() IS 'Prevents direct idea.group_id changes when tasks are linked';
COMMENT ON FUNCTION reassign_idea_group(VARCHAR, VARCHAR, VARCHAR) IS 'Safely reassigns an idea to a new group while moving linked tasks';
COMMENT ON VIEW task_consistency_check IS 'Shows all tasks and their consistency status';

-- Display current inconsistencies after adding constraints
SELECT 
    'INCONSISTENT TASKS FOUND:' as status,
    task_id,
    task_title,
    idea_group_id,
    todolist_group_id
FROM task_consistency_check 
WHERE is_consistent = false AND idea_id IS NOT NULL;