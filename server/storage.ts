import {
  users,
  projects,
  tasks,
  ideas,
  groups,
  todoLists,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Idea operations
  getUserIdeas(userId: string): Promise<Idea[]>;
  getIdea(id: string): Promise<Idea | undefined>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  updateIdea(id: string, updates: Partial<InsertIdea>): Promise<Idea>;
  deleteIdea(id: string): Promise<void>;
  
  // Group operations
  getUserGroups(userId: string): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  removeGroupFromIdeas(groupId: string): Promise<void>;
  
  // TodoList operations
  getUserTodoLists(userId: string): Promise<TodoList[]>;
  getTodoList(id: string): Promise<TodoList | undefined>;
  createTodoList(todoList: InsertTodoList): Promise<TodoList>;
  updateTodoList(id: string, updates: Partial<InsertTodoList>): Promise<TodoList>;
  deleteTodoList(id: string): Promise<void>;
  
  // Statistics
  getUserStats(userId: string): Promise<{
    activeProjects: number;
    tasksCreated: number;
    ideasCaptured: number;
    collaborators: number;
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
    collaborators: number;
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
      collaborators: 1, // Single user for now
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
      .set(updates)
      .where(eq(todoLists.id, id))
      .returning();
    return updatedTodoList;
  }

  async deleteTodoList(id: string): Promise<void> {
    await db.delete(todoLists).where(eq(todoLists.id, id));
  }
}

export const storage = new DatabaseStorage();
