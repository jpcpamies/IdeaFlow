import React, { useState, useEffect, useRef, useCallback } from "react";
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
  CheckSquare,
  RefreshCw,
  LogOut,
  Layers as GroupIcon,
  Layers
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Idea, Group, InsertIdea, TodoList, InsertTodoList, Task, Section, InsertTask, InsertSection, Project } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  DndContext,
  closestCenter,
  closestCorners,
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

// Zoom constants
const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

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
  const [isStandaloneGroupModalOpen, setIsStandaloneGroupModalOpen] = useState(false);
  const [standaloneGroupName, setStandaloneGroupName] = useState("");
  const [standaloneGroupColor, setStandaloneGroupColor] = useState("#3B82F6");
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
  
  // Task edit dialog states
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  
  // Task deletion confirmation states
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  // Task expansion states (for showing description)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Project name editing states
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState("");
  
  // Section deletion confirmation states
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [isSectionDeleteConfirmOpen, setIsSectionDeleteConfirmOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  // Group deletion confirmation states
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isGroupDeleteConfirmOpen, setIsGroupDeleteConfirmOpen] = useState(false);
  
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

  // Update Idea Mutation - Moved here to be available for debounced position update
  const updateIdeaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Idea> }) => {
      const res = await apiRequest('PATCH', `/api/ideas/${id}`, updates);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: (updatedIdea: Idea, variables) => {
      // Clear retry count and active update status on successful update
      const isPositionUpdate = 'canvasX' in variables.updates || 'canvasY' in variables.updates;
      if (isPositionUpdate) {
        positionUpdateRetriesRef.current.delete(variables.id);
        activePositionUpdatesRef.current.delete(variables.id);
      }
      
      // Only skip invalidation for position updates to prevent snap-back
      if (isPositionUpdate && Object.keys(variables.updates).length <= 2) {
        return; // Skip invalidation for pure position updates only
      }
      
      // For all other updates (group, title, description, etc.), invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
    onError: (error, variables) => {
      console.error('Failed to update idea:', error);
      
      // Handle position update failures with retry logic
      const isPositionUpdate = 'canvasX' in variables.updates || 'canvasY' in variables.updates;
      if (isPositionUpdate) {
        const retryCount = positionUpdateRetriesRef.current.get(variables.id) || 0;
        const maxRetries = 3;
        
        if (retryCount < maxRetries) {
          positionUpdateRetriesRef.current.set(variables.id, retryCount + 1);
          console.log(`Retrying position update for idea ${variables.id}, attempt ${retryCount + 1}/${maxRetries}`);
          
          // Retry with exponential backoff
          setTimeout(() => {
            updateIdeaMutation.mutate(variables);
          }, Math.pow(2, retryCount) * 1000);
        } else {
          // Max retries exceeded - rollback position in UI
          console.error(`Position update failed after ${maxRetries} retries for idea ${variables.id}`);
          
          // Find the original idea and restore its position
          const originalIdea = ideas.find(idea => idea.id === variables.id);
          if (originalIdea) {
            // Rollback UI to original position
            const element = document.querySelector(`[data-idea-id="${variables.id}"]`) as HTMLElement;
            if (element) {
              element.style.left = `${originalIdea.canvasX}px`;
              element.style.top = `${originalIdea.canvasY}px`;
            }
            
            // Update query cache to original position
            const currentIdeas = queryClient.getQueryData(['/api/ideas', { projectId }]) as Idea[];
            if (currentIdeas) {
              const updatedIdeas = currentIdeas.map(idea => 
                idea.id === variables.id 
                  ? { ...idea, canvasX: originalIdea.canvasX, canvasY: originalIdea.canvasY }
                  : idea
              );
              queryClient.setQueryData(['/api/ideas', { projectId }], updatedIdeas);
              
              // Also update the generic ideas query to maintain consistency
              const genericIdeas = queryClient.getQueryData(['/api/ideas']) as Idea[];
              if (genericIdeas) {
                const updatedGenericIdeas = genericIdeas.map(idea => 
                  idea.id === variables.id 
                    ? { ...idea, canvasX: originalIdea.canvasX, canvasY: originalIdea.canvasY }
                    : idea
                );
                queryClient.setQueryData(['/api/ideas'], updatedGenericIdeas);
              }
            }
          }
          
          positionUpdateRetriesRef.current.delete(variables.id);
          activePositionUpdatesRef.current.delete(variables.id);
          alert('Failed to save card position. Position has been restored.');
        }
      } else {
        // Non-position updates - show generic error
        alert('Failed to update idea: ' + error.message);
      }
      
      // Always clear active status on error to prevent permanent locks
      if (activePositionUpdatesRef.current.has(variables.id)) {
        activePositionUpdatesRef.current.delete(variables.id);
      }
    }
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
  
  // Performance tracking for drag smoothness
  const dragPerformanceRef = useRef({
    lastUpdateTime: 0,
    velocityX: 0,
    velocityY: 0,
    smoothingFactor: 0.8,
    targetFPS: 60
  });
  
  // Position update debouncing and retry logic
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionUpdateRetriesRef = useRef<Map<string, number>>(new Map());
  const pendingPositionUpdatesRef = useRef<Map<string, {x: number, y: number, timestamp: number}>>(new Map());
  const activePositionUpdatesRef = useRef<Set<string>>(new Set());

  // Position validation function
  const validatePosition = useCallback((x: number, y: number): { x: number, y: number, isValid: boolean } => {
    // Basic bounds checking
    const minX = 0;
    const minY = 0;
    const maxX = 5000; // Maximum canvas width
    const maxY = 5000; // Maximum canvas height
    
    // Ensure positions are integers to prevent drift
    const validX = Math.max(minX, Math.min(maxX, Math.round(x)));
    const validY = Math.max(minY, Math.min(maxY, Math.round(y)));
    
    const isValid = (
      Number.isInteger(validX) && 
      Number.isInteger(validY) &&
      validX >= minX && validX <= maxX &&
      validY >= minY && validY <= maxY
    );
    
    return { x: validX, y: validY, isValid };
  }, []);

  // Debounced position update function with validation
  const debouncedPositionUpdate = useCallback((cardId: string, x: number, y: number) => {
    // Validate positions before processing
    const validation = validatePosition(x, y);
    if (!validation.isValid) {
      console.warn(`Invalid position for card ${cardId}: (${x}, ${y}) - corrected to (${validation.x}, ${validation.y})`);
    }
    
    // Prevent concurrent updates for the same card
    if (activePositionUpdatesRef.current.has(cardId)) {
      console.log(`Skipping position update for ${cardId} - update already in progress`);
      return;
    }
    
    // Store the validated position update with timestamp
    pendingPositionUpdatesRef.current.set(cardId, { 
      x: validation.x, 
      y: validation.y, 
      timestamp: Date.now() 
    });
    
    // Clear existing timeout
    if (positionUpdateTimeoutRef.current) {
      clearTimeout(positionUpdateTimeoutRef.current);
    }
    
    // Set new timeout for batch update
    positionUpdateTimeoutRef.current = setTimeout(() => {
      // Process all pending updates
      const updates = Array.from(pendingPositionUpdatesRef.current.entries());
      pendingPositionUpdatesRef.current.clear();
      
      updates.forEach(([ideaId, position]) => {
        // Skip if already updating
        if (activePositionUpdatesRef.current.has(ideaId)) {
          return;
        }
        
        // Re-validate position before database save (in case data got corrupted)
        const finalValidation = validatePosition(position.x, position.y);
        if (!finalValidation.isValid) {
          console.error(`Position validation failed for card ${ideaId} during save: (${position.x}, ${position.y})`);
          return; // Skip invalid updates
        }
        
        // Mark as active
        activePositionUpdatesRef.current.add(ideaId);
        
        // Audit log for position change
        const currentIdea = ideas.find(idea => idea.id === ideaId);
        if (currentIdea) {
          console.log(`Position Update Audit [${ideaId}]: (${currentIdea.canvasX}, ${currentIdea.canvasY}) → (${finalValidation.x}, ${finalValidation.y}) at ${new Date().toISOString()}`);
        }
        
        updateIdeaMutation.mutate({
          id: ideaId,
          updates: { canvasX: finalValidation.x, canvasY: finalValidation.y }
        });
      });
    }, 300); // 300ms debounce
  }, [updateIdeaMutation, validatePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateTimeoutRef.current) {
        clearTimeout(positionUpdateTimeoutRef.current);
      }
    };
  }, []);

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

  // Disperse Ideas - spread overlapping cards to prevent clustering
  const disperseIdeas = () => {
    console.log('=== DISPERSE IDEAS OPERATION ===');
    const targetIdeas = selectedCards.length > 0 
      ? ideas.filter(idea => selectedCards.includes(idea.id))
      : filteredIdeas;
    
    if (targetIdeas.length === 0) {
      console.log('No ideas to disperse');
      return;
    }

    console.log(`Dispersing ${targetIdeas.length} ideas`);
    
    // Calculate canvas bounds for distribution
    const canvas = canvasRef.current;
    const canvasWidth = canvas ? canvas.clientWidth * 0.8 : 1200; // 80% of canvas width
    const canvasHeight = canvas ? canvas.clientHeight * 0.8 : 800; // 80% of canvas height
    const cardSpacing = 350; // Minimum spacing between cards
    
    // Create grid-based dispersion pattern
    const cols = Math.ceil(Math.sqrt(targetIdeas.length * (canvasWidth / canvasHeight)));
    const rows = Math.ceil(targetIdeas.length / cols);
    
    const cellWidth = canvasWidth / cols;
    const cellHeight = canvasHeight / rows;
    
    console.log(`Grid layout: ${cols} cols x ${rows} rows`);
    console.log(`Cell size: ${cellWidth} x ${cellHeight}`);
    
    // Apply dispersed positions
    targetIdeas.forEach((idea, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // Calculate base position in grid
      const baseX = col * cellWidth + cellWidth / 2 - 160; // Center in cell (160 = half card width)
      const baseY = row * cellHeight + cellHeight / 2 - 100; // Center in cell (100 = half card height)
      
      // Add small random offset to avoid perfect grid look
      const randomOffsetX = (Math.random() - 0.5) * 80;
      const randomOffsetY = (Math.random() - 0.5) * 60;
      
      const proposedX = Math.max(0, Math.round(baseX + randomOffsetX));
      const proposedY = Math.max(0, Math.round(baseY + randomOffsetY));
      
      // Validate positions using the validation function
      const validation = validatePosition(proposedX, proposedY);
      const newX = validation.x;
      const newY = validation.y;
      
      console.log(`Idea ${idea.id}: ${idea.canvasX},${idea.canvasY} → ${newX},${newY}`);
      
      // Update position immediately in UI
      const element = document.querySelector(`[data-idea-id="${idea.id}"]`) as HTMLElement;
      if (element) {
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
      }
      
      // Update local state immediately
      const ideaIndex = ideas.findIndex(i => i.id === idea.id);
      if (ideaIndex !== -1) {
        const updatedIdeas = [...ideas];
        updatedIdeas[ideaIndex] = { 
          ...updatedIdeas[ideaIndex], 
          canvasX: newX, 
          canvasY: newY 
        };
        queryClient.setQueryData(['/api/ideas', { projectId }], updatedIdeas);
      }
      
      // Save to database
      debouncedPositionUpdate(idea.id, newX, newY);
    });
    
    console.log('=== DISPERSE IDEAS COMPLETE ===');
  };

  // Group Ideas - cluster cards of same group/color together
  const groupIdeas = () => {
    console.log('=== GROUP IDEAS OPERATION ===');
    const targetIdeas = selectedCards.length > 0 
      ? ideas.filter(idea => selectedCards.includes(idea.id))
      : filteredIdeas;
    
    if (targetIdeas.length === 0) {
      console.log('No ideas to group');
      return;
    }

    // Group ideas by color/group
    const ideasByGroup = targetIdeas.reduce((acc, idea) => {
      const group = groups.find(g => g.id === idea.groupId);
      const color = group ? group.color : idea.color;
      
      if (!acc[color]) acc[color] = [];
      acc[color].push(idea);
      return acc;
    }, {} as Record<string, Idea[]>);

    console.log(`Grouping ${targetIdeas.length} ideas into ${Object.keys(ideasByGroup).length} color groups`);
    
    // Position each group in a cluster
    let groupIndex = 0;
    const groupSpacing = 400; // Space between different color groups
    const cardSpacing = 25; // Small spacing between cards in same group
    
    Object.entries(ideasByGroup).forEach(([color, groupIdeas]) => {
      // Calculate cluster center position
      const cols = Math.ceil(Math.sqrt(Object.keys(ideasByGroup).length));
      const row = Math.floor(groupIndex / cols);
      const col = groupIndex % cols;
      
      const centerX = 200 + col * groupSpacing;
      const centerY = 200 + row * groupSpacing;
      
      console.log(`Group ${color}: ${groupIdeas.length} ideas at cluster center (${centerX}, ${centerY})`);
      
      // Arrange cards in a tight cluster around the center
      groupIdeas.forEach((idea, cardIndex) => {
        const angle = (cardIndex / groupIdeas.length) * 2 * Math.PI;
        const radius = Math.min(50, cardIndex * 8); // Spiral outward for larger groups
        
        const proposedX = Math.max(0, Math.round(centerX + radius * Math.cos(angle)));
        const proposedY = Math.max(0, Math.round(centerY + radius * Math.sin(angle)));
        
        // Validate positions using the validation function
        const validation = validatePosition(proposedX, proposedY);
        const newX = validation.x;
        const newY = validation.y;
        
        // Update position immediately in UI
        const element = document.querySelector(`[data-idea-id="${idea.id}"]`) as HTMLElement;
        if (element) {
          element.style.left = `${newX}px`;
          element.style.top = `${newY}px`;
        }
        
        // Update local state immediately
        const ideaIndex = ideas.findIndex(i => i.id === idea.id);
        if (ideaIndex !== -1) {
          const updatedIdeas = [...ideas];
          updatedIdeas[ideaIndex] = { 
            ...updatedIdeas[ideaIndex], 
            canvasX: newX, 
            canvasY: newY 
          };
          queryClient.setQueryData(['/api/ideas', { projectId }], updatedIdeas);
        }
        
        // Save to database
        debouncedPositionUpdate(idea.id, newX, newY);
      });
      
      groupIndex++;
    });
    
    console.log('=== GROUP IDEAS COMPLETE ===');
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
      
      // Auto-sync: If idea was added to a group with existing TodoList, sync automatically
      const createdIdea = data;
      if (createdIdea.groupId && projectId) {
        // Wait for queries to complete then check if sync is needed
        setTimeout(async () => {
          // Force query refresh first
          await queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
          
          // Small additional delay to ensure data is fresh
          setTimeout(() => {
            const syncStatus = getGroupSyncStatus(createdIdea.groupId);
            if (syncStatus.action === 'update' && syncStatus.todoListId) {
              console.log('Auto-syncing TodoList for new idea in group:', createdIdea.groupId);
              syncTodoListMutation.mutate({ 
                groupId: createdIdea.groupId, 
                todoListId: syncStatus.todoListId, 
                projectId: projectId 
              });
            } else {
              console.log('Sync status:', syncStatus);
            }
          }, 300);
        }, 100);
      }
      
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
      // Automatically open the tasks sidebar to show the new todo list
      setIsRightSidebarOpen(true);
    },
    onError: (error) => {
      console.error('Failed to create TodoList:', error);
      alert('Failed to create TodoList. Please try again.');
    }
  });
  
  // Sync TodoList with group changes
  const syncTodoListMutation = useMutation({
    mutationFn: async ({ groupId, todoListId, projectId }: { groupId: string; todoListId: string; projectId: string }) => {
      console.log('Syncing TodoList:', todoListId, 'with group:', groupId);
      const response = await apiRequest('PATCH', `/api/todolists/${todoListId}/sync`, { groupId, projectId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync TodoList');
      }
      return response.json();
    },
    onSuccess: (result) => {
      console.log('TodoList synced successfully:', result);
      
      // Comprehensive query invalidation to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      // Also invalidate specific todoList tasks if we have the ID
      if (selectedTodoList?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList.id, 'tasks'] });
      }
      
      // Automatically open the tasks sidebar to show the updated todo list
      setIsRightSidebarOpen(true);
    },
    onError: (error) => {
      console.error('Failed to sync TodoList:', error);
      alert('Failed to sync TodoList: ' + error.message);
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
    onMutate: async ({ id, orderIndex, sectionId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'tasks'] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['/api/todolists', selectedTodoList?.id, 'tasks']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/todolists', selectedTodoList?.id, 'tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        
        return old.map(task => 
          task.id === id 
            ? { ...task, orderIndex, sectionId: sectionId !== undefined ? sectionId : task.sectionId }
            : task
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/todolists', selectedTodoList?.id, 'tasks'], context?.previousTasks);
      console.error('Failed to reorder task:', err);
      // Show user-friendly error (you could add toast notification here)
    },
    onSettled: () => {
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );




  // Section reordering mutation with optimistic updates
  const reorderSectionMutation = useMutation({
    mutationFn: async ({ id, orderIndex }: { id: string; orderIndex: number }) => {
      const response = await apiRequest('PATCH', `/api/sections/${id}`, { orderIndex });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reorder section');
      }
      return response.json();
    },
    onMutate: async ({ id, orderIndex }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
      
      // Snapshot the previous value
      const previousSections = queryClient.getQueryData(['/api/todolists', selectedTodoList?.id, 'sections']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/todolists', selectedTodoList?.id, 'sections'], (old: Section[] | undefined) => {
        if (!old) return old;
        
        return old.map(section => 
          section.id === id 
            ? { ...section, orderIndex }
            : section
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousSections };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/todolists', selectedTodoList?.id, 'sections'], context?.previousSections);
      console.error('Failed to reorder section:', err);
      // Show user-friendly error (you could add toast notification here)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/todolists', selectedTodoList?.id, 'sections'] });
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

    // console.log('Drag ended:', { activeId, overId });

    // Handle task dragging
    if (activeId.startsWith('task-')) {
      const activeTask = todoListTasks.find(task => `task-${task.id}` === activeId);
      if (!activeTask) return;

      // Task-to-task (reordering within or across sections)
      if (overId.startsWith('task-')) {
        const overTask = todoListTasks.find(task => `task-${task.id}` === overId);
        if (!overTask) return;

        handleTaskToTaskDrag(activeTask, overTask);
      }
      // Task-to-section (move task to section)
      else if (overId.startsWith('section-')) {
        const sectionId = overId.replace('section-', '');
        handleTaskToSectionDrag(activeTask, sectionId);
      }
      // Task-to-general (move task to unsectioned area)
      else if (overId === 'general-tasks') {
        handleTaskToGeneralDrag(activeTask);
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
        
        // Simpler integer-based ordering - reorder all sections
        let newOrderIndex: number;
        
        if (activeIndex < overIndex) {
          // Moving down: place after the target section
          newOrderIndex = (overSection.orderIndex || 0) + 1;
        } else {
          // Moving up: place at the target section's position
          newOrderIndex = overSection.orderIndex || 0;
        }
        


        handleSectionToSectionDrag(activeSectionId, overSectionId);
      }
    }
  };

  // Gap-based constants for smooth ordering
  const SECTION_ORDER_GAP = 1000;
  const TASK_ORDER_GAP = 100;

  const handleTaskToTaskDrag = (activeTask: Task, overTask: Task) => {
    const targetSectionId = overTask.sectionId || null;
    
    // Get all tasks in the target section, sorted by order
    const tasksInTargetSection = todoListTasks
      .filter(task => task.sectionId === targetSectionId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const overTaskIndex = tasksInTargetSection.findIndex(task => task.id === overTask.id);
    const activeTaskIndex = tasksInTargetSection.findIndex(task => task.id === activeTask.id);
    
    // Skip if moving to same position within same section
    if (activeTask.sectionId === targetSectionId && activeTaskIndex === overTaskIndex) return;
    
    let newOrderIndex: number;
    
    if (overTaskIndex === 0) {
      // Moving to first position
      newOrderIndex = Math.max(0, (overTask.orderIndex || 0) - TASK_ORDER_GAP);
    } else if (activeTaskIndex !== -1 && activeTaskIndex < overTaskIndex) {
      // Moving down: place after the over task
      const nextTask = tasksInTargetSection[overTaskIndex + 1];
      if (nextTask) {
        newOrderIndex = ((overTask.orderIndex || 0) + (nextTask.orderIndex || 0)) / 2;
      } else {
        newOrderIndex = (overTask.orderIndex || 0) + TASK_ORDER_GAP;
      }
    } else {
      // Moving up: place before the over task
      const prevTask = tasksInTargetSection[overTaskIndex - 1];
      if (prevTask) {
        newOrderIndex = ((prevTask.orderIndex || 0) + (overTask.orderIndex || 0)) / 2;
      } else {
        newOrderIndex = (overTask.orderIndex || 0) - TASK_ORDER_GAP;
      }
    }

    // console.log('Task reorder:', { 
    //   activeTask: activeTask.title, 
    //   overTask: overTask.title, 
    //   newOrderIndex, 
    //   targetSectionId 
    // });

    reorderTaskMutation.mutate({
      id: activeTask.id,
      orderIndex: newOrderIndex,
      sectionId: targetSectionId
    });
  };

  const handleTaskToSectionDrag = (activeTask: Task, targetSectionId: string) => {
    if (activeTask.sectionId === targetSectionId) return;

    const tasksInTargetSection = todoListTasks.filter(task => task.sectionId === targetSectionId);
    const maxOrderInSection = tasksInTargetSection.length > 0 
      ? Math.max(...tasksInTargetSection.map(task => task.orderIndex || 0)) 
      : 0;
    
    // console.log('Task to section:', { 
    //   activeTask: activeTask.title, 
    //   targetSectionId, 
    //   newOrderIndex: maxOrderInSection + TASK_ORDER_GAP 
    // });

    reorderTaskMutation.mutate({
      id: activeTask.id,
      orderIndex: maxOrderInSection + TASK_ORDER_GAP,
      sectionId: targetSectionId
    });
  };

  const handleTaskToGeneralDrag = (activeTask: Task) => {
    if (activeTask.sectionId === null) return;

    const unsectionedTasks = todoListTasks.filter(task => !task.sectionId);
    const maxOrderInGeneral = unsectionedTasks.length > 0
      ? Math.max(...unsectionedTasks.map(task => task.orderIndex || 0))
      : 0;
    
    // console.log('Task to general:', { 
    //   activeTask: activeTask.title, 
    //   newOrderIndex: maxOrderInGeneral + TASK_ORDER_GAP 
    // });

    reorderTaskMutation.mutate({
      id: activeTask.id,
      orderIndex: maxOrderInGeneral + TASK_ORDER_GAP,
      sectionId: null
    });
  };

  const handleSectionToSectionDrag = (activeSectionId: string, overSectionId: string) => {
    const activeSection = todoListSections.find(section => section.id === activeSectionId);
    const overSection = todoListSections.find(section => section.id === overSectionId);
    
    if (!activeSection || !overSection) return;

    // Sort sections by current order
    const sortedSections = [...todoListSections].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const activeIndex = sortedSections.findIndex(section => section.id === activeSectionId);
    const overIndex = sortedSections.findIndex(section => section.id === overSectionId);
    
    if (activeIndex === overIndex) return;

    let newOrderIndex: number;
    
    if (overIndex === 0) {
      // Moving to first position
      newOrderIndex = Math.max(0, (overSection.orderIndex || 0) - SECTION_ORDER_GAP);
    } else if (activeIndex < overIndex) {
      // Moving down: place after the over section
      const nextSection = sortedSections[overIndex + 1];
      if (nextSection) {
        newOrderIndex = ((overSection.orderIndex || 0) + (nextSection.orderIndex || 0)) / 2;
      } else {
        newOrderIndex = (overSection.orderIndex || 0) + SECTION_ORDER_GAP;
      }
    } else {
      // Moving up: place before the over section
      const prevSection = sortedSections[overIndex - 1];
      if (prevSection) {
        newOrderIndex = ((prevSection.orderIndex || 0) + (overSection.orderIndex || 0)) / 2;
      } else {
        newOrderIndex = (overSection.orderIndex || 0) - SECTION_ORDER_GAP;
      }
    }

    // console.log('Section reorder:', { 
    //   activeSection: activeSection.name, 
    //   overSection: overSection.name, 
    //   newOrderIndex 
    // });

    reorderSectionMutation.mutate({
      id: activeSectionId,
      orderIndex: newOrderIndex
    });
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
  
  // Toggle task expansion to show description
  const toggleTaskExpansion = (task: Task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(task.id);
    }
  };
  
  // Project name editing functions
  const startEditingProjectName = () => {
    setEditingProjectName((currentProject as Project)?.name || "");
    setIsEditingProjectName(true);
  };
  
  const cancelEditingProjectName = () => {
    setIsEditingProjectName(false);
    setEditingProjectName("");
  };
  
  const saveProjectName = () => {
    if (!editingProjectName.trim() || !projectId) return;
    
    updateProjectMutation.mutate({
      id: projectId,
      updates: { name: editingProjectName.trim() }
    });
  };
  
  // Open task edit dialog with linked idea data
  const openTaskEditDialog = (task: Task) => {
    setTaskBeingEdited(task);
    setEditTaskTitle(task.title);
    
    // Get linked idea description if it exists
    if (task.ideaId) {
      const linkedIdea = ideas.find(idea => idea.id === task.ideaId);
      setEditTaskDescription(linkedIdea?.description || "");
    } else {
      setEditTaskDescription("");
    }
    
    setIsTaskEditDialogOpen(true);
  };
  
  // Save task edit from dialog
  const saveTaskEditDialog = () => {
    if (!taskBeingEdited || !editTaskTitle.trim()) return;
    
    updateTaskMutation.mutate({
      id: taskBeingEdited.id,
      updates: { title: editTaskTitle.trim() }
    });
    
    // Also update linked idea if it exists
    if (taskBeingEdited.ideaId) {
      const linkedIdea = ideas.find(idea => idea.id === taskBeingEdited.ideaId);
      if (linkedIdea) {
        updateIdeaMutation.mutate({
          id: linkedIdea.id,
          updates: {
            title: editTaskTitle.trim(),
            description: editTaskDescription
          }
        });
      }
    }
    
    setIsTaskEditDialogOpen(false);
    setTaskBeingEdited(null);
    setEditTaskTitle("");
    setEditTaskDescription("");
  };
  
  // Delete task with confirmation
  const confirmDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsTaskDeleteConfirmOpen(true);
  };

  const executeTaskDeletion = () => {
    if (!taskToDelete) return;
    deleteTaskMutation.mutate(taskToDelete.id);
    setIsTaskDeleteConfirmOpen(false);
    setTaskToDelete(null);
  };
  
  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const response = await apiRequest('PATCH', `/api/projects/${id}`, updates);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      return response.json();
    },
    onSuccess: (updatedProject) => {
      console.log('Project updated successfully:', updatedProject);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditingProjectName(false);
      setEditingProjectName("");
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
      alert('Failed to update project name: ' + error.message);
    }
  });
  
  // Section deletion functions
  const confirmDeleteSection = (deleteOption: 'tasks' | 'move') => {
    if (!sectionToDelete || !selectedTodoList) return;
    
    const sectionTasks = todoListTasks.filter(task => task.sectionId === sectionToDelete.id);
    
    if (deleteOption === 'tasks') {
      // Delete section and all its tasks
      sectionTasks.forEach(task => {
        deleteTaskMutation.mutate(task.id);
      });
      deleteSectionMutation.mutate(sectionToDelete.id);
    } else {
      // Move all tasks to general area (no section) then delete section
      const unsectionedTasks = todoListTasks.filter(task => !task.sectionId);
      const maxOrderInGeneral = Math.max(...unsectionedTasks.map(task => task.orderIndex || 0), 0);
      
      sectionTasks.forEach((task, index) => {
        reorderTaskMutation.mutate({
          id: task.id,
          orderIndex: maxOrderInGeneral + index + 1,
          sectionId: null
        });
      });
      
      // Small delay to ensure task moves complete before deleting section
      setTimeout(() => {
        deleteSectionMutation.mutate(sectionToDelete.id);
      }, 500);
    }
    
    setIsSectionDeleteConfirmOpen(false);
    setSectionToDelete(null);
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


  const addNewSection = () => {
    if (!newSectionName.trim() || !selectedTodoList) return;

    const maxOrder = Math.max(...todoListSections.map(section => section.orderIndex || 0), 0);
    
    createSectionMutation.mutate({
      todoListId: selectedTodoList.id,
      name: newSectionName.trim(),
      orderIndex: maxOrder + 1
    });
  };

  // DroppableSection Component - enhanced drop zone feedback
  const DroppableSection = ({ sectionId, children }: { sectionId: string; children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `section-${sectionId}`,
    });

    return (
      <div
        ref={setNodeRef}
        className={`transition-all duration-200 ease-in-out rounded-lg ${
          isOver 
            ? 'bg-blue-50/80 ring-2 ring-blue-400 ring-opacity-50 shadow-lg transform scale-[1.02]' 
            : ''
        }`}
        style={{ 
          minHeight: '60px',
          ...(isOver && {
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)'
          })
        }}
      >
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              Drop task here
            </div>
          </div>
        )}
        {children}
      </div>
    );
  };

  // DroppableGeneralTasks Component - enhanced drop zone feedback
  const DroppableGeneralTasks = ({ children }: { children: React.ReactNode }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: 'general-tasks',
    });

    return (
      <div
        ref={setNodeRef}
        className={`relative transition-all duration-200 ease-in-out rounded-lg border-2 border-dashed ${
          isOver 
            ? 'bg-gray-50/80 border-gray-400 shadow-lg transform scale-[1.01]' 
            : 'border-gray-200 border-opacity-50'
        }`}
        style={{ 
          minHeight: '60px',
          ...(isOver && {
            background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(209, 213, 219, 0.1) 100%)'
          })
        }}
      >
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              Drop to general tasks
            </div>
          </div>
        )}
        {children}
        {!isOver && React.Children.count(children) === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            General tasks area
          </div>
        )}
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
      transform: transform ? `translateY(${transform.y}px)` : undefined,
      transition: isDragging ? 'none' : transition,
      opacity: isDragging ? 0.95 : 1,
      zIndex: isDragging ? 1000 : 'auto',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`transition-all duration-200 ${
          isDragging 
            ? 'shadow-2xl transform scale-105 ring-2 ring-purple-300 ring-opacity-50' 
            : ''
        }`}
      >
        <DroppableSection sectionId={section.id}>
          <div className="group border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
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
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`section-menu-${section.id}`}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditingSection(section)}>
                          <Edit className="mr-2 w-3 h-3" />
                          Edit Section
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSectionToDelete(section);
                            setIsSectionDeleteConfirmOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 w-3 h-3" />
                          Delete Section
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
            {/* Tasks are now managed by the parent unified SortableContext */}
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
      transition: isDragging ? 'none' : transition,
      opacity: isDragging ? 0.9 : 1,
      zIndex: isDragging ? 999 : 'auto',
    };

    const isEditing = editingTaskId === task.id;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
          isDragging 
            ? 'shadow-2xl bg-white border-blue-300 ring-2 ring-blue-200 ring-opacity-50 transform rotate-1 scale-105' 
            : 'hover:bg-gray-50 border-transparent hover:border-gray-200 hover:shadow-sm'
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
          <>
            <div className="flex-1">
              <div
                className={`cursor-pointer ${
                  task.completed 
                    ? 'line-through text-gray-500' 
                    : 'text-gray-900'
                }`}
                onClick={() => toggleTaskExpansion(task)}
                data-testid={`text-task-${task.id}`}
              >
                <div className="flex items-center">
                  <span>{task.title}</span>
                  {task.ideaId && (
                    <ChevronDown className={`ml-2 w-3 h-3 transition-transform ${
                      expandedTaskId === task.id ? 'rotate-180' : ''
                    }`} />
                  )}
                </div>
              </div>
              
              {/* Expandable description area */}
              {expandedTaskId === task.id && task.ideaId && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 border-l-2 border-blue-200">
                  {(() => {
                    const linkedIdea = ideas.find(idea => idea.id === task.ideaId);
                    return linkedIdea?.description || "No description available";
                  })()}
                </div>
              )}
            </div>
            
            {/* Three-dot menu */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`task-menu-${task.id}`}
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openTaskEditDialog(task)}>
                    <Edit className="mr-2 w-3 h-3" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => confirmDeleteTask(task)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 w-3 h-3" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
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
    let newX = 200;
    let newY = 200;
    
    if (canvas) {
      // Position in center of visible area with consistent zoom calculation
      const zoomFactor = zoomLevel / 100;
      const centerX = Math.round((canvas.scrollLeft + canvas.clientWidth / 2) / zoomFactor);
      const centerY = Math.round((canvas.scrollTop + canvas.clientHeight / 2) / zoomFactor);
      
      // Check for overlaps and adjust if needed with consistent rounding
      const existingPositions = ideas.map((idea: Idea) => ({ x: Math.round(idea.canvasX), y: Math.round(idea.canvasY) }));
      
      for (let i = 0; i < 20; i++) {
        const testX = Math.round(centerX - 120 + (i % 5) * 60);
        const testY = Math.round(centerY - 60 + Math.floor(i / 5) * 60);
        
        const overlaps = existingPositions.some(pos => 
          Math.abs(pos.x - testX) < 200 && Math.abs(pos.y - testY) < 100
        );
        
        if (!overlaps) {
          newX = testX;
          newY = testY;
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
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setGroupToDelete(group);
      setIsGroupDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      // Store the group ID for the success callback
      (deleteGroupMutation as any).deletedGroupId = groupToDelete.id;
      deleteGroupMutation.mutate(groupToDelete.id);
      setGroupToDelete(null);
      setIsGroupDeleteConfirmOpen(false);
    }
  };

  const cancelDeleteGroup = () => {
    setGroupToDelete(null);
    setIsGroupDeleteConfirmOpen(false);
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
      // IMPORTANT: Move tasks to target group before reassigning ideas
      // This migrates existing tasks to the target group's TodoList (if it exists)
      const migrateRes = await apiRequest('PATCH', `/api/groups/${groupId}/migrate-tasks`, {
        ideaIds: selectedCards
      });
      if (!migrateRes.ok) {
        console.warn('Failed to migrate tasks to target group');
      }
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      
      setIsAssignGroupModalOpen(false);
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
    } catch (error) {
      console.error('Failed to assign cards to group:', error);
      alert('Failed to assign cards to group. Please try again.');
    }
  };

  const handleCreateNewGroup = () => {
    // Open the standalone group creation modal
    setIsStandaloneGroupModalOpen(true);
  };

  const handleSubmitStandaloneGroup = async () => {
    if (!standaloneGroupName.trim()) return;
    
    try {
      // Create the new group  
      const groupRes = await apiRequest('POST', '/api/groups', {
        name: standaloneGroupName.trim(),
        color: standaloneGroupColor,
        projectId: projectId!
      });
      
      if (!groupRes.ok) {
        const errorData = await groupRes.json();
        throw new Error(errorData.message || 'Failed to create group');
      }
      
      const newGroup = await groupRes.json();
      
      // IMPORTANT: Move tasks to target group instead of unlinking them
      // This migrates existing tasks to the new group's TodoList (if it exists)
      const migrateRes = await apiRequest('PATCH', `/api/groups/${newGroup.id}/migrate-tasks`, {
        ideaIds: selectedCards
      });
      if (!migrateRes.ok) {
        console.warn('Failed to migrate tasks to new group');
      }
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/todolists'] });
      
      // Close modals and reset state
      setIsStandaloneGroupModalOpen(false);
      setIsGroupActionsModalOpen(false);
      setSelectedCards([]);
      setStandaloneGroupName("");
      setStandaloneGroupColor("#3B82F6");
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
    // Use proper confirmation dialog like single deletes
    const firstIdea = ideas.find(i => i.id === selectedCards[0]);
    if (firstIdea) {
      // Set the first idea for the dialog and modify the message for bulk
      setIdeaToDelete({ ...firstIdea, title: `${selectedCards.length} selected ideas` } as Idea);
      setIsDeleteConfirmOpen(true);
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
    
    // Use consistent zoom calculations and rounding
    const zoomFactor = zoomLevel / 100;
    const mouseX = Math.round((event.clientX - rect.left) / zoomFactor);
    const mouseY = Math.round((event.clientY - rect.top) / zoomFactor);
    
    // Get the card element to calculate offset with consistent rounding
    const cardElement = event.currentTarget as HTMLElement;
    const cardRect = cardElement.getBoundingClientRect();
    const offsetX = Math.round((event.clientX - cardRect.left) / zoomFactor);
    const offsetY = Math.round((event.clientY - cardRect.top) / zoomFactor);
    
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
        // Store positions as integers to prevent drift
        const initialX = Math.round(idea.canvasX);
        const initialY = Math.round(idea.canvasY);
        
        initialPositions[id] = { x: initialX, y: initialY };
        currentPositions[id] = { x: initialX, y: initialY };
        dragElements[id] = element;
        
        // Store original position for consistent transform calculation
        element.dataset.dragStartX = initialX.toString();
        element.dataset.dragStartY = initialY.toString();
        
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
    
    const currentTime = performance.now();
    const deltaTime = currentTime - dragPerformanceRef.current.lastUpdateTime;
    
    // Throttle updates to maintain 60 FPS for smoother performance
    if (deltaTime < 1000 / dragPerformanceRef.current.targetFPS) {
      return;
    }
    
    // Calculate delta with consistent rounding
    const deltaX = Math.round(mouseX - currentDragState.startPos.x);
    const deltaY = Math.round(mouseY - currentDragState.startPos.y);
    
    // Calculate velocity for smooth momentum (used for potential future enhancements)
    if (dragPerformanceRef.current.lastUpdateTime > 0) {
      const prevVelX = dragPerformanceRef.current.velocityX;
      const prevVelY = dragPerformanceRef.current.velocityY;
      const newVelX = deltaX / (deltaTime || 1);
      const newVelY = deltaY / (deltaTime || 1);
      
      // Apply smoothing to prevent jerky movements
      dragPerformanceRef.current.velocityX = prevVelX * dragPerformanceRef.current.smoothingFactor + 
                                            newVelX * (1 - dragPerformanceRef.current.smoothingFactor);
      dragPerformanceRef.current.velocityY = prevVelY * dragPerformanceRef.current.smoothingFactor + 
                                            newVelY * (1 - dragPerformanceRef.current.smoothingFactor);
    }
    
    dragPerformanceRef.current.lastUpdateTime = currentTime;
    
    // Update positions using consistent coordinate calculation
    Object.entries(currentDragState.dragElements).forEach(([cardId, element]) => {
      const initialPos = currentDragState.initialPositions[cardId];
      if (initialPos && element) {
        // Calculate new position with enhanced bounds checking
        const cardWidth = element.offsetWidth || 320; // Default card width
        const cardHeight = element.offsetHeight || 200; // Default card height
        const canvas = canvasRef.current;
        const maxX = canvas ? (canvas.scrollWidth - cardWidth) : 2000;
        const maxY = canvas ? (canvas.scrollHeight - cardHeight) : 2000;
        
        const newX = Math.max(0, Math.min(maxX, Math.round(initialPos.x + deltaX)));
        const newY = Math.max(0, Math.min(maxY, Math.round(initialPos.y + deltaY)));
        
        // Update current positions for final save
        currentDragState.currentPositions[cardId] = { x: newX, y: newY };
        
        // Enhanced visual feedback with smooth scaling based on movement speed
        const velocityMagnitude = Math.sqrt(
          dragPerformanceRef.current.velocityX ** 2 + 
          dragPerformanceRef.current.velocityY ** 2
        );
        const dynamicScale = Math.min(1.05, 1.02 + velocityMagnitude * 0.001);
        const dynamicRotation = Math.min(3, 2 + velocityMagnitude * 0.01);
        
        // Use transform with exact pixel values to prevent sub-pixel rendering
        element.style.transform = `translate(${Math.round(deltaX)}px, ${Math.round(deltaY)}px) rotate(${dynamicRotation}deg) scale(${dynamicScale})`;
      }
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragStateRef.current.isDragging || !canvasRef.current) return;
    
    event.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Use consistent zoom calculations with rounding
    const zoomFactor = zoomLevel / 100;
    const mouseX = Math.round((event.clientX - rect.left) / zoomFactor);
    const mouseY = Math.round((event.clientY - rect.top) / zoomFactor);
    
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
        // Ensure final positions are integers to prevent sub-pixel drift
        const finalX = Math.round(finalPos.x);
        const finalY = Math.round(finalPos.y);
        
        // Remove data attributes used during drag
        delete element.dataset.dragStartX;
        delete element.dataset.dragStartY;
        
        // Reset styles with smooth transition - but avoid transform conflicts
        element.style.transition = 'none'; // Prevent conflicts during position change
        element.style.willChange = 'auto';
        element.style.zIndex = '';
        element.style.cursor = 'pointer';
        element.style.userSelect = '';
        element.style.pointerEvents = '';
        element.style.transform = ''; // Remove transform immediately
        element.style.filter = '';
        
        // Update actual position with exact integer values
        element.style.left = `${finalX}px`;
        element.style.top = `${finalY}px`;
        
        // Update local state immediately to prevent snap-back
        const ideaIndex = ideas.findIndex(idea => idea.id === cardId);
        if (ideaIndex !== -1) {
          const updatedIdeas = [...ideas];
          updatedIdeas[ideaIndex] = { 
            ...updatedIdeas[ideaIndex], 
            canvasX: finalX, 
            canvasY: finalY 
          };
          queryClient.setQueryData(['/api/ideas', { projectId }], updatedIdeas);
        }

        // Save to database with debounced update (prevents spam and handles rapid movements)
        debouncedPositionUpdate(cardId, finalX, finalY);
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
  // Check if group TodoList needs sync
  const getGroupSyncStatus = (groupId: string) => {
    const groupIdeas = ideas.filter(idea => idea.groupId === groupId);
    const groupTodoList = todoLists.find(tl => tl.groupId === groupId);
    
    if (!groupTodoList) {
      return { needsSync: false, action: 'create', ideaCount: groupIdeas.length };
    }
    
    // Get tasks for this TodoList from the tasks query
    const todoListTasks = allTasks.filter(task => task.todoListId === groupTodoList.id);
    const tasksWithIdeas = todoListTasks.filter(task => task.ideaId);
    
    // Compare idea IDs with task idea IDs
    const ideaIds = new Set(groupIdeas.map(idea => idea.id));
    const taskIdeaIds = new Set(tasksWithIdeas.map(task => task.ideaId).filter(id => id !== null));
    
    const needsSync = ideaIds.size !== taskIdeaIds.size || 
                     Array.from(ideaIds).some(id => !taskIdeaIds.has(id)) ||
                     Array.from(taskIdeaIds).some(id => id && !ideaIds.has(id));
    
    return { 
      needsSync, 
      action: needsSync ? 'update' : 'synced', 
      ideaCount: groupIdeas.length,
      todoListId: groupTodoList.id
    };
  };
  
  // Create or Update TodoList from group
  const handleCreateTodoList = async (groupId: string) => {
    const syncStatus = getGroupSyncStatus(groupId);
    
    if (syncStatus.action === 'create') {
      console.log('Creating TodoList from group:', groupId);
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      if (syncStatus.ideaCount === 0) {
        alert('This group has no ideas to convert to tasks.');
        return;
      }
      
      createTodoListMutation.mutate({ groupId, name: group.name, projectId: projectId! });
    } else if (syncStatus.action === 'update') {
      console.log('Updating TodoList for group:', groupId);
      syncTodoListMutation.mutate({ groupId, todoListId: syncStatus.todoListId!, projectId: projectId! });
    }
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
          {isEditingProjectName ? (
            <div className="flex items-center space-x-2">
              <Input
                value={editingProjectName}
                onChange={(e) => setEditingProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveProjectName();
                  if (e.key === 'Escape') cancelEditingProjectName();
                }}
                className="text-xl font-bold h-8 px-2"
                autoFocus
                data-testid="input-edit-project-name"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={saveProjectName}
                disabled={!editingProjectName.trim() || updateProjectMutation.isPending}
                data-testid="button-save-project-name"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditingProjectName}
                data-testid="button-cancel-project-name"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center group">
              <h1 
                className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={startEditingProjectName}
                data-testid="project-name-header"
              >
                {projectLoading ? 'Loading...' : (currentProject as any)?.name || 'Brain Storm to ToDo List'}
              </h1>
              <Edit2 
                className="w-4 h-4 ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-blue-600"
                onClick={startEditingProjectName}
                data-testid="edit-project-name-icon"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 text-muted-foreground hover:text-gray-900"
                data-testid="button-user-menu"
              >
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="User avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {user?.firstName?.[0] || user?.email?.[0] || '?'}
                    </span>
                  </div>
                )}
                <span data-testid="text-user-name" className="text-sm text-gray-700">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                            {(() => {
                              const syncStatus = getGroupSyncStatus(group.id);
                              if (syncStatus.ideaCount === 0) return null;
                              
                              const isCreate = syncStatus.action === 'create';
                              const isUpdate = syncStatus.action === 'update';
                              const isSynced = syncStatus.action === 'synced';
                              
                              if (isCreate || isUpdate) {
                                return (
                                  <DropdownMenuItem onClick={() => handleCreateTodoList(group.id)}>
                                    {isCreate ? <Plus className="mr-2 w-3 h-3" /> : <RefreshCw className="mr-2 w-3 h-3" />}
                                    {isCreate ? 'Create TodoList' : 'Update TodoList'}
                                  </DropdownMenuItem>
                                );
                              }
                              
                              if (isSynced) {
                                return (
                                  <DropdownMenuItem disabled className="text-gray-400">
                                    <Check className="mr-2 w-3 h-3" />
                                    TodoList Synced
                                  </DropdownMenuItem>
                                );
                              }
                              
                              return null;
                            })()}
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
                  data-idea-id={idea.id}
                  className={`absolute w-64 shadow-md hover:shadow-lg transition-all duration-200 ease-out cursor-pointer ${
                    isSelected 
                      ? 'border-4 border-blue-500 shadow-lg shadow-blue-500/30' 
                      : 'border-2 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    left: Math.round(idea.canvasX),
                    top: Math.round(idea.canvasY),
                    backgroundColor: cardColor,
                    cursor: dragState.isDragging ? 'grabbing' : 'pointer',
                    transition: isSelected 
                      ? 'all 0.2s ease-out, box-shadow 0.15s ease-out, border 0.1s ease-out' 
                      : 'all 0.2s ease-out, border 0.15s ease-out, box-shadow 0.1s ease-out',
                    transform: isSelected && !dragState.isDragging ? 'scale(1.02)' : 'scale(1)',
                    zIndex: isSelected ? 10 : 1,
                    ...(isSelected && {
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.4), 0 12px 20px -5px rgba(0, 0, 0, 0.15), 0 0 15px rgba(59, 130, 246, 0.2)'
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
                  // Check if this is a bulk delete (multiple selected)
                  if (selectedCards.length > 1) {
                    // Bulk delete all selected ideas
                    selectedCards.forEach(id => {
                      deleteIdeaMutation.mutate(id);
                    });
                    setIsGroupActionsModalOpen(false);
                    setSelectedCards([]);
                  } else {
                    // Single delete
                    deleteIdeaMutation.mutate(ideaToDelete.id);
                  }
                }
              }}
              disabled={deleteIdeaMutation.isPending}
            >
              {deleteIdeaMutation.isPending ? 'Deleting...' : (selectedCards.length > 1 ? 'Delete All Ideas' : 'Delete Idea')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Delete Confirmation Dialog */}
      <Dialog open={isGroupDeleteConfirmOpen} onOpenChange={setIsGroupDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the group "{groupToDelete?.name}"? All ideas in this group will become ungrouped. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteGroup}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
              data-testid="button-confirm-delete-group"
            >
              {deleteGroupMutation.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <Dialog open={isSectionDeleteConfirmOpen} onOpenChange={setIsSectionDeleteConfirmOpen}>
        <DialogContent className="max-w-[42rem]">
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              {(() => {
                if (!sectionToDelete) return "Are you sure you want to delete this section?";
                const sectionTasks = todoListTasks.filter(task => task.sectionId === sectionToDelete.id);
                if (sectionTasks.length === 0) {
                  return `Are you sure you want to delete the section "${sectionToDelete.name}"? This action cannot be undone.`;
                }
                return `The section "${sectionToDelete.name}" contains ${sectionTasks.length} task${sectionTasks.length > 1 ? 's' : ''}. What would you like to do with ${sectionTasks.length > 1 ? 'them' : 'it'}?`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsSectionDeleteConfirmOpen(false);
                setSectionToDelete(null);
              }}
              data-testid="button-cancel-delete-section"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {(() => {
              if (!sectionToDelete) return null;
              const sectionTasks = todoListTasks.filter(task => task.sectionId === sectionToDelete.id);
              if (sectionTasks.length === 0) {
                return (
                  <Button 
                    variant="destructive"
                    onClick={() => confirmDeleteSection('tasks')}
                    disabled={deleteSectionMutation.isPending}
                    data-testid="button-delete-empty-section"
                    className="w-full sm:w-auto"
                  >
                    {deleteSectionMutation.isPending ? 'Deleting...' : 'Delete Section'}
                  </Button>
                );
              }
              return (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => confirmDeleteSection('move')}
                    disabled={reorderTaskMutation.isPending || deleteSectionMutation.isPending}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 w-full sm:w-auto"
                    data-testid="button-move-tasks-delete-section"
                  >
                    Move Tasks & Delete Section
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => confirmDeleteSection('tasks')}
                    disabled={deleteTaskMutation.isPending || deleteSectionMutation.isPending}
                    data-testid="button-delete-section-and-tasks"
                    className="w-full sm:w-auto"
                  >
                    Delete Section & All Tasks
                  </Button>
                </>
              );
            })()}
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
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              {/* Add New Section - Outside any SortableContext */}
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
                {/* Unified SortableContext for all draggable items */}
                <SortableContext 
                  items={[
                    ...todoListSections.map(section => `section-${section.id}`),
                    ...todoListTasks.map(task => `task-${task.id}`)
                  ]} 
                  strategy={verticalListSortingStrategy}
                >
                  {/* Render Sections */}
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

                  {/* Unsectioned Tasks */}
                  {(() => {
                    const unsectionedTasks = todoListTasks
                      .filter(task => !task.sectionId)
                      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                    
                    const completedUnsectioned = unsectionedTasks.filter(task => task.completed);
                    const incompleteUnsectioned = unsectionedTasks.filter(task => !task.completed);

                    if (unsectionedTasks.length === 0) return null;

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
                </SortableContext>
              </div>
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
      
      {/* Task Edit Dialog */}
      <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Title</label>
              <Input
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="mt-1"
                data-testid="input-edit-task-title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editTaskDescription}
                onChange={(e) => setEditTaskDescription(e.target.value)}
                placeholder="Enter task description..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="textarea-edit-task-description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveTaskEditDialog}
              disabled={!editTaskTitle.trim()}
              data-testid="button-save-task-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Group Creation Modal */}
      <Dialog open={isStandaloneGroupModalOpen} onOpenChange={setIsStandaloneGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group for the selected ideas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Group Name *</label>
              <Input
                placeholder="Enter group name..."
                value={standaloneGroupName}
                onChange={(e) => setStandaloneGroupName(e.target.value.slice(0, 50))}
                maxLength={50}
                className="mt-1"
                data-testid="input-standalone-group-name"
              />
              <div className="text-xs text-gray-500 text-right mt-1">
                {standaloneGroupName.length}/50
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      standaloneGroupColor === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setStandaloneGroupColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsStandaloneGroupModalOpen(false);
                setStandaloneGroupName("");
                setStandaloneGroupColor("#3B82F6");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitStandaloneGroup}
              disabled={!standaloneGroupName.trim()}
              data-testid="button-create-standalone-group"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TodoList Deletion Confirmation Modal */}
      <Dialog open={deleteTodoListConfirmOpen} onOpenChange={setDeleteTodoListConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete TodoList</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{todoListToDelete?.name}"? This action cannot be undone and will remove all tasks in this list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTodoListConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeTodoListDeletion}
              disabled={deleteTodoListMutation.isPending}
              data-testid="button-confirm-delete-todolist"
            >
              {deleteTodoListMutation.isPending ? 'Deleting...' : 'Delete TodoList'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Deletion Confirmation Modal */}
      <Dialog open={isTaskDeleteConfirmOpen} onOpenChange={setIsTaskDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              {taskToDelete?.ideaId && ideas?.find(idea => idea.id === taskToDelete.ideaId) ? (
                <>
                  Are you sure you want to delete "{taskToDelete?.title}"? 
                  This will also remove the linked idea card from the canvas.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{taskToDelete?.title}"?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeTaskDeletion}
              disabled={deleteTaskMutation.isPending}
              data-testid="button-confirm-delete-task"
            >
              {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}