#!/usr/bin/env tsx
/**
 * Data Consistency Repair Script
 * 
 * Fixes the broken invariant: task.todoListId must match the groupId of its linked idea
 * 
 * Problem identified:
 * - All 3 ideas belong to group "f2a34a6b-ff90-40d6-a21e-afaa9a242458" (youtube)
 * - But 2 tasks are in TodoList "c305f878-560c-4e72-93e8-b2762a8b9c01" (Creación de Contenido)
 * - Only 1 task is correctly in TodoList "3bf2b4e8-9c8e-4ee9-9749-7094481a65ba" (youtube)
 */

import { db } from "./db";
import { tasks, ideas, todoLists, groups } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

interface RepairResult {
  totalTasks: number;
  inconsistentTasks: number;
  repairedTasks: number;
  errors: string[];
}

async function auditDataConsistency(): Promise<RepairResult> {
  const result: RepairResult = {
    totalTasks: 0,
    inconsistentTasks: 0,
    repairedTasks: 0,
    errors: []
  };

  console.log("🔍 Starting data consistency audit...");
  
  try {
    // Get all tasks with their linked ideas and todolist information
    const allTasks = await db
      .select({
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskTodoListId: tasks.todoListId,
        taskIdeaId: tasks.ideaId,
        ideaGroupId: ideas.groupId,
        ideaTitle: ideas.title,
        todoListGroupId: todoLists.groupId,
        todoListName: todoLists.name
      })
      .from(tasks)
      .leftJoin(ideas, eq(tasks.ideaId, ideas.id))
      .leftJoin(todoLists, eq(tasks.todoListId, todoLists.id));

    result.totalTasks = allTasks.length;
    console.log(`📊 Found ${result.totalTasks} total tasks`);

    const inconsistentTasks = [];
    const orphanTasks = [];

    for (const task of allTasks) {
      // Check for orphan tasks (no linked idea)
      if (!task.taskIdeaId || !task.ideaGroupId) {
        orphanTasks.push(task);
        continue;
      }

      // Check for broken invariant
      if (task.ideaGroupId !== task.todoListGroupId) {
        inconsistentTasks.push(task);
        console.log(`❌ INCONSISTENT: Task "${task.taskTitle}" (${task.taskId})`);
        console.log(`   Idea group: ${task.ideaGroupId}`);
        console.log(`   TodoList group: ${task.todoListGroupId}`);
      }
    }

    result.inconsistentTasks = inconsistentTasks.length;
    console.log(`🚨 Found ${result.inconsistentTasks} inconsistent tasks`);
    console.log(`👻 Found ${orphanTasks.length} orphan tasks (no linked idea)`);

    return result;
    
  } catch (error) {
    result.errors.push(`Audit failed: ${error}`);
    console.error("❌ Audit failed:", error);
    return result;
  }
}

async function repairDataConsistency(): Promise<RepairResult> {
  const result: RepairResult = {
    totalTasks: 0,
    inconsistentTasks: 0,
    repairedTasks: 0,
    errors: []
  };

  console.log("🔧 Starting data consistency repair...");

  try {
    return await db.transaction(async (tx) => {
      // Get all tasks with their linked ideas
      const tasksWithIdeas = await tx
        .select({
          taskId: tasks.id,
          taskTitle: tasks.title,
          taskTodoListId: tasks.todoListId,
          taskIdeaId: tasks.ideaId,
          ideaGroupId: ideas.groupId,
          ideaTitle: ideas.title
        })
        .from(tasks)
        .innerJoin(ideas, eq(tasks.ideaId, ideas.id))
        .where(eq(ideas.groupId, ideas.groupId)); // Only tasks with linked ideas

      result.totalTasks = tasksWithIdeas.length;

      // Group tasks by the group their idea belongs to
      const tasksByGroup = new Map<string, typeof tasksWithIdeas>();
      
      for (const task of tasksWithIdeas) {
        const groupId = task.ideaGroupId!;
        if (!tasksByGroup.has(groupId)) {
          tasksByGroup.set(groupId, []);
        }
        tasksByGroup.get(groupId)!.push(task);
      }

      console.log(`📊 Found tasks in ${tasksByGroup.size} different groups`);

      // For each group, ensure all tasks are in the correct TodoList
      for (const [groupId, groupTasks] of tasksByGroup) {
        console.log(`\n🔍 Processing group ${groupId} with ${groupTasks.length} tasks`);
        
        // Find the TodoList for this group
        const [correctTodoList] = await tx
          .select()
          .from(todoLists)
          .where(eq(todoLists.groupId, groupId))
          .limit(1);

        if (!correctTodoList) {
          result.errors.push(`No TodoList found for group ${groupId}`);
          console.log(`❌ No TodoList found for group ${groupId}`);
          continue;
        }

        // Check which tasks are in the wrong TodoList
        const tasksToMove = groupTasks.filter(task => 
          task.taskTodoListId !== correctTodoList.id
        );

        if (tasksToMove.length === 0) {
          console.log(`✅ All ${groupTasks.length} tasks already in correct TodoList`);
          continue;
        }

        result.inconsistentTasks += tasksToMove.length;
        
        console.log(`🔄 Moving ${tasksToMove.length} tasks to correct TodoList ${correctTodoList.name}`);
        
        // Move tasks to correct TodoList
        const taskIdsToMove = tasksToMove.map(t => t.taskId);
        const updateResult = await tx
          .update(tasks)
          .set({ todoListId: correctTodoList.id })
          .where(inArray(tasks.id, taskIdsToMove));

        result.repairedTasks += updateResult.rowCount || 0;
        
        for (const task of tasksToMove) {
          console.log(`   ✅ Moved "${task.taskTitle}" to TodoList "${correctTodoList.name}"`);
        }
      }

      console.log(`\n🎉 Repair completed successfully!`);
      console.log(`📊 Total tasks: ${result.totalTasks}`);
      console.log(`🚨 Inconsistent tasks found: ${result.inconsistentTasks}`);
      console.log(`✅ Tasks repaired: ${result.repairedTasks}`);

      return result;
    });

  } catch (error) {
    result.errors.push(`Repair failed: ${error}`);
    console.error("❌ Repair failed:", error);
    throw error;
  }
}

// Main execution
async function main() {
  console.log("🚀 Data Consistency Repair Tool");
  console.log("================================\n");
  
  try {
    // First, audit the current state
    const auditResult = await auditDataConsistency();
    
    if (auditResult.inconsistentTasks === 0) {
      console.log("✅ No data inconsistencies found. Database is healthy!");
      return;
    }
    
    console.log(`\n🔧 Found ${auditResult.inconsistentTasks} inconsistencies. Proceeding with repair...\n`);
    
    // Then, repair the inconsistencies
    const repairResult = await repairDataConsistency();
    
    if (repairResult.errors.length > 0) {
      console.log("\n❌ Repair completed with errors:");
      repairResult.errors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log("\n✅ All data inconsistencies have been repaired successfully!");
    }
    
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { auditDataConsistency, repairDataConsistency };