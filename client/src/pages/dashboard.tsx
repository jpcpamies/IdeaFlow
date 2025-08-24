import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Palette, 
  Plus, 
  Target, 
  CheckCircle, 
  Lightbulb, 
  Projector as Project,
  ArrowLeft,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Check,
  X
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project as ProjectType, User } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth() as { isAuthenticated: boolean; isLoading: boolean; user: User | null };
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectType | null>(null);

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

  // Fetch user projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectType[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch user stats
  const { data: stats = {
    activeProjects: 0,
    tasksCreated: 0,
    ideasCaptured: 0,
  } } = useQuery<{
    activeProjects: number;
    tasksCreated: number;
    ideasCaptured: number;
  }>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/projects', {
        name: `New Project ${Date.now()}`,
        description: 'A fresh canvas for your ideas',
        status: 'active',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "New project created successfully!",
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
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; description?: string; status?: string } }) => {
      const response = await apiRequest('PUT', `/api/projects/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setEditingProject(null);
      setEditingTitle("");
      toast({
        title: "Success",
        description: "Project updated successfully!",
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
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      toast({
        title: "Success",
        description: "Project deleted successfully!",
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
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Duplicate project mutation
  const duplicateProjectMutation = useMutation({
    mutationFn: async (project: ProjectType) => {
      const response = await apiRequest('POST', '/api/projects', {
        name: `${project.name} (Copy)`,
        description: project.description,
        status: project.status,
        canvasData: project.canvasData,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Project duplicated successfully!",
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
        description: "Failed to duplicate project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleEditProject = (project: ProjectType) => {
    setEditingProject(project.id);
    setEditingTitle(project.name);
  };

  const handleSaveEdit = (project: ProjectType) => {
    if (editingTitle.trim() && editingTitle !== project.name) {
      updateProjectMutation.mutate({
        id: project.id,
        updates: { name: editingTitle.trim() }
      });
    } else {
      setEditingProject(null);
      setEditingTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditingTitle("");
  };

  const handleDeleteProject = (project: ProjectType) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  };

  const handleDuplicateProject = (project: ProjectType) => {
    duplicateProjectMutation.mutate(project);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Archived</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Planning</Badge>;
    }
  };

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return "No date available";
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Updated just now";
    if (diffHours < 24) return `Updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Palette className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">My Canvas Projects</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => createProjectMutation.mutate()}
                disabled={createProjectMutation.isPending}
                data-testid="button-new-project"
              >
                <Plus className="mr-2 w-4 h-4" />
                {createProjectMutation.isPending ? 'Creating...' : 'New Project'}
              </Button>
              <div className="flex items-center space-x-2 text-muted-foreground">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="User avatar" 
                    className="w-8 h-8 rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {user?.firstName?.[0] || user?.email?.[0] || '?'}
                    </span>
                  </div>
                )}
                <span data-testid="text-username">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-active-projects">
                    {stats.activeProjects}
                  </p>
                </div>
                <Project className="text-primary w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Tasks Created</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-tasks-created">
                    {stats.tasksCreated}
                  </p>
                </div>
                <CheckCircle className="text-accent w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Ideas Captured</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="text-ideas-captured">
                    {stats.ideasCaptured}
                  </p>
                </div>
                <Lightbulb className="text-secondary w-8 h-8" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Recent Projects */}
        <Card className="bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          </div>
          
          {projectsLoading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to start brainstorming and organizing your ideas.
              </p>
              <Button 
                onClick={() => createProjectMutation.mutate()}
                disabled={createProjectMutation.isPending}
                data-testid="button-create-first-project"
              >
                <Plus className="mr-2 w-4 h-4" />
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project: ProjectType) => (
                <div key={project.id} className="p-6 relative group hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <Link 
                      href={`/canvas/${project.id}`} 
                      className="flex items-center space-x-4 flex-1 min-w-0"
                      data-testid={`link-project-${project.id}`}
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                        <Target className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingProject === project.id ? (
                          <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(project);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              onBlur={() => handleSaveEdit(project)}
                              className="font-medium text-gray-900"
                              maxLength={100}
                              autoFocus
                              data-testid={`input-project-name-${project.id}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                handleSaveEdit(project);
                              }}
                              disabled={updateProjectMutation.isPending}
                              data-testid={`button-save-edit-${project.id}`}
                            >
                              {updateProjectMutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                handleCancelEdit();
                              }}
                              data-testid={`button-cancel-edit-${project.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <h3 
                            className="font-medium text-gray-900 cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditProject(project);
                            }}
                            data-testid={`text-project-name-${project.id}`}
                          >
                            {project.name}
                          </h3>
                        )}
                        {editingProject !== project.id && (
                          <>
                            <p className="text-muted-foreground text-sm" data-testid={`text-project-description-${project.id}`}>
                              {project.description || 'No description'}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-muted-foreground" data-testid={`text-project-date-${project.id}`}>
                                {formatTimeAgo(project.updatedAt)}
                              </span>
                              {getStatusBadge(project.status)}
                            </div>
                          </>
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="text-lg font-semibold text-gray-900" data-testid={`text-project-progress-${project.id}`}>
                          {project.progress}%
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-project-options-${project.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEditProject(project)}
                            data-testid={`menu-item-rename-${project.id}`}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename Project
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDuplicateProject(project)}
                            disabled={duplicateProjectMutation.isPending}
                            data-testid={`menu-item-duplicate-${project.id}`}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {duplicateProjectMutation.isPending ? 'Duplicating...' : 'Duplicate Project'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`menu-item-delete-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-project">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Delete project '{projectToDelete?.name}'? This will permanently delete all ideas, groups, and TodoLists in this project. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setDeleteDialogOpen(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteProjectMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
