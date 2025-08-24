import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Palette,
  Plus,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  User,
  Lightbulb,
  Target,
  Bookmark,
  Folder,
  Settings,
  MoreVertical,
  Users,
  Edit,
  Edit2,
  Trash2,
  ArrowLeft,
  MoreHorizontal,
  Maximize2,
  Tag,
  ClipboardList,
  GripVertical,
  Check,
  X,
  Copy,
  Archive,
  Undo,
  CheckSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Idea, Group, InsertIdea, TodoList, InsertTodoList, Task, Section, InsertTask, InsertSection } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Drag state interface
interface DragState {
  isDragging: boolean;
  dragCardId: string | null;
  startPos: { x: number, y: number };
  offset: { x: number, y: number };
  initialPositions: Record<string, { x: number, y: number }>;
  currentPositions: Record<string, { x: number, y: number }>;
  dragElements: Record<string, HTMLElement>;
}

// TodoList functionality - converts group ideas into actionable task lists

export default function Canvas() {
  const { user } = useAuth() as { user: any };
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [, params] = useRoute("/canvas/:projectId");
  const [, navigate] = useLocation();
  const projectId = params?.projectId;
  
  // Get current project data
  const { data: currentProject, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });
  
  // UI State
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNewIdeaDialogOpen, setIsNewIdeaDialogOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isGroupActionsModalOpen, setIsGroupActionsModalOpen] = useState(false);
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null); // null = "All Ideas"
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [isEditIdeaDialogOpen, setIsEditIdeaDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  // TodoList Modal State
  const [selectedTodoList, setSelectedTodoList] = useState<TodoList | null>(null);
  const [isTodoListModalOpen, setIsTodoListModalOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // TodoList management states
  const [editingTodoListId, setEditingTodoListId] = useState<string | null>(null);
  const [editingTodoListTitle, setEditingTodoListTitle] = useState('');
  const [deleteTodoListConfirmOpen, setDeleteTodoListConfirmOpen] = useState(false);
  const [todoListToDelete, setTodoListToDelete] = useState<TodoList | null>(null);
  
  // Bulk task operations states
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  // Separate input state for each section and general tasks
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [generalTaskInput, setGeneralTaskInput] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  
  // Form State
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  const [newIdeaGroupId, setNewIdeaGroupId] = useState<string>("");
  const [newIdeaColor, setNewIdeaColor] = useState("#3B82F6");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  // Edit Form State
  const [editIdeaTitle, setEditIdeaTitle] = useState("");
  const [editIdeaDescription, setEditIdeaDescription] = useState("");
  const [editIdeaGroupId, setEditIdeaGroupId] = useState<string>("");
  const [editIdeaColor, setEditIdeaColor] = useState("#3B82F6");
  const [isEditingCreatingNewGroup, setIsEditingCreatingNewGroup] = useState(false);
  const [editNewGroupName, setEditNewGroupName] = useState("");
  
  // Canvas Panning State
  const [panState, setPanState] = useState({
    x: 0,
    y: 0,
    isPanning: false,
    startPan: { x: 0, y: 0 },
    lastPan: { x: 0, y: 0 }
  });

  // Simple Zoom State (removed animation and wheel handling)
  // Only keep the basic zoom level

  // Drag State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragCardId: null,
    startPos: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    initialPositions: {},
    currentPositions: {},
    dragElements: {}
  });

  // Animation frame ref for smooth dragging
  const animationFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState>(dragState);

  // API Queries - filtered by project  
  const { data: ideas = [], isLoading: ideasLoading, error: ideasError, isError: hasIdeasError } = useQuery({
    queryKey: ['/api/ideas', { projectId }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ideas${
        projectId ? `?projectId=${projectId}` : ''
      }`);
      if (!response.ok) throw new Error('Failed to fetch ideas');
      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
  }) as { data: Idea[], isLoading: boolean, error: any, isError: boolean };

  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups', { projectId }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/groups${
        projectId ? `?projectId=${projectId}` : ''
      }`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      return response.json();
    },
  }) as { data: Group[] };

  // Fetch TodoLists for the current project
  const { data: todoLists = [] } = useQuery({
    queryKey: ['/api/todolists', { projectId }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/todolists${
        projectId ? `?projectId=${projectId}` : ''
      }`);
      if (!response.ok) throw new Error('Failed to fetch todolists');
      return response.json();
    },
  }) as { data: TodoList[] };

  // Fetch tasks for TodoLists
  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/todolists', 'tasks'],
    queryFn: async () => {
      if (todoLists.length === 0) return [];
      
      const taskPromises = todoLists.map(async (todoList: TodoList) => {
        const response = await apiRequest('GET', `/api/todolists/${todoList.id}/tasks`);
        if (!response.ok) return [];
        const tasks = await response.json();
        return tasks.map((task: Task) => ({ ...task, todoListId: todoList.id }));
      });
      
      const allTasksArrays = await Promise.all(taskPromises);
      return allTasksArrays.flat();
    },
    enabled: todoLists.length > 0,
  }) as { data: Task[] };

  // Fetch sections for selected TodoList
  const { data: todoListSections = [] } = useQuery({
    queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'],
    queryFn: async () => {
      if (!selectedTodoList) return [];
      const response = await apiRequest('GET', `/api/todolists/${selectedTodoList.id}/sections`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedTodoList,
  }) as { data: Section[] };

  // Fetch tasks for selected TodoList (more detailed for modal)
  const { data: todoListTasks = [] } = useQuery({
    queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'],
    queryFn: async () => {
      if (!selectedTodoList) return [];
      const response = await apiRequest('GET', `/api/todolists/${selectedTodoList.id}/tasks`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedTodoList,
  }) as { data: Task[] };

  // Filter ideas based on selected group
  const filteredIdeas = selectedFilter 
    ? ideas.filter(idea => idea.groupId === selectedFilter)
    : ideas;

  // Perfect fit-to-canvas functionality
  const calculateBoundingBox = (cardIdeas: Idea[]) => {
    if (cardIdeas.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    
    // Get all card positions and calculate precise boundaries
    const cardWidth = 240;
    const cardHeight = 120;
    
    const positions = cardIdeas.map(idea => ({
      left: idea.canvasX,
      top: idea.canvasY,
      right: idea.canvasX + cardWidth,
      bottom: idea.canvasY + cardHeight
    }));
    
    // Find extreme positions
    const minX = Math.min(...positions.map(p => p.left));
    const minY = Math.min(...positions.map(p => p.top));
    const maxX = Math.max(...positions.map(p => p.right));
    const maxY = Math.max(...positions.map(p => p.bottom));
    
    console.log('Bounding box calculation:');
    console.log('  Cards analyzed:', cardIdeas.length);
    console.log('  Leftmost card at x:', minX);
    console.log('  Rightmost card ends at x:', maxX);
    console.log('  Topmost card at y:', minY);
    console.log('  Bottommost card ends at y:', maxY);
    console.log('  Total content area:', (maxX - minX), 'x', (maxY - minY));
    
    return { minX, minY, maxX, maxY };
  };

  const fitToView = () => {
    console.log('=== FIT TO CANVAS OPERATION ===');
    console.log('Available ideas to analyze:', filteredIdeas.length);
    console.log('Right sidebar open:', isRightSidebarOpen);
    
    if (filteredIdeas.length === 0) {
      console.log('No ideas to fit - operation cancelled');
      return;
    }
    
    const canvasContainer = canvasRef.current?.parentElement;
    if (!canvasContainer) {
      console.log('Canvas container not available - operation cancelled');
      return;
    }
    
    // Calculate precise content boundaries
    const bounds = calculateBoundingBox(filteredIdeas);
    
    // Get actual available canvas space (accounts for margins and sidebar automatically)
    const viewportWidth = canvasContainer.clientWidth;
    const viewportHeight = canvasContainer.clientHeight;
    console.log('Available canvas space:', viewportWidth, 'x', viewportHeight);
    console.log('Right sidebar open:', isRightSidebarOpen ? 'YES' : 'NO');
    
    // Canvas now automatically expands when sidebar is closed due to flexbox layout
    // and has proper breathing room margins applied via CSS classes
    const effectiveViewportWidth = viewportWidth;
    const effectiveViewportHeight = viewportHeight;
    
    // Calculate content dimensions
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    console.log('Raw content dimensions:', contentWidth, 'x', contentHeight);
    
    // Add 50px margin around all cards as requested
    const paddingMargin = 50;
    const paddedWidth = contentWidth + (paddingMargin * 2);
    const paddedHeight = contentHeight + (paddingMargin * 2);
    console.log('Content with padding:', paddedWidth, 'x', paddedHeight);
    
    // Calculate zoom percentage needed to fit content
    const zoomRatioX = effectiveViewportWidth / paddedWidth;
    const zoomRatioY = effectiveViewportHeight / paddedHeight;
    console.log('Zoom ratios - X:', zoomRatioX.toFixed(3), 'Y:', zoomRatioY.toFixed(3));
    
    // Use the smaller ratio to ensure all content fits
    const optimalZoomRatio = Math.min(zoomRatioX, zoomRatioY);
    const optimalZoomPercent = optimalZoomRatio * 100;
    console.log('Optimal zoom ratio:', optimalZoomRatio.toFixed(3), '(', optimalZoomPercent.toFixed(1), '%)');
    
    // Apply zoom bounds (25% minimum, 400% maximum, rounded to 25% increments)
    let finalZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, optimalZoomPercent));
    finalZoom = Math.round(finalZoom / ZOOM_STEP) * ZOOM_STEP;
    console.log('Final zoom after bounds and rounding:', finalZoom, '%');
    
    // Apply zoom immediately (no animation)
    setZoomLevel(finalZoom);
    
    // Calculate centered pan position for the content
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    // Center the content in the available canvas space
    const newPanX = (effectiveViewportWidth / 2) - (centerX * (finalZoom / 100));
    const newPanY = (effectiveViewportHeight / 2) - (centerY * (finalZoom / 100));
    
    // Apply centered pan position
    setPanState({
      x: newPanX,
      y: newPanY,
      isPanning: false,
      startPan: { x: 0, y: 0 },
      lastPan: { x: newPanX, y: newPanY }
    });
    
    console.log('Content centered at pan position:', newPanX.toFixed(1), ',', newPanY.toFixed(1));
    console.log('=== FIT TO CANVAS COMPLETE ===');
  };

  // Debug logging (remove in production)
  // console.log('Ideas data:', ideas);
  // console.log('Groups data:', groups);
  // console.log('Ideas loading:', ideasLoading);

  // Mutations
  const createIdeaMutation = useMutation({
    mutationFn: async (data: InsertIdea) => {
      console.log('Mutation function called with:', data);
      const res = await apiRequest('POST', '/api/ideas', data);
      console.log('API response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'Failed to create idea');
      }
      
      const result = await res.json();
      console.log('Idea created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/ideas', { projectId }] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups', { projectId }] });
      // Clear all form fields
      setNewIdeaTitle("");
      setNewIdeaDescription("");
      setNewIdeaGroupId("");
      setNewIdeaColor("#3B82F6");
      setIsCreatingNewGroup(false);
      setNewGroupName("");
      setIsNewIdeaDialogOpen(false);
    },
    onError: (error) => {
      console.error('Mutation failed:', error);
      alert('Failed to create idea: ' + error.message);
    },
  });

  const updateIdeaEditMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertIdea> }) => {
      console.log('Updating idea:', data);
      const res = await apiRequest('PATCH', `/api/ideas/${data.id}`, data.updates);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'Failed to update idea');
      }
      
      const result = await res.json();
      console.log('Idea updated successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      // Clear edit form fields
      setEditIdeaTitle("");
      setEditIdeaDescription("");
      setEditIdeaGroupId("");
      setEditIdeaColor("#3B82F6");
      setIsEditingCreatingNewGroup(false);
      setEditNewGroupName("");
      setEditingIdea(null);
      setIsEditIdeaDialogOpen(false);
    },
    onError: (error) => {
      console.error('Update mutation failed:', error);
      alert('Failed to update idea: ' + error.message);
    },
  });

  const updateIdeaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Idea> }) => {
      const res = await apiRequest('PATCH', `/api/ideas/${id}`, updates);
      return await res.json();
    },
    onSuccess: (updatedIdea: Idea, variables) => {
      // Only skip invalidation for position updates to prevent snap-back
      if (!('groupId' in variables.updates)) {
        return; // Skip invalidation for position updates (canvasX, canvasY)
      }
      // For group assignments/removals, update the local cache immediately
      queryClient.setQueryData(['/api/ideas'], (oldData: Idea[] | undefined) => {
        if (!oldData) return [updatedIdea];
        return oldData.map(idea => 
          idea.id === variables.id ? { ...idea, ...variables.updates } : idea
        );
      });
    },
    onError: (error) => {
      console.error('Failed to update idea:', error);
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; color: string }) => {
      const res = await apiRequest('POST', '/api/groups', groupData);
      return await res.json();
    },
    onSuccess: (newGroup: Group) => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Group> }) => {
      const res = await apiRequest('PATCH', `/api/groups/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setEditingGroup(null);
    },
    onError: (error) => {
      console.error('Failed to update group:', error);
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/groups/${id}`);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      // Reset filter if deleted group was selected
      if (selectedFilter === variables) {
        setSelectedFilter(null);
      }
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
    }
  });

  const deleteIdeaMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting idea:', id);
      const res = await apiRequest('DELETE', `/api/ideas/${id}`);
      return await res.json();
    },
    onSuccess: (data) => {
      const { message, deletedIdeaId } = data;
      console.log('Bi-directional deletion completed:', message);
      
      // Invalidate ideas and groups queries
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      // Also invalidate TodoList queries for bi-directional sync (linked tasks may be deleted)
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      if (selectedTodoList?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList.id, 'tasks'] });
      }
      
      setSelectedCards([]);
      setIdeaToDelete(null);
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      console.error('Failed to delete idea:', error);
      alert('Failed to delete idea: ' + error.message);
    },
  });

  // Create TodoList mutation
  const createTodoListMutation = useMutation({
    mutationFn: async ({ groupId, name, projectId }: { groupId: string; name: string; projectId: string }) => {
      console.log('Creating TodoList for group:', groupId, 'with name:', name, 'in project:', projectId);
      const response = await apiRequest('POST', '/api/todolists', { groupId, name, projectId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create TodoList');
      }
      return response.json();
    },
    onSuccess: (todoList) => {
      console.log('TodoList created successfully:', todoList);
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', { projectId }] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
    },
    onError: (error) => {
      console.error('Failed to create TodoList:', error);
      alert('Failed to create TodoList. Please try again.');
    }
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      console.log('Toggling task completion:', taskId, 'to', completed);
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}/toggle`, { completed });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle task');
      }
      return response.json();
    },
    onSuccess: (updatedTask) => {
      console.log('Task toggled successfully:', updatedTask);
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      if (selectedTodoList) {
        queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList.id, 'tasks'] });
      }
    },
    onError: (error) => {
      console.error('Failed to toggle task:', error);
      alert('Failed to update task. Please try again.');
    }
  });

  // Advanced Task and Section Mutations
  const createSectionMutation = useMutation({
    mutationFn: async ({ todoListId, name, orderIndex }: { todoListId: string; name: string; orderIndex: number }) => {
      const response = await apiRequest('POST', `/api/todolists/${todoListId}/sections`, { name, orderIndex });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create section');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
      setNewSectionName('');
    },
    onError: (error) => {
      console.error('Failed to create section:', error);
      alert('Failed to create section. Please try again.');
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertSection> }) => {
      const response = await apiRequest('PATCH', `/api/sections/${id}`, updates);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update section');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
      setEditingSectionId(null);
      setEditingSectionTitle('');
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/sections/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete section');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ todoListId, title, sectionId, orderIndex }: { todoListId: string; title: string; sectionId?: string; orderIndex: number }) => {
      const taskData: Partial<InsertTask> = {
        title,
        completed: false,
        orderIndex
      };
      if (sectionId) {
        taskData.sectionId = sectionId;
      }
      
      const response = await apiRequest('POST', `/api/todolists/${todoListId}/tasks`, taskData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }
      return response.json();
    },
    onSuccess: (data: any, variables: any) => {
      // Handle the new response format that includes both task and idea information
      const { task, ideaCreated, ideaId, message } = data;
      
      console.log('Task creation response:', { task: task?.id, ideaCreated, ideaId, message });
      
      // Invalidate task-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      
      // If an idea was created, also invalidate ideas and groups queries for canvas sync
      if (ideaCreated && ideaId) {
        queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
        console.log(`Canvas synchronized: Created idea ${ideaId} for task "${task.title}"`);
      }
      
      // Input field is already cleared in addNewTask for better UX
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertTask> }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, updates);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      setEditingTaskId(null);
      setEditingTaskTitle('');
    }
  });

  const reorderTaskMutation = useMutation({
    mutationFn: async ({ id, orderIndex, sectionId }: { id: string; orderIndex: number; sectionId?: string | null }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}/reorder`, { orderIndex, sectionId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reorder task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting task:', id);
      const response = await apiRequest('DELETE', `/api/tasks/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const { message, deletedTaskId, deletedIdeaId } = data;
      console.log('Bi-directional deletion completed:', message);
      
      // Invalidate task-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      
      // If a linked idea was deleted, also invalidate idea queries for canvas sync
      if (deletedIdeaId) {
        queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
        console.log(`Canvas synchronized: Deleted linked idea ${deletedIdeaId}`);
      }
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task: ' + error.message);
    }
  });

  const clearCompletedTasksMutation = useMutation({
    mutationFn: async (todoListId: string) => {
      const response = await apiRequest('DELETE', `/api/todolists/${todoListId}/completed-tasks`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear completed tasks');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      // Also invalidate ideas since completed tasks with linked ideas will be deleted
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    }
  });

  // Drag and Drop Sensors for TodoList Modal
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Optimized section input handlers to prevent re-renders
  const handleSectionInputChange = useCallback((sectionId: string, value: string) => {
    setSectionInputs(prev => ({ ...prev, [sectionId]: value }));
  }, []);

  const handleSectionInputKeyDown = useCallback((e: React.KeyboardEvent, sectionId: string) => {
    if (e.key === 'Enter') addNewTask(sectionId);
  }, []);

  // Section reordering mutation
  const reorderSectionMutation = useMutation({
    mutationFn: async ({ id, orderIndex }: { id: string; orderIndex: number }) => {
      const response = await apiRequest('PATCH', `/api/sections/${id}`, { orderIndex });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reorder section');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
    }
  });

  // TodoList CRUD mutations
  const updateTodoListMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertTodoList> }) => {
      const response = await apiRequest('PATCH', `/api/todolists/${id}`, updates);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update TodoList');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      setEditingTodoListId(null);
      setEditingTodoListTitle('');
    }
  });

  const deleteTodoListMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/todolists/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete TodoList');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      setDeleteTodoListConfirmOpen(false);
      setTodoListToDelete(null);
      closeTodoListModal();
    }
  });

  const duplicateTodoListMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/todolists/${id}/duplicate`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate TodoList');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
    }
  });

  const archiveTodoListMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const response = await apiRequest('PATCH', `/api/todolists/${id}/archive`, { archived });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to archive TodoList');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
    }
  });

  // Bulk task operations mutations
  const bulkUpdateTasksMutation = useMutation({
    mutationFn: async ({ taskIds, updates }: { taskIds: string[]; updates: Partial<InsertTask> }) => {
      const response = await apiRequest('PATCH', '/api/tasks/bulk-update', { taskIds, updates });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to bulk update tasks');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      setSelectedTasks(new Set());
      setBulkActionMode(false);
    }
  });

  const bulkDeleteTasksMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await apiRequest('DELETE', '/api/tasks/bulk-delete', { taskIds });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to bulk delete tasks');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      setSelectedTasks(new Set());
      setBulkActionMode(false);
    }
  });

  const moveTasksToTodoListMutation = useMutation({
    mutationFn: async ({ taskIds, targetTodoListId }: { taskIds: string[]; targetTodoListId: string }) => {
      const response = await apiRequest('PATCH', '/api/tasks/move-to-todolist', { taskIds, targetTodoListId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to move tasks');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      setSelectedTasks(new Set());
      setBulkActionMode(false);
    }
  });

  // TodoList Modal Functions
  const openTodoListModal = (todoList: TodoList) => {
    setSelectedTodoList(todoList);
    setIsTodoListModalOpen(true);
  };

  const closeTodoListModal = () => {
    setSelectedTodoList(null);
    setIsTodoListModalOpen(false);
    setCollapsedSections(new Set());
    setEditingTaskId(null);
    setEditingTaskTitle('');
    setEditingSectionId(null);
    setEditingSectionTitle('');
    setSectionInputs({});
    setGeneralTaskInput('');
    setNewSectionName('');
    setSelectedTasks(new Set());
    setBulkActionMode(false);
    setEditingTodoListId(null);
    setEditingTodoListTitle('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Only handle task dragging
    if (!activeId.startsWith('task-')) return;

    const activeTask = todoListTasks.find(task => `task-${task.id}` === activeId);
    if (!activeTask) return;

    // Handle task-to-task (reordering within or across sections)
    if (overId.startsWith('task-')) {
      const overTask = todoListTasks.find(task => `task-${task.id}` === overId);
      if (!overTask) return;

      // Calculate new order index based on position relative to the over task
      const tasksInTargetSection = todoListTasks
        .filter(task => task.sectionId === (overTask.sectionId || null))
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      
      const overTaskIndex = tasksInTargetSection.findIndex(task => task.id === overTask.id);
      const activeTaskIndex = tasksInTargetSection.findIndex(task => task.id === activeTask.id);
      
      // Don't move if it's the exact same position
      if (activeTaskIndex === overTaskIndex) return;
      
      // Calculate new order index
      let newOrderIndex: number;
      if (overTaskIndex === 0) {
        // Moving to first position
        newOrderIndex = Math.max(0, (overTask.orderIndex || 0) - 1);
      } else if (activeTaskIndex < overTaskIndex) {
        // Moving down in the list
        newOrderIndex = (overTask.orderIndex || 0);
      } else {
        // Moving up in the list
        const prevTask = tasksInTargetSection[overTaskIndex - 1];
        newOrderIndex = prevTask ? ((prevTask.orderIndex || 0) + (overTask.orderIndex || 0)) / 2 : (overTask.orderIndex || 0) - 1;
      }

      reorderTaskMutation.mutate({
        id: activeTask.id,
        orderIndex: newOrderIndex,
        sectionId: overTask.sectionId || null
      });
    }
    // Handle task-to-section (move task to section header/area)
    else if (overId.startsWith('section-')) {
      const sectionId = overId.replace('section-', '');
      const targetSection = todoListSections.find(section => section.id === sectionId);
      
      if (targetSection && activeTask.sectionId !== sectionId) {
        const tasksInTargetSection = todoListTasks.filter(task => task.sectionId === sectionId);
        const maxOrderInSection = Math.max(...tasksInTargetSection.map(task => task.orderIndex || 0), 0);
        
        reorderTaskMutation.mutate({
          id: activeTask.id,
          orderIndex: maxOrderInSection + 1,
          sectionId: sectionId
        });
      }
    }
    // Handle task-to-general (move task to general/unsectioned area)
    else if (overId === 'general-tasks') {
      if (activeTask.sectionId !== null) {
        const unsectionedTasks = todoListTasks.filter(task => !task.sectionId);
        const maxOrderInGeneral = Math.max(...unsectionedTasks.map(task => task.orderIndex || 0), 0);
        
        reorderTaskMutation.mutate({
          id: activeTask.id,
          orderIndex: maxOrderInGeneral + 1,
          sectionId: null
        });
      }
    }
    // Handle section-to-section (reordering sections)
    else if (activeId.startsWith('section-') && overId.startsWith('section-')) {
      const activeSectionId = activeId.replace('section-', '');
      const overSectionId = overId.replace('section-', '');
      
      const activeSection = todoListSections.find(section => section.id === activeSectionId);
      const overSection = todoListSections.find(section => section.id === overSectionId);
      
      if (activeSection && overSection && activeSectionId !== overSectionId) {
        // Sort sections by current order to get proper positioning
        const sortedSections = [...todoListSections].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        const activeIndex = sortedSections.findIndex(section => section.id === activeSectionId);
        const overIndex = sortedSections.findIndex(section => section.id === overSectionId);
        
        // Calculate new order index based on drop position
        let newOrderIndex: number;
        
        if (overIndex === 0) {
          // Moving to first position
          newOrderIndex = Math.max(0, (overSection.orderIndex || 0) - 1);
        } else if (activeIndex < overIndex) {
          // Moving down in the list
          const nextSection = sortedSections[overIndex + 1];
          if (nextSection) {
            newOrderIndex = ((overSection.orderIndex || 0) + (nextSection.orderIndex || 0)) / 2;
          } else {
            newOrderIndex = (overSection.orderIndex || 0) + 1;
          }
        } else {
          // Moving up in the list
          const prevSection = sortedSections[overIndex - 1];
          if (prevSection) {
            newOrderIndex = ((prevSection.orderIndex || 0) + (overSection.orderIndex || 0)) / 2;
          } else {
            newOrderIndex = (overSection.orderIndex || 0) - 1;
          }
        }


        reorderSectionMutation.mutate({
          id: activeSectionId,
          orderIndex: newOrderIndex
        });
      }
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveTaskEdit = () => {
    if (!editingTaskId || !editingTaskTitle.trim()) return;
    
    updateTaskMutation.mutate({
      id: editingTaskId,
      updates: { title: editingTaskTitle.trim() }
    });
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const startEditingSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.name);
  };

  const saveSectionEdit = () => {
    if (!editingSectionId || !editingSectionTitle.trim()) return;
    
    updateSectionMutation.mutate({
      id: editingSectionId,
      updates: { name: editingSectionTitle.trim() }
    });
  };

  const cancelSectionEdit = () => {
    setEditingSectionId(null);
    setEditingSectionTitle('');
  };

  // TodoList management functions
  const startEditingTodoList = (todoList: TodoList) => {
    setEditingTodoListId(todoList.id);
    setEditingTodoListTitle(todoList.name);
  };

  const saveTodoListEdit = () => {
    if (!editingTodoListId || !editingTodoListTitle.trim()) return;
    
    updateTodoListMutation.mutate({
      id: editingTodoListId,
      updates: { name: editingTodoListTitle.trim() }
    });
  };

  const cancelTodoListEdit = () => {
    setEditingTodoListId(null);
    setEditingTodoListTitle('');
  };

  const confirmDeleteTodoList = (todoList: TodoList) => {
    setTodoListToDelete(todoList);
    setDeleteTodoListConfirmOpen(true);
  };

  const executeTodoListDeletion = () => {
    if (!todoListToDelete) return;
    deleteTodoListMutation.mutate(todoListToDelete.id);
  };

  // Bulk task operations functions
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllTasks = () => {
    const allTaskIds = todoListTasks.map(task => task.id);
    setSelectedTasks(new Set(allTaskIds));
  };

  const clearTaskSelection = () => {
    setSelectedTasks(new Set());
    setBulkActionMode(false);
  };

  const toggleBulkActionMode = () => {
    setBulkActionMode(!bulkActionMode);
    setSelectedTasks(new Set());
  };

  const bulkMarkComplete = (completed: boolean) => {
    if (selectedTasks.size === 0) return;
    
    bulkUpdateTasksMutation.mutate({
      taskIds: Array.from(selectedTasks),
      updates: { completed }
    });
  };

  const bulkDeleteTasks = () => {
    if (selectedTasks.size === 0) return;
    
    if (confirm(`Delete ${selectedTasks.size} selected tasks? This action cannot be undone.`)) {
      bulkDeleteTasksMutation.mutate(Array.from(selectedTasks));
    }
  };

  const bulkMoveToSection = (sectionId: string | null) => {
    if (selectedTasks.size === 0) return;
    
    bulkUpdateTasksMutation.mutate({
      taskIds: Array.from(selectedTasks),
      updates: { sectionId }
    });
  };

  const addNewTask = (sectionId?: string) => {
    const taskTitle = sectionId ? sectionInputs[sectionId] : generalTaskInput;
    if (!taskTitle?.trim() || !selectedTodoList) return;

    const maxOrder = Math.max(...todoListTasks.map(task => task.orderIndex || 0), 0);
    
    // Clear input immediately for better UX
    if (sectionId) {
      setSectionInputs(prev => ({ ...prev, [sectionId]: '' }));
    } else {
      setGeneralTaskInput('');
    }
    
    createTaskMutation.mutate({
      todoListId: selectedTodoList.id,
      title: taskTitle.trim(),
      sectionId,
      orderIndex: maxOrder + 1
    });
  };

  const addNewSection = () => {
    if (!newSectionName.trim() || !selectedTodoList) return;

    const maxOrder = Math.max(...todoListSections.map(section => section.orderIndex || 0), 0);
    
    createSectionMutation.mutate({
      todoListId: selectedTodoList.id,
      name: newSectionName.trim(),
      orderIndex: maxOrder + 1
    });
  };

  // DroppableSection Component - subtle drop zone feedback
  const DroppableSection = ({ sectionId, children }: { sectionId: string; children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `section-${sectionId}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`transition-all duration-150 ${
          isOver 
            ? 'bg-blue-50/50 ring-1 ring-blue-300' 
            : ''
        }`}
        style={{ minHeight: '50px' }}
      >
        {children}
      </div>
    );
  };

  // DroppableGeneralTasks Component - subtle drop zone feedback
  const DroppableGeneralTasks = ({ children }: { children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: 'general-tasks',
    });

    return (
      <div
        ref={setNodeRef}
        className={`transition-all duration-150 ${
          isOver 
            ? 'bg-gray-100/50 ring-1 ring-gray-300' 
            : ''
        }`}
        style={{ minHeight: '40px' }}
      >
        {children}
      </div>
    );
  };

  // SortableSectionItem Component - makes sections draggable for reordering
  const SortableSectionItem = ({ section, sectionTasks, children }: { section: Section; sectionTasks: Task[]; children: React.ReactNode }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `section-${section.id}` });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'z-50 shadow-2xl' : ''}`}
      >
        <DroppableSection sectionId={section.id}>
          <div className="border rounded-lg p-4 bg-white">
            {/* Section Header with drag handle */}
            <div className="flex items-center justify-between mb-3">
              {editingSectionId === section.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <Input
                    value={editingSectionTitle}
                    onChange={(e) => setEditingSectionTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveSectionEdit();
                      if (e.key === 'Escape') cancelSectionEdit();
                    }}
                    className="flex-1 h-8"
                    autoFocus
                    data-testid={`input-edit-section-${section.id}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={saveSectionEdit}
                    data-testid={`button-save-section-${section.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelSectionEdit}
                    data-testid={`button-cancel-section-${section.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    {/* Drag handle */}
                    <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing p-1">
                      <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </div>
                    <button
                      className="flex items-center space-x-2 text-left hover:text-gray-600"
                      onClick={() => toggleSection(section.id)}
                      data-testid={`button-toggle-section-${section.id}`}
                    >
                      {collapsedSections.has(section.id) ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <h3 className="font-medium text-gray-800">
                        {section.name}
                      </h3>
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingSection(section)}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                      title="Edit section name"
                      data-testid={`button-edit-section-${section.id}`}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                      className="h-6 w-6 p-0 hover:bg-red-200"
                      title="Delete section"
                      data-testid={`button-delete-section-${section.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            {children}
          </div>
        </DroppableSection>
      </div>
    );
  };

  // SortableTaskItem Component
  const SortableTaskItem = ({ task }: { task: Task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `task-${task.id}` });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isEditing = editingTaskId === task.id;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center space-x-3 p-2 rounded-lg ${
          isDragging ? 'shadow-lg bg-white' : 'hover:bg-gray-50'
        }`}
        data-testid={`sortable-task-${task.id}`}
      >
        <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        
        <Checkbox
          checked={Boolean(task.completed)}
          onCheckedChange={(checked) => {
            toggleTaskMutation.mutate({
              taskId: task.id,
              completed: Boolean(checked)
            });
          }}
          data-testid={`checkbox-task-${task.id}`}
        />
        
        {isEditing ? (
          <div className="flex-1 flex space-x-2">
            <Input
              value={editingTaskTitle}
              onChange={(e) => setEditingTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTaskEdit();
                if (e.key === 'Escape') cancelTaskEdit();
              }}
              className="flex-1 h-8"
              autoFocus
              data-testid={`input-edit-task-${task.id}`}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveTaskEdit}
              data-testid={`button-save-task-${task.id}`}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelTaskEdit}
              data-testid={`button-cancel-task-${task.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className={`flex-1 cursor-pointer ${
              task.completed 
                ? 'line-through text-gray-500' 
                : 'text-gray-900'
            }`}
            onClick={() => startEditingTask(task)}
            data-testid={`text-task-${task.id}`}
          >
            {task.title}
          </div>
        )}
      </div>
    );
  };

  // Zoom constants
  const ZOOM_MIN = 25;
  const ZOOM_MAX = 400;
  const ZOOM_STEP = 25;

  // Simple zoom functions - 25% increments, instant changes
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + ZOOM_STEP, ZOOM_MAX);
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, ZOOM_MIN);
    setZoomLevel(newZoom);
  };

  // Removed complex zoom animation - using instant zoom changes only

  // Removed wheel/scroll zoom functionality - using button-only zoom

  // Clean up old gesture handlers - wheel events handle all zoom interactions
  // Simplified approach: rely on wheel events for all zoom functionality

  // Idea CRUD functions
  const handleCreateIdea = async () => {
    console.log('=== CREATE IDEA HANDLER CALLED ===');
    console.log('Form data:', {
      title: newIdeaTitle,
      description: newIdeaDescription,
      groupId: newIdeaGroupId,
      color: newIdeaColor,
      isCreatingNewGroup,
      newGroupName
    });

    if (!newIdeaTitle.trim()) {
      console.log('Title is empty, aborting');
      return;
    }
    
    let finalGroupId = newIdeaGroupId === "no-group" ? null : newIdeaGroupId;
    let finalColor = newIdeaColor;
    
    // Handle creating new group if selected
    if (isCreatingNewGroup && newGroupName.trim()) {
      console.log('Creating new group:', newGroupName);
      try {
        const groupRes = await apiRequest('POST', '/api/groups', {
          name: newGroupName.trim(),
          color: newIdeaColor,
          projectId: projectId! // Add project ID for group creation
        });
        
        if (!groupRes.ok) {
          const errorData = await groupRes.json();
          console.error('Group creation failed:', errorData);
          
          // Check if it's a duplicate name error
          if (errorData.message?.includes('already exists') || errorData.message?.includes('duplicate')) {
            alert('A group with this name already exists. Please choose a different name.');
          } else {
            alert('Failed to create group: ' + (errorData.message || 'Unknown error'));
          }
          return;
        }
        
        const newGroup = await groupRes.json();
        console.log('Group created successfully:', newGroup);
        finalGroupId = newGroup.id;
        finalColor = newGroup.color;
      } catch (error) {
        console.error('Failed to create new group:', error);
        alert('Failed to create group. Please try again.');
        return;
      }
    } else if (finalGroupId) {
      // Use existing group's color
      const selectedGroup = groups.find(g => g.id === finalGroupId);
      if (selectedGroup) {
        finalColor = selectedGroup.color;
      }
    }
    
    // Find a good position for the new card - center of current viewport
    const canvas = canvasRef.current?.parentElement;
    let newX = Math.round(200);
    let newY = Math.round(200);
    
    if (canvas) {
      // Position in center of visible area
      const centerX = Math.round((canvas.scrollLeft + canvas.clientWidth / 2) / (zoomLevel / 100));
      const centerY = Math.round((canvas.scrollTop + canvas.clientHeight / 2) / (zoomLevel / 100));
      
      // Check for overlaps and adjust if needed
      const existingPositions = ideas.map((idea: Idea) => ({ x: idea.canvasX, y: idea.canvasY }));
      
      for (let i = 0; i < 20; i++) {
        const testX = centerX - 120 + (i % 5) * 60;
        const testY = centerY - 60 + Math.floor(i / 5) * 60;
        
        const overlaps = existingPositions.some(pos => 
          Math.abs(pos.x - testX) < 200 && Math.abs(pos.y - testY) < 100
        );
        
        if (!overlaps) {
          newX = Math.round(testX);
          newY = Math.round(testY);
          break;
        }
      }
    }

    const ideaData = {
      userId: user?.id || "",
      projectId: projectId!, // Add project ID for proper isolation
      title: newIdeaTitle.trim(),
      description: newIdeaDescription.trim(),
      groupId: finalGroupId,
      color: finalColor,
      canvasX: Math.round(newX),
      canvasY: Math.round(newY),
    };

    console.log('Creating idea with data:', ideaData);
    createIdeaMutation.mutate(ideaData);
  };

  const handleUpdateIdea = async () => {
    if (!editingIdea || !editIdeaTitle.trim()) return;

    console.log('=== UPDATE IDEA HANDLER CALLED ===');
    console.log('Editing idea:', editingIdea.id);
    console.log('Form data:', {
      title: editIdeaTitle,
      description: editIdeaDescription,
      groupId: editIdeaGroupId,
      color: editIdeaColor,
      isCreatingNewGroup: isEditingCreatingNewGroup,
      newGroupName: editNewGroupName
    });

    let finalGroupId = editIdeaGroupId === "no-group" ? null : editIdeaGroupId;
    let finalColor = editIdeaColor;
    
    // Handle creating new group if selected
    if (isEditingCreatingNewGroup && editNewGroupName.trim()) {
      console.log('Creating new group for edit:', editNewGroupName);
      try {
        const groupRes = await apiRequest('POST', '/api/groups', {
          name: editNewGroupName.trim(),
          color: editIdeaColor,
          projectId: projectId! // Add project ID for group creation
        });
        
        if (!groupRes.ok) {
          const errorData = await groupRes.json();
          console.error('Group creation failed:', errorData);
          
          if (errorData.message?.includes('already exists') || errorData.message?.includes('duplicate')) {
            alert('A group with this name already exists. Please choose a different name.');
          } else {
            alert('Failed to create group: ' + (errorData.message || 'Unknown error'));
          }
          return;
        }
        
        const newGroup = await groupRes.json();
        console.log('Group created successfully for edit:', newGroup);
        finalGroupId = newGroup.id;
        finalColor = newGroup.color;
      } catch (error) {
        console.error('Failed to create new group:', error);
        alert('Failed to create group. Please try again.');
        return;
      }
    } else if (finalGroupId) {
      // Use existing group's color
      const selectedGroup = groups.find(g => g.id === finalGroupId);
      if (selectedGroup) {
        finalColor = selectedGroup.color;
      }
    }

    const updateData = {
      title: editIdeaTitle.trim(),
      description: editIdeaDescription.trim(),
      groupId: finalGroupId,
      color: finalColor,
    };

    console.log('Updating idea with data:', updateData);
    updateIdeaEditMutation.mutate({
      id: editingIdea.id,
      updates: updateData
    });
  };

  const handleEditIdea = (ideaId: string) => {
    console.log('Edit idea:', ideaId);
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      setEditingIdea(idea);
      setEditIdeaTitle(idea.title);
      setEditIdeaDescription(idea.description || "");
      setEditIdeaGroupId(idea.groupId || "");
      setEditIdeaColor(idea.color);
      setIsEditingCreatingNewGroup(false);
      setEditNewGroupName("");
      setIsEditIdeaDialogOpen(true);
    }
  };

  const handleDeleteIdea = (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      setIdeaToDelete(idea);
      setIsDeleteConfirmOpen(true);
    }
  };

  // Card selection functions
  const handleCardClick = (cardId: string, event: React.MouseEvent) => {
    // Don't trigger selection if we're dragging
    if (dragState.isDragging) return;
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Cmd/Ctrl + click
      setSelectedCards(prev => {
        if (prev.includes(cardId)) {
          return prev.filter(id => id !== cardId);
        } else {
          return [...prev, cardId];
        }
      });
    } else {
      // Single select or deselect all if clicking selected card
      if (selectedCards.length === 1 && selectedCards[0] === cardId) {
        setSelectedCards([]);
      } else {
        setSelectedCards([cardId]);
      }
    }
  };

  // Filter functions
  const handleFilterChange = (groupId: string | null) => {
    setSelectedFilter(groupId);
    setSelectedCards([]); // Clear selection when changing filter
  };

  // Group action functions
  const handleGroupActions = () => {
    setIsGroupActionsModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm('Are you sure you want to delete this group? All ideas in this group will become ungrouped.')) {
      // Store the group ID for the success callback
      (deleteGroupMutation as any).deletedGroupId = groupId;
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleSaveGroupEdit = (name: string, color: string) => {
    if (!editingGroup) return;
    updateGroupMutation.mutate({
      id: editingGroup.id,
      updates: { name, color }
    });
  };


  const handleAssignToGroup = async (groupId: string) => {
    try {
      // Update all selected cards
      const updatePromises = selectedCards.map(cardId => 
        updateIdeaMutation.mutateAsync({
          id: cardId,
          updates: { groupId }
        })
      );
      
      await Promise.all(updatePromises);
      
      // Refresh data to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      setIsAssignGroupModalOpen(false);
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
    } catch (error) {
      console.error('Failed to assign cards to group:', error);
      alert('Failed to assign cards to group. Please try again.');
    }
  };

  const handleCreateNewGroup = async () => {
    const groupName = window.prompt('Enter group name:');
    if (!groupName?.trim()) return;
    
    try {
      // Generate a random color for the new group
      const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Create the new group
      const newGroup = await createGroupMutation.mutateAsync({
        name: groupName,
        color: randomColor
      });
      
      // Assign selected cards to the new group
      const updatePromises = selectedCards.map(cardId => 
        updateIdeaMutation.mutateAsync({
          id: cardId,
          updates: { groupId: newGroup.id }
        })
      );
      
      await Promise.all(updatePromises);
      
      // Refresh all relevant data
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleRemoveFromGroups = async () => {
    try {
      // Remove all selected cards from groups
      const updatePromises = selectedCards.map(cardId => 
        updateIdeaMutation.mutateAsync({
          id: cardId,
          updates: { groupId: null }
        })
      );
      
      await Promise.all(updatePromises);
      
      // Refresh data to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
    } catch (error) {
      console.error('Failed to remove cards from groups:', error);
      alert('Failed to remove cards from groups. Please try again.');
    }
  };

  const handleDeleteSelectedCards = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCards.length} selected ideas?`)) {
      selectedCards.forEach(id => {
        deleteIdeaMutation.mutate(id);
      });
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas, not on cards or other elements
    if (event.target === event.currentTarget) {
      setSelectedCards([]);
    }
  };

  // Update drag state ref whenever state changes
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // Drag and Drop functions
  const handleMouseDown = (event: React.MouseEvent, cardId: string) => {
    // Only start drag on left mouse button
    if (event.button !== 0) return;
    
    // Don't start drag if clicking on menu buttons
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    
    // Prevent drag when using Cmd/Ctrl+click for multi-select
    if (event.metaKey || event.ctrlKey) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = (event.clientX - rect.left) / (zoomLevel / 100);
    const mouseY = (event.clientY - rect.top) / (zoomLevel / 100);
    
    // Get the card element to calculate offset
    const cardElement = event.currentTarget as HTMLElement;
    const cardRect = cardElement.getBoundingClientRect();
    const offsetX = (event.clientX - cardRect.left) / (zoomLevel / 100);
    const offsetY = (event.clientY - cardRect.top) / (zoomLevel / 100);
    
    // If clicking on an unselected card, select it
    if (!selectedCards.includes(cardId)) {
      setSelectedCards([cardId]);
    }
    
    // Get initial positions and elements of all cards that will be dragged
    const cardsToMove = selectedCards.includes(cardId) ? selectedCards : [cardId];
    const initialPositions: Record<string, { x: number, y: number }> = {};
    const currentPositions: Record<string, { x: number, y: number }> = {};
    const dragElements: Record<string, HTMLElement> = {};
    
    cardsToMove.forEach(id => {
      const idea = ideas.find((i: Idea) => i.id === id);
      const element = document.querySelector(`[data-card-id="${id}"]`) as HTMLElement;
      if (idea && element) {
        initialPositions[id] = { x: idea.canvasX, y: idea.canvasY };
        currentPositions[id] = { x: idea.canvasX, y: idea.canvasY };
        dragElements[id] = element;
        
        // Apply initial drag styling with hardware acceleration
        element.style.transition = 'none';
        element.style.willChange = 'transform';
        element.style.zIndex = '1000';
        element.style.cursor = 'grabbing';
        element.style.userSelect = 'none';
        element.style.pointerEvents = 'none';
        element.style.transform = 'rotate(2deg) scale(1.02)';
        element.style.filter = 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.25))';
      }
    });
    
    // Disable body selection and set cursor
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    setDragState({
      isDragging: true,
      dragCardId: cardId,
      startPos: { x: mouseX, y: mouseY },
      offset: { x: offsetX, y: offsetY },
      initialPositions,
      currentPositions,
      dragElements
    });
  };

  const updateDragPositions = (mouseX: number, mouseY: number) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging) return;
    
    const deltaX = mouseX - currentDragState.startPos.x;
    const deltaY = mouseY - currentDragState.startPos.y;
    
    // Update positions using CSS transforms for better performance
    Object.entries(currentDragState.dragElements).forEach(([cardId, element]) => {
      const initialPos = currentDragState.initialPositions[cardId];
      if (initialPos && element) {
        const newX = Math.max(0, initialPos.x + deltaX);
        const newY = Math.max(0, initialPos.y + deltaY);
        
        // Update current positions for final save
        currentDragState.currentPositions[cardId] = { x: newX, y: newY };
        
        // Use transform for smooth hardware-accelerated movement
        element.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(2deg) scale(1.02)`;
      }
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragStateRef.current.isDragging || !canvasRef.current) return;
    
    event.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / (zoomLevel / 100);
    const mouseY = (event.clientY - rect.top) / (zoomLevel / 100);
    
    // Cancel previous animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule update for next frame for smooth animation
    animationFrameRef.current = requestAnimationFrame(() => {
      updateDragPositions(mouseX, mouseY);
    });
  };

  // Canvas panning handlers
  const handleCanvasPanStart = (event: React.MouseEvent) => {
    // Only start panning with left mouse button and when not clicking on cards
    if (event.button !== 0) return;
    
    const target = event.target as HTMLElement;
    // Don't pan if clicking on cards, buttons, or other interactive elements
    if (target.closest('[data-card-id]') || target.closest('button')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    setPanState(prev => ({
      ...prev,
      isPanning: true,
      startPan: { x: event.clientX, y: event.clientY },
      lastPan: { x: prev.x, y: prev.y }
    }));
  };

  const handleCanvasPanMoveGlobal = (event: MouseEvent) => {
    if (!panState.isPanning) return;
    
    event.preventDefault();
    
    const deltaX = event.clientX - panState.startPan.x;
    const deltaY = event.clientY - panState.startPan.y;
    
    setPanState(prev => ({
      ...prev,
      x: prev.lastPan.x + deltaX,
      y: prev.lastPan.y + deltaY
    }));
  };

  const handleCanvasPanEndGlobal = () => {
    setPanState(prev => ({
      ...prev,
      isPanning: false
    }));
  };

  const handleMouseUp = () => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging) return;
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Restore body styles
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    // Reset visual effects and save final positions
    Object.entries(currentDragState.dragElements).forEach(([cardId, element]) => {
      const finalPos = currentDragState.currentPositions[cardId];
      if (element && finalPos) {
        // Reset styles with smooth transition
        element.style.transition = 'all 0.2s ease-out';
        element.style.willChange = 'auto';
        element.style.zIndex = '';
        element.style.cursor = 'pointer';
        element.style.userSelect = '';
        element.style.pointerEvents = '';
        element.style.transform = '';
        element.style.filter = '';
        
        // Update actual position
        element.style.left = `${finalPos.x}px`;
        element.style.top = `${finalPos.y}px`;
        
        // Clean up transition after animation
        setTimeout(() => {
          if (element) {
            element.style.transition = '';
          }
        }, 200);
        
        // Update local state immediately to prevent snap-back
        const ideaIndex = ideas.findIndex(idea => idea.id === cardId);
        if (ideaIndex !== -1) {
          const updatedIdeas = [...ideas];
          updatedIdeas[ideaIndex] = { 
            ...updatedIdeas[ideaIndex], 
            canvasX: finalPos.x, 
            canvasY: finalPos.y 
          };
          queryClient.setQueryData(['/api/ideas'], updatedIdeas);
        }

        // Save to database (only once per card)
        updateIdeaMutation.mutate({
          id: cardId,
          updates: { canvasX: finalPos.x, canvasY: finalPos.y }
        });
      }
    });
    
    setDragState({
      isDragging: false,
      dragCardId: null,
      startPos: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      initialPositions: {},
      currentPositions: {},
      dragElements: {}
    });
  };

  // Mouse event listeners with passive options for better performance
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      
      // Cleanup function
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Restore body styles
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [dragState.isDragging, zoomLevel]);

  // Canvas panning event listeners 
  useEffect(() => {
    if (panState.isPanning) {
      document.addEventListener('mousemove', handleCanvasPanMoveGlobal, { passive: false });
      document.addEventListener('mouseup', handleCanvasPanEndGlobal, { passive: true });
      
      return () => {
        document.removeEventListener('mousemove', handleCanvasPanMoveGlobal);
        document.removeEventListener('mouseup', handleCanvasPanEndGlobal);
      };
    }
  }, [panState.isPanning]);

  // Removed wheel event listeners for simplified zoom

  // Removed animation cleanup (no longer using animations)

  // Touch event support for mobile
  const handleTouchStart = (event: React.TouchEvent, cardId: string) => {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      bubbles: true
    });
    
    handleMouseDown(mouseEvent as any, cardId);
  };

  useEffect(() => {
    if (dragState.isDragging) {
      const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        event.preventDefault();
        
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        
        handleMouseMove(mouseEvent);
      };

      const handleTouchEnd = () => {
        handleMouseUp();
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragState.isDragging]);

  // Task toggle function
  // Create TodoList from group
  const handleCreateTodoList = async (groupId: string) => {
    console.log('Creating TodoList from group:', groupId);
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Check if group has ideas
    const groupIdeas = ideas.filter(idea => idea.groupId === groupId);
    if (groupIdeas.length === 0) {
      alert('This group has no ideas to convert to tasks.');
      return;
    }
    
    createTodoListMutation.mutate({ groupId, name: group.name, projectId: projectId! });
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string, currentCompleted: boolean) => {
    console.log('Toggle task:', taskId, 'from', currentCompleted, 'to', !currentCompleted);
    toggleTaskMutation.mutate({ taskId, completed: !currentCompleted });
  };

  // Calculate center position of selected cards for action button
  const getSelectionCenter = () => {
    if (selectedCards.length === 0) return { x: 0, y: 0 };
    
    const selectedCardData = ideas.filter((idea: Idea) => selectedCards.includes(idea.id));
    const centerX = selectedCardData.reduce((sum: number, idea: Idea) => sum + idea.canvasX, 0) / selectedCardData.length;
    const centerY = selectedCardData.reduce((sum: number, idea: Idea) => sum + idea.canvasY, 0) / selectedCardData.length;
    
    return { x: centerX + 128, y: centerY + 60 }; // Offset for card center
  };

  const selectionCenter = getSelectionCenter();
  const hasMultiSelection = selectedCards.length >= 2;

  if (ideasLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Palette className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {projectLoading ? 'Loading...' : (currentProject as any)?.name || 'Brain Storm to ToDo List'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700">{user?.firstName || 'User'}</span>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Create Ideas */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Dialog open={isNewIdeaDialogOpen} onOpenChange={setIsNewIdeaDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary text-white hover:bg-primary/90" data-testid="button-new-idea">
                  <Plus className="mr-2 w-4 h-4" />
                  New Idea
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Idea</DialogTitle>
                  <DialogDescription>
                    Add your creative ideas to the canvas with group organization
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Title Field */}
                  <div className="grid gap-2">
                    <label htmlFor="idea-title" className="text-sm font-medium">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="idea-title"
                      placeholder="Enter your idea title..."
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value.slice(0, 100))}
                      data-testid="input-idea-title"
                      maxLength={100}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{newIdeaTitle.trim() ? '' : 'Title is required'}</span>
                      <span>{newIdeaTitle.length}/100</span>
                    </div>
                  </div>

                  {/* Description Field */}
                  <div className="grid gap-2">
                    <label htmlFor="idea-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="idea-description"
                      placeholder="Describe your idea in detail..."
                      className="resize-none h-20"
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value.slice(0, 500))}
                      data-testid="textarea-idea-description"
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {newIdeaDescription.length}/500
                    </div>
                  </div>

                  {/* Group Assignment */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Group (Optional)</label>
                    <Select value={isCreatingNewGroup ? "create-new" : (newIdeaGroupId || "no-group")} onValueChange={(value) => {
                      if (value === "create-new") {
                        setIsCreatingNewGroup(true);
                        setNewIdeaGroupId("");
                      } else if (value === "no-group") {
                        setIsCreatingNewGroup(false);
                        setNewIdeaGroupId("");
                      } else {
                        setIsCreatingNewGroup(false);
                        setNewIdeaGroupId(value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-group">No Group</SelectItem>
                        {groups.map((group: Group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: group.color }} />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new">+ Create New Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* New Group Name (if creating new) */}
                  {isCreatingNewGroup && (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">New Group Name</label>
                      <Input
                        placeholder="Enter group name..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value.slice(0, 50))}
                        maxLength={50}
                      />
                      <div className="text-xs text-gray-500 text-right">
                        {newGroupName.length}/50
                      </div>
                    </div>
                  )}

                  {/* Color Picker */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            newIdeaColor === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewIdeaColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsNewIdeaDialogOpen(false);
                    // Reset form on cancel
                    setNewIdeaTitle("");
                    setNewIdeaDescription("");
                    setNewIdeaGroupId("");
                    setNewIdeaColor("#3B82F6");
                    setIsCreatingNewGroup(false);
                    setNewGroupName("");
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateIdea} 
                    disabled={!newIdeaTitle.trim() || createIdeaMutation.isPending || (isCreatingNewGroup && !newGroupName.trim())}
                    data-testid="button-save-idea"
                  >
                    {createIdeaMutation.isPending ? 'Creating...' : 'Create Idea'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Groups</h3>
              <div className="space-y-1">
                {/* All Ideas Filter */}
                <div 
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedFilter === null 
                      ? 'bg-blue-100 text-blue-900 font-medium' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => handleFilterChange(null)}
                  data-testid="filter-all-ideas"
                >
                  <div className="w-3 h-3 rounded-full mr-3 bg-gray-400" />
                  <span className="text-sm flex-1">All Ideas</span>
                  <span className="text-xs">
                    ({ideas.length})
                  </span>
                </div>

                {/* Individual Groups */}
                {groups.map((group: Group) => {
                  const groupIdeaCount = ideas.filter(idea => idea.groupId === group.id).length;
                  const isSelected = selectedFilter === group.id;
                  
                  return (
                    <div 
                      key={group.id}
                      className={`flex items-center px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 text-blue-900 font-medium' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => handleFilterChange(group.id)}
                      data-testid={`filter-group-${group.id}`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-sm flex-1">{group.name}</span>
                      <span className="text-xs mr-2">({groupIdeaCount})</span>
                      
                      {/* Three-dot menu */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-200"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`group-menu-${group.id}`}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                              <Edit className="mr-2 w-3 h-3" />
                              Edit Group
                            </DropdownMenuItem>
                            {groupIdeaCount > 0 && (
                              <DropdownMenuItem onClick={() => handleCreateTodoList(group.id)}>
                                <Plus className="mr-2 w-3 h-3" />
                                Create TodoList
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 w-3 h-3" />
                              Delete Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {ideas.length} ideas • {allTasks.length} tasks
            </div>
          </div>
        </aside>

        {/* Center Canvas Area */}
        <main className={`flex-1 relative bg-white overflow-hidden transition-all duration-200 ${!isRightSidebarOpen ? 'mr-4' : ''}`}>
          {/* Loading Overlay */}
          {(ideasLoading || projectLoading) && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading project...</p>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {hasIdeasError && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-40 flex items-center justify-center">
              <div className="bg-white rounded-lg p-8 shadow-lg text-center max-w-md mx-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load project</h3>
                <p className="text-gray-600 mb-6">We couldn't load your project data. Please check your connection and try again.</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-center">
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Refresh Page
                  </Button>
                  <Button onClick={() => navigate('/')} size="sm">Back to Dashboard</Button>
                </div>
              </div>
            </div>
          )}
          {/* Zoom-Responsive Dot Grid Background - Subtle 1px dots */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(229, 231, 235, 0.6) 1px, transparent 1px)`,
              backgroundSize: `${24 * (zoomLevel / 100)}px ${24 * (zoomLevel / 100)}px`,
              backgroundPosition: `${panState.x}px ${panState.y}px`
            }}
          />

          {/* Toggle Sidebar Button (when sidebar is hidden) */}
          {!isRightSidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRightSidebarOpen(true)}
              className="absolute top-4 right-4 bg-white shadow-md z-10"
              data-testid="button-show-sidebar"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Tasks
            </Button>
          )}

          {/* Zoom Controls - Bottom Right with 16px margin */}
          <div className="absolute flex items-center space-x-1 bg-white rounded-lg shadow-md p-1 z-10" style={{ bottom: '16px', right: '16px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= ZOOM_MIN}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="px-2 text-xs text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoomLevel)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= ZOOM_MAX}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                console.log('Fit to view button clicked');
                e.preventDefault();
                e.stopPropagation();
                fitToView();
              }}
              disabled={filteredIdeas.length === 0}
              title="Fit to view"
              data-testid="button-fit-to-view"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Multi-Selection Counter */}
          {hasMultiSelection && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
              {selectedCards.length} selected
            </div>
          )}

          {/* Empty State Feedback - positioned outside transformed area */}
          {filteredIdeas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8 max-w-md pointer-events-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Ready to brainstorm?
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Start capturing your ideas by creating your first idea card. 
                  Ideas can be moved around, organized into groups, and turned into actionable tasks.
                </p>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsNewIdeaDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 text-lg relative z-50"
                  data-testid="button-create-first-idea"
                >
                  <Plus className="mr-2 w-5 h-5" />
                  Create Your First Idea
                </Button>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mt-4 bg-gray-50 px-4 py-2 rounded-lg">
                  <Lightbulb className="w-4 h-4" />
                  <span>Tip: Ideas can be dragged, grouped, and converted to tasks</span>
                </div>
              </div>
            </div>
          )}

          {/* Canvas Content with breathing room margins */}
          <div 
            ref={canvasRef}
            className={`absolute overflow-hidden ${panState.isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${
              !isRightSidebarOpen 
                ? 'inset-6' // Extra margin when sidebar is closed (24px all sides)
                : 'inset-4' // Standard margin when sidebar is open (16px all sides)
            }`}
            onMouseDown={handleCanvasPanStart}
            onClick={handleCanvasClick}
            style={{ touchAction: 'none' }}
          >
            {/* Inner canvas with pan and zoom transforms */}
            <div
              className="absolute"
              style={{
                transform: `translate(${panState.x}px, ${panState.y}px) scale(${zoomLevel / 100})`,
                transformOrigin: '0 0',
                width: '10000px',
                height: '10000px'
              }}
            >

            {/* Idea Cards */}
            {filteredIdeas.map((idea: Idea) => {
              const isSelected = selectedCards.includes(idea.id);
              const group = groups.find((g: Group) => g.id === idea.groupId);
              const cardColor = group ? group.color : idea.color;
              
              return (
                <Card 
                  key={idea.id}
                  data-card-id={idea.id}
                  className={`absolute w-64 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-4 border-blue-500 shadow-lg shadow-blue-500/30' 
                      : 'border-2 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    left: idea.canvasX,
                    top: idea.canvasY,
                    backgroundColor: cardColor,
                    cursor: dragState.isDragging ? 'grabbing' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    ...(isSelected && {
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    })
                  }}
                  onClick={(e) => handleCardClick(idea.id, e)}
                  onMouseDown={(e) => handleMouseDown(e, idea.id)}
                  onTouchStart={(e) => handleTouchStart(e, idea.id)}
                  data-testid={`idea-card-${idea.id}`}
                >
                  <CardContent className="p-4 relative">
                    {/* Three-dot menu - only show when no multi-selection */}
                    {!hasMultiSelection && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-white/20"
                            data-testid={`menu-button-${idea.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditIdea(idea.id);
                            }}
                          >
                            <Edit2 className="mr-2 w-4 h-4" />
                            Edit Idea
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIdea(idea.id);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 w-4 h-4" />
                            Delete Idea
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <h3 className="font-semibold text-gray-900 mb-2 text-sm pr-8">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {idea.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {group ? (
                        <Badge 
                          variant="outline" 
                          className="text-xs border-white/30 bg-white/20"
                        >
                          {group.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-white/20">
                          Unassigned
                        </Badge>
                      )}
                      <div className="w-2 h-2 rounded-full bg-white/40"></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Multi-Selection Action Button */}
            {hasMultiSelection && (
              <div
                className="absolute z-30"
                style={{ 
                  left: selectionCenter.x - 24, 
                  top: selectionCenter.y - 24 
                }}
              >
                <Button
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                  onClick={handleGroupActions}
                  data-testid="multi-select-action-button"
                >
                  <Users className="w-5 h-5 text-white" />
                </Button>
              </div>
            )}

              {/* Canvas Instructions */}
              {ideas.length === 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-lg max-w-md">
                    <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-3">No ideas yet</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Start your creative journey by adding your first idea to the canvas
                    </p>
                    <Button 
                      onClick={() => setIsNewIdeaDialogOpen(true)}
                      className="bg-primary text-white hover:bg-primary/90 pointer-events-auto"
                      data-testid="button-create-first-idea"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      Create your first idea
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - To-Do Lists */}
        {isRightSidebarOpen && (
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">To-Do Lists</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                data-testid="button-toggle-sidebar"
              >
                {isRightSidebarOpen ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {todoLists.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                <p>No todo lists yet.</p>
                <p className="mt-1">Create a group with ideas, then use "Create TodoList" from the group menu.</p>
              </div>
            ) : (
              todoLists.map((todoList: TodoList) => {
                const todoListTasks = allTasks.filter((task: Task) => task.todoListId === todoList.id);
                const completedCount = todoListTasks.filter((task: Task) => task.completed).length;
                const totalCount = todoListTasks.length;
                const pendingCount = totalCount - completedCount;
                
                return (
                  <div key={todoList.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 text-sm">{todoList.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTodoListModal(todoList)}
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        title="TodoList Options"
                        data-testid={`button-expand-todolist-${todoList.id}`}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {todoListTasks.map((task: Task) => (
                        <div 
                          key={task.id} 
                          className="flex items-start space-x-2 group"
                          data-testid={`task-${task.id}`}
                        >
                          <Checkbox
                            checked={Boolean(task.completed)}
                            onCheckedChange={() => handleToggleTask(task.id, Boolean(task.completed))}
                            className="mt-0.5"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <span 
                            className={`text-sm flex-1 ${
                              task.completed 
                                ? 'line-through text-gray-400' 
                                : 'text-gray-700'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {totalCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {completedCount} of {totalCount} completed
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {ideas.length} ideas • {allTasks.length} tasks
            </div>
          </div>
        </aside>
        )}

      </div>

      {/* Group Actions Modal */}
      <Dialog open={isGroupActionsModalOpen} onOpenChange={setIsGroupActionsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Actions</DialogTitle>
            <DialogDescription>
              Choose an action for the {selectedCards.length} selected idea{selectedCards.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => setIsAssignGroupModalOpen(true)}
              data-testid="button-assign-to-group"
            >
              <Folder className="mr-2 w-4 h-4" />
              Assign to Group
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={handleCreateNewGroup}
              data-testid="button-create-new-group"
            >
              <Plus className="mr-2 w-4 h-4" />
              Create New Group
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={handleRemoveFromGroups}
              data-testid="button-remove-from-groups"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Remove from Groups
            </Button>
            <Button 
              variant="outline" 
              className="justify-start text-red-600 hover:text-red-700"
              onClick={handleDeleteSelectedCards}
              data-testid="button-delete-selected"
            >
              <Trash2 className="mr-2 w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Group Sub-Modal */}
      <Dialog open={isAssignGroupModalOpen} onOpenChange={setIsAssignGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Group</DialogTitle>
            <DialogDescription>
              Select a group for the selected ideas
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4 max-h-60 overflow-y-auto">
            {groups.map((group: Group) => (
              <Button 
                key={group.id}
                variant="outline" 
                className="justify-start h-auto p-3"
                onClick={() => handleAssignToGroup(group.id)}
                data-testid={`button-assign-group-${group.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-left">{group.name}</span>
                </div>
              </Button>
            ))}
            {groups.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No groups available. Create a group first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignGroupModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name and color
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingGroup.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingGroup({ ...editingGroup, color })}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingGroup(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleSaveGroupEdit(editingGroup.name, editingGroup.color)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Idea Dialog */}
      <Dialog open={isEditIdeaDialogOpen} onOpenChange={setIsEditIdeaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Idea</DialogTitle>
            <DialogDescription>
              Update your idea details and group assignment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title Field */}
            <div className="grid gap-2">
              <label htmlFor="edit-idea-title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-idea-title"
                placeholder="Enter your idea title..."
                value={editIdeaTitle}
                onChange={(e) => setEditIdeaTitle(e.target.value.slice(0, 100))}
                maxLength={100}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{editIdeaTitle.trim() ? '' : 'Title is required'}</span>
                <span>{editIdeaTitle.length}/100</span>
              </div>
            </div>

            {/* Description Field */}
            <div className="grid gap-2">
              <label htmlFor="edit-idea-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-idea-description"
                placeholder="Describe your idea in detail..."
                className="resize-none h-20"
                value={editIdeaDescription}
                onChange={(e) => setEditIdeaDescription(e.target.value.slice(0, 500))}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 text-right">
                {editIdeaDescription.length}/500
              </div>
            </div>

            {/* Group Assignment */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Group (Optional)</label>
              <Select value={isEditingCreatingNewGroup ? "create-new" : (editIdeaGroupId || "no-group")} onValueChange={(value) => {
                if (value === "create-new") {
                  setIsEditingCreatingNewGroup(true);
                  setEditIdeaGroupId("");
                } else if (value === "no-group") {
                  setIsEditingCreatingNewGroup(false);
                  setEditIdeaGroupId("");
                } else {
                  setIsEditingCreatingNewGroup(false);
                  setEditIdeaGroupId(value);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-group">No Group</SelectItem>
                  {groups.map((group: Group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: group.color }} />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="create-new">+ Create New Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* New Group Name (if creating new) */}
            {isEditingCreatingNewGroup && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">New Group Name</label>
                <Input
                  placeholder="Enter group name..."
                  value={editNewGroupName}
                  onChange={(e) => setEditNewGroupName(e.target.value.slice(0, 50))}
                  maxLength={50}
                />
                <div className="text-xs text-gray-500 text-right">
                  {editNewGroupName.length}/50
                </div>
              </div>
            )}

            {/* Color Picker */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      editIdeaColor === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditIdeaColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditIdeaDialogOpen(false);
              setEditIdeaTitle("");
              setEditIdeaDescription("");
              setEditIdeaGroupId("");
              setEditIdeaColor("#3B82F6");
              setIsEditingCreatingNewGroup(false);
              setEditNewGroupName("");
              setEditingIdea(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateIdea} 
              disabled={!editIdeaTitle.trim() || updateIdeaEditMutation.isPending || (isEditingCreatingNewGroup && !editNewGroupName.trim())}
            >
              {updateIdeaEditMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Idea Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{ideaToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false);
              setIdeaToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (ideaToDelete) {
                  deleteIdeaMutation.mutate(ideaToDelete.id);
                }
              }}
              disabled={deleteIdeaMutation.isPending}
            >
              {deleteIdeaMutation.isPending ? 'Deleting...' : 'Delete Idea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TodoList Modal with Advanced Management */}
      <Dialog open={isTodoListModalOpen} onOpenChange={closeTodoListModal}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              {editingTodoListId === selectedTodoList?.id ? (
                <div className="flex items-center space-x-2 flex-1">
                  <Input
                    value={editingTodoListTitle}
                    onChange={(e) => setEditingTodoListTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTodoListEdit();
                      if (e.key === 'Escape') cancelTodoListEdit();
                    }}
                    className="flex-1 text-lg font-semibold"
                    autoFocus
                    data-testid={`input-edit-todolist-${selectedTodoList?.id}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={saveTodoListEdit}
                    data-testid={`button-save-todolist-${selectedTodoList?.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelTodoListEdit}
                    data-testid={`button-cancel-todolist-${selectedTodoList?.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-lg font-semibold">{selectedTodoList?.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-200"
                        data-testid={`button-todolist-options-${selectedTodoList?.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => startEditingTodoList(selectedTodoList!)}
                        data-testid={`button-edit-todolist-${selectedTodoList?.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Title
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => selectedTodoList && clearCompletedTasksMutation.mutate(selectedTodoList.id)}
                        disabled={!todoListTasks.some(task => task.completed)}
                        data-testid="button-clear-completed"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {/* Unified SortableContext for ALL tasks to enable cross-section dragging */}
              <SortableContext items={todoListTasks.map(task => `task-${task.id}`)} strategy={verticalListSortingStrategy}>
              {/* Add New Section */}
              <div className="flex space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Input
                  placeholder="Create a new section..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addNewSection();
                  }}
                  className="flex-1"
                  data-testid="input-new-section"
                />
                <Button
                  onClick={addNewSection}
                  disabled={!newSectionName.trim()}
                  data-testid="button-add-section"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                {/* Render Sections with separate SortableContext for section reordering */}
                <SortableContext items={todoListSections.map(section => `section-${section.id}`)} strategy={verticalListSortingStrategy}>
                  {todoListSections
                    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                    .map((section) => {
                      const sectionTasks = todoListTasks
                        .filter(task => task.sectionId === section.id)
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                      
                      const completedTasks = sectionTasks.filter(task => task.completed);
                      const incompleteTasks = sectionTasks.filter(task => !task.completed);
                      const isCollapsed = collapsedSections.has(section.id);

                      return (
                        <SortableSectionItem key={section.id} section={section} sectionTasks={sectionTasks}>

                        {/* Section Tasks */}
                        {!isCollapsed && (
                          <div className="space-y-3">
                            {/* Incomplete Tasks */}
                            <div className="space-y-2">
                              {incompleteTasks.map(task => (
                                <SortableTaskItem key={task.id} task={task} />
                              ))}
                            </div>


                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                              <div className="pt-3 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">
                                  Completed ({completedTasks.length})
                                </h4>
                                <div className="space-y-2">
                                  {completedTasks.map(task => (
                                    <SortableTaskItem key={task.id} task={task} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        </SortableSectionItem>
                      );
                  })}
                </SortableContext>

                {/* Unsectioned Tasks - Show without section container */}
                {(() => {
                  const unsectionedTasks = todoListTasks
                    .filter(task => !task.sectionId)
                    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                  
                  const completedUnsectioned = unsectionedTasks.filter(task => task.completed);
                  const incompleteUnsectioned = unsectionedTasks.filter(task => !task.completed);

                  return (
                    <DroppableGeneralTasks>
                      <div className="space-y-3">
                        {/* Incomplete Unsectioned Tasks */}
                        {incompleteUnsectioned.length > 0 && (
                          <div className="space-y-2">
                            {incompleteUnsectioned.map(task => (
                              <SortableTaskItem key={task.id} task={task} />
                            ))}
                          </div>
                        )}

                        {/* Add New Task Input */}
                        <div className="flex space-x-2 p-3 bg-gray-50 rounded-lg">
                          <Input
                            placeholder="Add a task..."
                            value={generalTaskInput}
                            onChange={(e) => setGeneralTaskInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addNewTask();
                              }
                            }}
                            className="flex-1 h-8"
                            data-testid="input-new-general-task"
                          />
                          <Button
                            size="sm"
                            onClick={() => addNewTask()}
                            disabled={!generalTaskInput.trim()}
                            data-testid="button-add-general-task"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Completed Tasks */}
                        {completedUnsectioned.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-500">
                              Completed ({completedUnsectioned.length})
                            </h4>
                            <div className="space-y-2">
                              {completedUnsectioned.map(task => (
                                <SortableTaskItem key={task.id} task={task} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DroppableGeneralTasks>
                  );
                })()}
              </div>
              </SortableContext>
            </DndContext>
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => confirmDeleteTodoList(selectedTodoList!)}
              className="text-black hover:bg-red-600 hover:text-white transition-colors"
              data-testid="button-delete-todolist"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete TodoList
            </Button>
            <Button variant="outline" onClick={closeTodoListModal} data-testid="button-close-todolist-modal">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}