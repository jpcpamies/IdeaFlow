import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MousePointer, 
  Pen, 
  Shapes, 
  Type, 
  StickyNote,
  Wand2,
  Share,
  Plus,
  ChevronRight,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Task } from "@shared/schema";

type CanvasTool = 'select' | 'pen' | 'shapes' | 'text' | 'sticky';

export default function Canvas() {
  const [match, params] = useRoute("/canvas/:projectId");
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTool, setSelectedTool] = useState<CanvasTool>('select');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const projectId = params?.projectId;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: isAuthenticated && !!projectId,
  });

  // Fetch project tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: isAuthenticated && !!projectId,
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        isCompleted,
        status: isCompleted ? 'completed' : 'pending',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; description?: string; priority: string }) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Task created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create task.",
        variant: "destructive",
      });
    },
  });

  const handleToolSelect = (tool: CanvasTool) => {
    setSelectedTool(tool);
  };

  const handleToggleTask = (taskId: string, isCompleted: boolean) => {
    toggleTaskMutation.mutate({ taskId, isCompleted });
  };

  const handleConvertToTasks = () => {
    // Create sample tasks based on canvas content
    const sampleTasks = [
      { title: "Conduct user research", description: "Interview target users to gather feedback", priority: "high" },
      { title: "Create wireframes", description: "Design low-fidelity wireframes for key screens", priority: "medium" },
      { title: "Build prototype", description: "Create interactive mockup for testing", priority: "medium" },
    ];

    sampleTasks.forEach(task => {
      createTaskMutation.mutate(task);
    });
  };

  const handleAddCustomTask = () => {
    createTaskMutation.mutate({
      title: "New task",
      description: "Add your task description here",
      priority: "medium"
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Normal</Badge>;
    }
  };

  const completedTasks = tasks.filter((task: Task) => task.isCompleted).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (isLoading || projectLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !project) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      {/* Canvas Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-muted-foreground hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="text-project-name">
            {project.name}
          </h1>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">Saved automatically</span>
        </div>
        
        {/* Canvas Tools */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={selectedTool === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('select')}
            data-testid="button-tool-select"
          >
            <MousePointer className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'pen' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('pen')}
            data-testid="button-tool-pen"
          >
            <Pen className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'shapes' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('shapes')}
            data-testid="button-tool-shapes"
          >
            <Shapes className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('text')}
            data-testid="button-tool-text"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            variant={selectedTool === 'sticky' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('sticky')}
            data-testid="button-tool-sticky"
          >
            <StickyNote className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleConvertToTasks}
            disabled={createTaskMutation.isPending}
            data-testid="button-convert-to-tasks"
          >
            <Wand2 className="mr-2 w-4 h-4" />
            Convert to Tasks
          </Button>
          <Button variant="outline" data-testid="button-share-project">
            <Share className="mr-2 w-4 h-4" />
            Share
          </Button>
        </div>
      </header>

      <div className="flex h-full">
        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-white">
          <div className="w-full h-full relative bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Canvas content placeholder - In a real implementation, this would be a proper canvas */}
            <div className="absolute inset-0 p-8">
              <div className="text-center pt-32">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Canvas Ready</h3>
                <p className="text-muted-foreground mb-6">
                  Start sketching your ideas, add sticky notes, or create shapes.
                  <br />
                  Selected tool: <span className="font-medium capitalize">{selectedTool}</span>
                </p>
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="bg-yellow-200 p-4 rounded-lg shadow-md rotate-3 cursor-move">
                    <p className="text-sm font-medium">User Research</p>
                    <p className="text-xs text-gray-600">Interview potential users</p>
                  </div>
                  <div className="bg-blue-200 p-4 rounded-lg shadow-md -rotate-2 cursor-move">
                    <p className="text-sm font-medium">Design Wireframes</p>
                    <p className="text-xs text-gray-600">Create low-fidelity mockups</p>
                  </div>
                  <div className="bg-green-200 p-4 rounded-lg shadow-md rotate-1 cursor-move">
                    <p className="text-sm font-medium">Build Prototype</p>
                    <p className="text-xs text-gray-600">Interactive demo version</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Button */}
          <Button
            className="absolute bottom-8 right-8 w-14 h-14 rounded-full shadow-lg hover:scale-105"
            data-testid="button-add-element"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </main>

        {/* Task Panel */}
        <aside className={`w-80 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-80'
        }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Generated Tasks</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                data-testid="button-toggle-panel"
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                  isPanelOpen ? 'rotate-180' : ''
                }`} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground text-sm">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm mb-4">No tasks yet</p>
                <Button
                  size="sm"
                  onClick={handleConvertToTasks}
                  disabled={createTaskMutation.isPending}
                  data-testid="button-generate-tasks"
                >
                  <Wand2 className="mr-2 w-4 h-4" />
                  Generate Tasks
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task: Task) => (
                  <Card key={task.id} className="bg-gray-50 hover:bg-gray-100 transition-colors border-0">
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={task.isCompleted || false}
                          onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                          className="mt-1"
                          data-testid={`checkbox-task-${task.id}`}
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-medium text-gray-900 ${
                            task.isCompleted ? 'line-through opacity-60' : ''
                          }`} data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className={`text-xs text-muted-foreground ${
                              task.isCompleted ? 'opacity-60' : ''
                            }`} data-testid={`text-task-description-${task.id}`}>
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            {task.isCompleted ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Completed
                              </Badge>
                            ) : (
                              getPriorityBadge(task.priority)
                            )}
                            {task.estimatedTime && (
                              <span className="text-xs text-muted-foreground">
                                {task.estimatedTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-4 border-dashed"
              onClick={handleAddCustomTask}
              disabled={createTaskMutation.isPending}
              data-testid="button-add-custom-task"
            >
              <Plus className="mr-2 w-4 h-4" />
              Add Custom Task
            </Button>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-gray-900" data-testid="text-progress-percentage">
                {progress}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
