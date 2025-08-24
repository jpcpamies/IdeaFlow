import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertTaskSchema, insertIdeaSchema, insertGroupSchema, insertTodoListSchema, insertSectionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns the project
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectData = insertProjectSchema.parse({ ...req.body, userId });
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const updates = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, updates);
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // PUT route (same as PATCH for project updates)
  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const updates = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, updates);
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Task routes
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.projectId);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const tasks = await storage.getProjectTasks(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/projects/:projectId/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await storage.getProject(req.params.projectId);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const taskData = insertTaskSchema.parse({ 
        ...req.body, 
        projectId: req.params.projectId 
      });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const { completed } = req.body;
      
      // Handle TodoList task completion toggle
      if (typeof completed === 'boolean') {
        const updatedTask = await storage.toggleTask(id, completed, userId);
        return res.json(updatedTask);
      }
      
      // Handle general task updates (legacy project tasks)
      const updates = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(req.params.id, updates);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get task details before deletion for bi-directional sync
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify user owns the task (through todoList ownership)
      if (task.todoListId) {
        const todoList = await storage.getTodoList(task.todoListId);
        if (!todoList || todoList.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Bi-directional sync: Delete linked idea if it exists
      if (task.ideaId) {
        try {
          const linkedIdea = await storage.getIdea(task.ideaId);
          if (linkedIdea && linkedIdea.userId === userId) {
            await storage.deleteIdea(task.ideaId);
            console.log(`Deleted linked idea ${task.ideaId} for task ${req.params.id}`);
          }
        } catch (ideaError) {
          console.error("Error deleting linked idea:", ideaError);
          // Continue with task deletion even if idea deletion fails
        }
      }
      
      await storage.deleteTask(req.params.id);
      res.json({ 
        message: "Task and linked idea deleted successfully",
        deletedTaskId: req.params.id,
        deletedIdeaId: task.ideaId || null
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Idea routes
  app.get('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.query.projectId;
      let ideas = await storage.getUserIdeas(userId);
      
      // TODO: Filter by projectId when schema is updated
      // For now, return all ideas (no filtering)
      
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ message: "Failed to fetch ideas" });
    }
  });

  app.get('/api/ideas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      // Check if user owns the idea
      const userId = req.user.claims.sub;
      if (idea.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(idea);
    } catch (error) {
      console.error("Error fetching idea:", error);
      res.status(500).json({ message: "Failed to fetch idea" });
    }
  });

  app.post('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Creating idea - User ID:', userId);
      console.log('Request body:', req.body);
      
      const ideaData = insertIdeaSchema.parse({ ...req.body, userId });
      console.log('Parsed idea data:', ideaData);
      
      const idea = await storage.createIdea(ideaData);
      console.log('Created idea successfully:', idea);
      res.json(idea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid idea data", errors: error.errors });
      }
      console.error("Error creating idea:", error);
      res.status(500).json({ message: "Failed to create idea" });
    }
  });

  app.patch('/api/ideas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const idea = await storage.getIdea(req.params.id);
      
      if (!idea || idea.userId !== userId) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      const updates = insertIdeaSchema.partial().parse(req.body);
      const updatedIdea = await storage.updateIdea(req.params.id, updates);
      res.json(updatedIdea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating idea:", error);
      res.status(500).json({ message: "Failed to update idea" });
    }
  });

  app.delete('/api/ideas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const idea = await storage.getIdea(req.params.id);
      
      if (!idea || idea.userId !== userId) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      // Bi-directional sync: Find and delete any linked tasks
      try {
        const linkedTasks = await storage.getTasksByIdeaId(req.params.id);
        for (const task of linkedTasks) {
          await storage.deleteTask(task.id);
          console.log(`Deleted linked task ${task.id} for idea ${req.params.id}`);
        }
      } catch (taskError) {
        console.error("Error deleting linked tasks:", taskError);
        // Continue with idea deletion even if task deletion fails
      }
      
      await storage.deleteIdea(req.params.id);
      res.json({ 
        message: "Idea and linked tasks deleted successfully",
        deletedIdeaId: req.params.id 
      });
    } catch (error) {
      console.error("Error deleting idea:", error);
      res.status(500).json({ message: "Failed to delete idea" });
    }
  });

  // TodoList routes
  app.get("/api/todolists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const todoLists = await storage.getUserTodoLists(userId);
      res.json(todoLists);
    } catch (error) {
      console.error("Error fetching user todo lists:", error);
      res.status(500).json({ message: "Failed to fetch todo lists" });
    }
  });

  app.post("/api/todolists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { groupId, name } = req.body;
      
      if (!groupId || !name) {
        return res.status(400).json({ message: "Group ID and name are required" });
      }

      // Create the TodoList
      const todoList = await storage.createTodoList({
        userId,
        groupId,
        name,
      });

      // Get all ideas from the group and convert them to tasks
      const groupIdeas = await storage.getUserIdeas(userId);
      const ideasInGroup = groupIdeas.filter(idea => idea.groupId === groupId);
      
      // Create tasks from group ideas
      for (let i = 0; i < ideasInGroup.length; i++) {
        const idea = ideasInGroup[i];
        await storage.createTask({
          todoListId: todoList.id,
          ideaId: idea.id,
          title: idea.title,
          completed: false,
          orderIndex: i,
        });
      }

      res.json(todoList);
    } catch (error) {
      console.error("Error creating todo list:", error);
      res.status(500).json({ message: "Failed to create todo list" });
    }
  });

  // Update TodoList
  app.patch("/api/todolists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      // Validate updates using zod schema - only allow certain fields
      const allowedUpdates = insertTodoListSchema.partial().pick({
        name: true,
        archived: true
      }).parse(req.body);
      
      const updatedTodoList = await storage.updateTodoList(id, allowedUpdates);
      res.json(updatedTodoList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating todo list:", error);
      res.status(500).json({ message: "Failed to update todo list" });
    }
  });

  // Delete TodoList with all its tasks and sections
  app.delete("/api/todolists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      await storage.deleteTodoList(id);
      res.json({ message: "TodoList deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo list:", error);
      res.status(500).json({ message: "Failed to delete todo list" });
    }
  });

  // Duplicate TodoList with all tasks and sections
  app.post("/api/todolists/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the original todolist
      const originalTodoList = await storage.getTodoList(id);
      if (!originalTodoList || originalTodoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      // Create duplicate todolist
      const duplicatedTodoList = await storage.createTodoList({
        userId,
        groupId: originalTodoList.groupId,
        name: `${originalTodoList.name} (Copy)`,
      });
      
      // Get all sections from original todolist
      const originalSections = await storage.getTodoListSections(id);
      const sectionMapping: Record<string, string> = {};
      
      // Duplicate sections
      for (const section of originalSections) {
        const duplicatedSection = await storage.createSection({
          todoListId: duplicatedTodoList.id,
          name: section.name,
          orderIndex: section.orderIndex,
        });
        sectionMapping[section.id] = duplicatedSection.id;
      }
      
      // Get all tasks from original todolist
      const originalTasks = await storage.getTodoListTasks(id);
      
      // Duplicate tasks
      for (const task of originalTasks) {
        await storage.createTask({
          todoListId: duplicatedTodoList.id,
          sectionId: task.sectionId ? sectionMapping[task.sectionId] : null,
          title: task.title,
          completed: false, // Reset completion status for duplicated tasks
          orderIndex: task.orderIndex,
        });
      }
      
      res.json(duplicatedTodoList);
    } catch (error) {
      console.error("Error duplicating todo list:", error);
      res.status(500).json({ message: "Failed to duplicate todo list" });
    }
  });

  // Archive/Unarchive TodoList
  app.patch("/api/todolists/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Validate archived field
      const { archived } = z.object({
        archived: z.boolean()
      }).parse(req.body);
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      const updatedTodoList = await storage.updateTodoList(id, { archived });
      res.json(updatedTodoList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid archive data", errors: error.errors });
      }
      console.error("Error archiving todo list:", error);
      res.status(500).json({ message: "Failed to archive todo list" });
    }
  });

  app.get("/api/todolists/:id/tasks", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getTodoListTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching todo list tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Bulk task operations
  app.patch("/api/tasks/bulk-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Validate request body
      const { taskIds, updates } = z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID is required"),
        updates: insertTaskSchema.partial().pick({
          completed: true,
          sectionId: true,
          orderIndex: true,
          title: true
        })
      }).parse(req.body);
      
      const updatedTasks = await storage.bulkUpdateTasks(taskIds, updates, userId);
      res.json({ updatedTasks });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bulk update data", errors: error.errors });
      }
      console.error("Error bulk updating tasks:", error);
      res.status(500).json({ message: "Failed to bulk update tasks" });
    }
  });

  app.delete("/api/tasks/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Validate request body
      const { taskIds } = z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID is required")
      }).parse(req.body);
      
      await storage.bulkDeleteTasks(taskIds, userId);
      res.json({ message: `Successfully deleted ${taskIds.length} tasks`, deletedTaskIds: taskIds });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bulk delete data", errors: error.errors });
      }
      console.error("Error bulk deleting tasks:", error);
      res.status(500).json({ message: "Failed to bulk delete tasks" });
    }
  });

  app.patch("/api/tasks/move-to-todolist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Validate request body
      const { taskIds, targetTodoListId } = z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID is required"),
        targetTodoListId: z.string().min(1, "Target TodoList ID is required")
      }).parse(req.body);
      
      const movedTasks = await storage.moveTasksToTodoList(taskIds, targetTodoListId, userId);
      res.json({ movedTasks });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid move data", errors: error.errors });
      }
      console.error("Error moving tasks to todolist:", error);
      res.status(500).json({ message: "Failed to move tasks" });
    }
  });

  // Section routes for TodoLists
  app.get("/api/todolists/:id/sections", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const sections = await storage.getTodoListSections(id);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching todo list sections:", error);
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.post("/api/todolists/:id/sections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      const sectionData = insertSectionSchema.parse({ ...req.body, todoListId: id });
      const section = await storage.createSection(sectionData);
      res.json(section);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid section data", errors: error.errors });
      }
      console.error("Error creating section:", error);
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.patch("/api/sections/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertSectionSchema.partial().parse(req.body);
      const updatedSection = await storage.updateSection(id, updates);
      res.json(updatedSection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating section:", error);
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete("/api/sections/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSection(id);
      res.json({ message: "Section deleted successfully" });
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  // Bulk task operations
  app.patch("/api/tasks/bulk-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { taskIds, updates } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }
      
      const updatedTasks = await storage.bulkUpdateTasks(taskIds, updates, userId);
      res.json(updatedTasks);
    } catch (error) {
      console.error("Error bulk updating tasks:", error);
      res.status(500).json({ message: "Failed to bulk update tasks" });
    }
  });

  app.delete("/api/tasks/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { taskIds } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }
      
      await storage.bulkDeleteTasks(taskIds, userId);
      res.json({ message: `Successfully deleted ${taskIds.length} tasks` });
    } catch (error) {
      console.error("Error bulk deleting tasks:", error);
      res.status(500).json({ message: "Failed to bulk delete tasks" });
    }
  });

  app.patch("/api/tasks/move-to-todolist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { taskIds, targetTodoListId } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }
      
      // Verify user owns the target todolist
      const targetTodoList = await storage.getTodoList(targetTodoListId);
      if (!targetTodoList || targetTodoList.userId !== userId) {
        return res.status(404).json({ message: "Target TodoList not found" });
      }
      
      const movedTasks = await storage.moveTasksToTodoList(taskIds, targetTodoListId, userId);
      res.json(movedTasks);
    } catch (error) {
      console.error("Error moving tasks to todolist:", error);
      res.status(500).json({ message: "Failed to move tasks" });
    }
  });

  // Advanced task management routes
  app.patch("/api/tasks/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      const { completed } = req.body;
      
      const updatedTask = await storage.toggleTask(id, completed, userId);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error toggling task:", error);
      res.status(500).json({ message: "Failed to toggle task" });
    }
  });

  app.patch("/api/tasks/:id/reorder", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { orderIndex, sectionId } = req.body;
      
      const updatedTask = await storage.updateTaskOrder(id, orderIndex, sectionId);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error reordering task:", error);
      res.status(500).json({ message: "Failed to reorder task" });
    }
  });

  app.post("/api/todolists/:id/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      const taskData = insertTaskSchema.parse({ ...req.body, todoListId: id });
      
      // Create corresponding idea on canvas for task-canvas synchronization
      let ideaId: string | undefined;
      
      try {
        // Get existing ideas in the same group for positioning
        const userIdeas = await storage.getUserIdeas(userId);
        const groupIdeas = userIdeas.filter(idea => idea.groupId === todoList.groupId);
        
        // Calculate position for new idea card
        let canvasX = 100; // default position
        let canvasY = 100;
        
        if (groupIdeas.length > 0) {
          // Position new card near existing cards in the group
          const lastIdea = groupIdeas[groupIdeas.length - 1];
          canvasX = lastIdea.canvasX + 300; // Space cards horizontally
          canvasY = lastIdea.canvasY;
          
          // Wrap to next row if too far right
          if (canvasX > 1000) {
            canvasX = 100;
            canvasY = lastIdea.canvasY + 200;
          }
        }
        
        // Get group info for color
        const group = await storage.getGroup(todoList.groupId);
        const ideaColor = group?.color || '#3B82F6';
        
        // Create idea card on canvas
        const ideaData = {
          userId,
          groupId: todoList.groupId,
          title: taskData.title,
          description: `Task from ${todoList.name}`,
          color: ideaColor,
          canvasX,
          canvasY
        };
        
        const idea = await storage.createIdea(ideaData);
        ideaId = idea.id;
        
        console.log(`Created synchronized idea ${ideaId} for task "${taskData.title}"`);
      } catch (ideaError) {
        console.error("Error creating synchronized idea:", ideaError);
        // Continue with task creation even if idea creation fails
      }
      
      // Create task with idea link
      const taskWithIdea = { ...taskData, ideaId };
      const task = await storage.createTask(taskWithIdea);
      
      // Return both task and idea information for frontend synchronization
      res.json({ 
        task, 
        ideaCreated: !!ideaId, 
        ideaId,
        message: ideaId ? "Task and canvas idea created successfully" : "Task created successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.delete("/api/todolists/:id/completed-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Verify user owns the todolist
      const todoList = await storage.getTodoList(id);
      if (!todoList || todoList.userId !== userId) {
        return res.status(404).json({ message: "TodoList not found" });
      }
      
      await storage.clearCompletedTasks(id, userId);
      res.json({ message: "Completed tasks cleared successfully" });
    } catch (error) {
      console.error("Error clearing completed tasks:", error);
      res.status(500).json({ message: "Failed to clear completed tasks" });
    }
  });


  // Group routes
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Creating group - User ID:', userId);
      console.log('Group request body:', req.body);
      
      const groupData = insertGroupSchema.parse({ ...req.body, userId });
      console.log('Parsed group data:', groupData);
      
      const group = await storage.createGroup(groupData);
      console.log('Created group successfully:', group);
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Group validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.patch('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getGroup(req.params.id);
      
      if (!group || group.userId !== userId) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const updates = insertGroupSchema.partial().parse(req.body);
      const updatedGroup = await storage.updateGroup(req.params.id, updates);
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.delete('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const group = await storage.getGroup(req.params.id);
      
      if (!group || group.userId !== userId) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Remove group from all ideas first
      await storage.removeGroupFromIdeas(req.params.id);
      await storage.deleteGroup(req.params.id);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Stats route
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
