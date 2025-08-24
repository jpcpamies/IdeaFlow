import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertTaskSchema, insertIdeaSchema, insertGroupSchema, insertTodoListSchema } from "@shared/schema";
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
      await storage.deleteTask(req.params.id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Idea routes
  app.get('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ideas = await storage.getUserIdeas(userId);
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
      
      await storage.deleteIdea(req.params.id);
      res.json({ message: "Idea deleted successfully" });
    } catch (error) {
      console.error("Error deleting idea:", error);
      res.status(500).json({ message: "Failed to delete idea" });
    }
  });

  // TodoList routes
  app.get("/api/todolists", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const todoLists = await storage.getUserTodoLists(userId);
      res.json(todoLists);
    } catch (error) {
      console.error("Error fetching user todo lists:", error);
      res.status(500).json({ message: "Failed to fetch todo lists" });
    }
  });

  app.post("/api/todolists", isAuthenticated, async (req, res) => {
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
