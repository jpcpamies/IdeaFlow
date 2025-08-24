import {
  users,
  projects,
  tasks,
  ideas,
  groups,
  todoLists,
  sections,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type Idea,
  type InsertIdea,
  type Group,
  type InsertGroup,
  type TodoList,
  type InsertTodoList,
  type Section,
  type InsertSection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  getUserProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Task operations
  getProjectTasks(projectId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByIdeaId(ideaId: string): Promise<Task[]>;
  unlinkTasksFromIdea(ideaId: string): Promise<number>;
  moveTasksToGroup(ideaIds: string[], targetGroupId: string): Promise<number>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Idea operations
  getUserIdeas(userId: string): Promise<Idea[]>;
  getProjectIdeas(userId: string, projectId: string): Promise<Idea[]>;
  getIdea(id: string): Promise<Idea | undefined>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  updateIdea(id: string, updates: Partial<InsertIdea>): Promise<Idea>;
  deleteIdea(id: string): Promise<void>;
  
  // Group operations
  getUserGroups(userId: string): Promise<Group[]>;
  getProjectGroups(userId: string, projectId: string): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  removeGroupFromIdeas(groupId: string): Promise<void>;
  
  // TodoList operations
  getUserTodoLists(userId: string): Promise<TodoList[]>;
  getProjectTodoLists(userId: string, projectId: string): Promise<TodoList[]>;
  getTodoList(id: string): Promise<TodoList | undefined>;
  createTodoList(todoList: InsertTodoList): Promise<TodoList>;
  updateTodoList(id: string, updates: Partial<InsertTodoList>): Promise<TodoList>;
  deleteTodoList(id: string): Promise<void>;
  
  // Task operations for TodoLists
  getTodoListTasks(todoListId: string): Promise<Task[]>;
  toggleTask(id: string, completed: boolean, userId: string): Promise<Task>;
  updateTaskOrder(id: string, orderIndex: number, sectionId?: string | null): Promise<Task>;
  clearCompletedTasks(todoListId: string, userId: string): Promise<void>;
  
  // Bulk task operations
  bulkUpdateTasks(taskIds: string[], updates: Partial<InsertTask>, userId: string): Promise<Task[]>;
  bulkDeleteTasks(taskIds: string[], userId: string): Promise<void>;
  moveTasksToTodoList(taskIds: string[], targetTodoListId: string, userId: string): Promise<Task[]>;
  
  // Section operations
  getTodoListSections(todoListId: string): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, updates: Partial<InsertSection>): Promise<Section>;
  deleteSection(id: string): Promise<void>;
  
  // Statistics
  getUserStats(userId: string): Promise<{
    activeProjects: number;
    tasksCreated: number;
    ideasCaptured: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Task operations
  async getProjectTasks(projectId: string): Promise<Task[]> {
    // For now, return empty array since tasks are now linked to todoLists
    // This maintains compatibility with existing project-based API
    return [];
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByIdeaId(ideaId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.ideaId, ideaId))
      .orderBy(tasks.createdAt);
  }

  async unlinkTasksFromIdea(ideaId: string): Promise<number> {
    // Update all tasks that reference this idea to have null ideaId
    const result = await db
      .update(tasks)
      .set({ ideaId: null })
      .where(eq(tasks.ideaId, ideaId));
    
    // Return the number of affected rows
    return result.rowCount || 0;
  }

  async moveTasksToGroup(ideaIds: string[], targetGroupId: string): Promise<number> {
    // Find the target group's TodoList (if it exists)
    const [targetTodoList] = await db
      .select()
      .from(todoLists)
      .where(eq(todoLists.groupId, targetGroupId))
      .limit(1);

    if (!targetTodoList) {
      // No TodoList exists for target group yet, just return 0
      // Tasks will be handled when TodoList is created
      return 0;
    }

    // Find all tasks that are linked to the ideas we're moving
    const tasksToMove = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.ideaId, ideaIds));

    if (tasksToMove.length === 0) {
      return 0;
    }

    // Move tasks to the target TodoList
    const result = await db
      .update(tasks)
      .set({ todoListId: targetTodoList.id })
      .where(inArray(tasks.ideaId, ideaIds));

    return result.rowCount || 0;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    activeProjects: number;
    tasksCreated: number;
    ideasCaptured: number;
  }> {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));

    const projectIds = userProjects.map(p => p.id);
    
    // Get total ideas for this user as a better metric
    const userIdeas = await db
      .select()
      .from(ideas)
      .where(eq(ideas.userId, userId));
    
    const totalTasks = userIdeas.length;

    return {
      activeProjects: userProjects.filter(p => p.status === 'active').length,
      tasksCreated: totalTasks,
      ideasCaptured: userIdeas.length,
    };
  }

  // Idea operations
  async getUserIdeas(userId: string): Promise<Idea[]> {
    return await db
      .select()
      .from(ideas)
      .where(eq(ideas.userId, userId))
      .orderBy(desc(ideas.createdAt));
  }

  async getProjectIdeas(userId: string, projectId: string): Promise<Idea[]> {
    return await db
      .select()
      .from(ideas)
      .where(and(eq(ideas.userId, userId), eq(ideas.projectId, projectId)))
      .orderBy(desc(ideas.createdAt));
  }

  async getIdea(id: string): Promise<Idea | undefined> {
    const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
    return idea;
  }

  async createIdea(idea: InsertIdea): Promise<Idea> {
    const [newIdea] = await db
      .insert(ideas)
      .values(idea)
      .returning();
    return newIdea;
  }

  async updateIdea(id: string, updates: Partial<InsertIdea>): Promise<Idea> {
    const [updatedIdea] = await db
      .update(ideas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ideas.id, id))
      .returning();
    return updatedIdea;
  }

  async deleteIdea(id: string): Promise<void> {
    await db.delete(ideas).where(eq(ideas.id, id));
  }

  // Group operations
  async getUserGroups(userId: string): Promise<Group[]> {
    return await db
      .select()
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(groups.name);
  }

  async getProjectGroups(userId: string, projectId: string): Promise<Group[]> {
    return await db
      .select()
      .from(groups)
      .where(and(eq(groups.userId, userId), eq(groups.projectId, projectId)))
      .orderBy(groups.name);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db
      .insert(groups)
      .values(group)
      .returning();
    return newGroup;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group> {
    const [updatedGroup] = await db
      .update(groups)
      .set(updates)
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async removeGroupFromIdeas(groupId: string): Promise<void> {
    await db
      .update(ideas)
      .set({ groupId: null })
      .where(eq(ideas.groupId, groupId));
  }

  // TodoList operations
  async getUserTodoLists(userId: string): Promise<TodoList[]> {
    return await db
      .select()
      .from(todoLists)
      .where(eq(todoLists.userId, userId))
      .orderBy(desc(todoLists.createdAt));
  }

  async getProjectTodoLists(userId: string, projectId: string): Promise<TodoList[]> {
    return await db
      .select()
      .from(todoLists)
      .where(and(eq(todoLists.userId, userId), eq(todoLists.projectId, projectId)))
      .orderBy(desc(todoLists.createdAt));
  }

  async getTodoList(id: string): Promise<TodoList | undefined> {
    const [todoList] = await db.select().from(todoLists).where(eq(todoLists.id, id));
    return todoList;
  }

  async createTodoList(todoList: InsertTodoList): Promise<TodoList> {
    const [newTodoList] = await db
      .insert(todoLists)
      .values(todoList)
      .returning();
    return newTodoList;
  }

  async updateTodoList(id: string, updates: Partial<InsertTodoList>): Promise<TodoList> {
    const [updatedTodoList] = await db
      .update(todoLists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(todoLists.id, id))
      .returning();
    return updatedTodoList;
  }

  async deleteTodoList(id: string): Promise<void> {
    await db.delete(todoLists).where(eq(todoLists.id, id));
  }
  
  // Task operations for TodoLists
  async getTodoListTasks(todoListId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.todoListId, todoListId))
      .orderBy(tasks.orderIndex, tasks.createdAt);
  }
  
  async toggleTask(id: string, completed: boolean, userId: string): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ completed })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async updateTaskOrder(id: string, orderIndex: number, sectionId?: string | null): Promise<Task> {
    const updates: Partial<InsertTask> = { orderIndex };
    if (sectionId !== undefined) {
      updates.sectionId = sectionId;
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async clearCompletedTasks(todoListId: string, userId: string): Promise<void> {
    await db
      .delete(tasks)
      .where(and(
        eq(tasks.todoListId, todoListId),
        eq(tasks.completed, true)
      ));
  }

  // Bulk task operations
  async bulkUpdateTasks(taskIds: string[], updates: Partial<InsertTask>, userId: string): Promise<Task[]> {
    // First verify all tasks belong to user's todolists
    const userTodoLists = await this.getUserTodoLists(userId);
    const userTodoListIds = userTodoLists.map(tl => tl.id);
    
    const tasksToUpdate = await db
      .select()
      .from(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        inArray(tasks.todoListId, userTodoListIds)
      ));
    
    if (tasksToUpdate.length !== taskIds.length) {
      throw new Error('Some tasks not found or not owned by user');
    }
    
    // Update tasks
    const updatedTasks = await db
      .update(tasks)
      .set(updates)
      .where(inArray(tasks.id, taskIds))
      .returning();
    
    return updatedTasks;
  }

  async bulkDeleteTasks(taskIds: string[], userId: string): Promise<void> {
    // First verify all tasks belong to user's todolists
    const userTodoLists = await this.getUserTodoLists(userId);
    const userTodoListIds = userTodoLists.map(tl => tl.id);
    
    const tasksToDelete = await db
      .select()
      .from(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        inArray(tasks.todoListId, userTodoListIds)
      ));
    
    if (tasksToDelete.length !== taskIds.length) {
      throw new Error('Some tasks not found or not owned by user');
    }
    
    await db.delete(tasks).where(inArray(tasks.id, taskIds));
  }

  async moveTasksToTodoList(taskIds: string[], targetTodoListId: string, userId: string): Promise<Task[]> {
    // First verify all tasks belong to user's todolists
    const userTodoLists = await this.getUserTodoLists(userId);
    const userTodoListIds = userTodoLists.map(tl => tl.id);
    
    // Verify target todolist belongs to user
    const targetTodoList = await this.getTodoList(targetTodoListId);
    if (!targetTodoList || targetTodoList.userId !== userId) {
      throw new Error('Target TodoList not found or not owned by user');
    }
    
    const tasksToMove = await db
      .select()
      .from(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        inArray(tasks.todoListId, userTodoListIds)
      ));
    
    if (tasksToMove.length !== taskIds.length) {
      throw new Error('Some tasks not found or not owned by user');
    }
    
    // Get max order index in target todolist
    const targetTasks = await this.getTodoListTasks(targetTodoListId);
    const maxOrder = Math.max(...targetTasks.map(t => t.orderIndex || 0), 0);
    
    // Move tasks and assign distinct orderIndex values
    const movedTasks: Task[] = [];
    for (let i = 0; i < taskIds.length; i++) {
      const [movedTask] = await db
        .update(tasks)
        .set({ 
          todoListId: targetTodoListId,
          sectionId: null, // Clear section when moving between todolists
          orderIndex: maxOrder + i + 1 // Assign distinct order indices
        })
        .where(eq(tasks.id, taskIds[i]))
        .returning();
      movedTasks.push(movedTask);
    }
    
    return movedTasks;
  }
  
  // Section operations
  async getTodoListSections(todoListId: string): Promise<Section[]> {
    return await db
      .select()
      .from(sections)
      .where(eq(sections.todoListId, todoListId))
      .orderBy(sections.orderIndex, sections.createdAt);
  }

  async createSection(section: InsertSection): Promise<Section> {
    const [newSection] = await db
      .insert(sections)
      .values(section)
      .returning();
    return newSection;
  }

  async updateSection(id: string, updates: Partial<InsertSection>): Promise<Section> {
    const [updatedSection] = await db
      .update(sections)
      .set(updates)
      .where(eq(sections.id, id))
      .returning();
    return updatedSection;
  }

  async deleteSection(id: string): Promise<void> {
    // First move all tasks in this section to null section
    await db
      .update(tasks)
      .set({ sectionId: null })
      .where(eq(tasks.sectionId, id));
    
    // Then delete the section
    await db.delete(sections).where(eq(sections.id, id));
  }
}

export const storage = new DatabaseStorage();
