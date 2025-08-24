import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Trash2,
  ArrowLeft,
  MoreHorizontal,
  Maximize2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Idea, Group, InsertIdea } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

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

// Mock todo lists for now (will be replaced with real data later)
const mockTodoLists = [
  {
    id: 1,
    title: "Project Planning",
    tasks: [
      { id: 1, text: "Define project scope and objectives", completed: true },
      { id: 2, text: "Create detailed timeline and milestones", completed: false },
      { id: 3, text: "Assign team members and responsibilities", completed: false }
    ]
  },
  {
    id: 2,
    title: "Content Strategy",
    tasks: [
      { id: 4, text: "Audit existing content for gaps", completed: true },
      { id: 5, text: "Develop content calendar for Q1", completed: true },
      { id: 6, text: "Create brand voice guidelines", completed: false },
      { id: 7, text: "Schedule social media campaigns", completed: false }
    ]
  }
];

export default function Canvas() {
  const { user } = useAuth() as { user: any };
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNewIdeaDialogOpen, setIsNewIdeaDialogOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isGroupActionsModalOpen, setIsGroupActionsModalOpen] = useState(false);
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null); // null = "All Ideas"
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  // Form State
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  const [newIdeaGroupId, setNewIdeaGroupId] = useState<string>("");
  const [newIdeaColor, setNewIdeaColor] = useState("#3B82F6");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
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

  // API Queries
  const { data: ideas = [], isLoading: ideasLoading } = useQuery({
    queryKey: ['/api/ideas'],
  }) as { data: Idea[], isLoading: boolean };

  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups'],
  }) as { data: Group[] };

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
    
    // Get ACTUAL viewport dimensions (visible canvas area)
    const viewportWidth = canvasContainer.clientWidth;
    const viewportHeight = canvasContainer.clientHeight;
    console.log('Actual viewport dimensions:', viewportWidth, 'x', viewportHeight);
    
    // Calculate content dimensions
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    console.log('Raw content dimensions:', contentWidth, 'x', contentHeight);
    
    // Add padding margin (125px on all sides)
    const paddingMargin = 125;
    const paddedWidth = contentWidth + (paddingMargin * 2);
    const paddedHeight = contentHeight + (paddingMargin * 2);
    console.log('Content with padding:', paddedWidth, 'x', paddedHeight);
    
    // Calculate zoom percentage needed to fit content
    const zoomRatioX = viewportWidth / paddedWidth;
    const zoomRatioY = viewportHeight / paddedHeight;
    console.log('Zoom ratios - X:', zoomRatioX.toFixed(3), 'Y:', zoomRatioY.toFixed(3));
    
    // Use the smaller ratio to ensure all content fits
    const optimalZoomRatio = Math.min(zoomRatioX, zoomRatioY);
    const optimalZoomPercent = optimalZoomRatio * 100;
    console.log('Optimal zoom ratio:', optimalZoomRatio.toFixed(3), '(', optimalZoomPercent.toFixed(1), '%)');
    
    // Apply zoom bounds (15% minimum, 200% maximum)
    const finalZoom = Math.max(15, Math.min(200, optimalZoomPercent));
    console.log('Final zoom after bounds:', finalZoom.toFixed(1), '%');
    
    // Apply the zoom
    setZoomLevel(finalZoom);
    console.log('=== FIT TO CANVAS COMPLETE ===');
  };

  // Debug logging (remove in production)
  // console.log('Ideas data:', ideas);
  // console.log('Groups data:', groups);
  // console.log('Ideas loading:', ideasLoading);

  // Mutations
  const createIdeaMutation = useMutation({
    mutationFn: async (data: InsertIdea) => {
      const res = await apiRequest('POST', '/api/ideas', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      // Clear all form fields
      setNewIdeaTitle("");
      setNewIdeaDescription("");
      setNewIdeaGroupId("");
      setNewIdeaColor("#3B82F6");
      setIsCreatingNewGroup(false);
      setNewGroupName("");
      setIsNewIdeaDialogOpen(false);
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
      const res = await apiRequest('DELETE', `/api/ideas/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
  });

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  // Idea CRUD functions
  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim()) return;
    
    let finalGroupId = newIdeaGroupId;
    let finalColor = newIdeaColor;
    
    // Handle creating new group if selected
    if (isCreatingNewGroup && newGroupName.trim()) {
      try {
        const groupRes = await apiRequest('POST', '/api/groups', {
          name: newGroupName.trim(),
          color: newIdeaColor
        });
        const newGroup = await groupRes.json();
        finalGroupId = newGroup.id;
        finalColor = newGroup.color;
      } catch (error) {
        console.error('Failed to create new group:', error);
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
      // Position in center of visible area
      const centerX = (canvas.scrollLeft + canvas.clientWidth / 2) / (zoomLevel / 100);
      const centerY = (canvas.scrollTop + canvas.clientHeight / 2) / (zoomLevel / 100);
      
      // Check for overlaps and adjust if needed
      const existingPositions = ideas.map((idea: Idea) => ({ x: idea.canvasX, y: idea.canvasY }));
      
      for (let i = 0; i < 20; i++) {
        const testX = centerX - 120 + (i % 5) * 60;
        const testY = centerY - 60 + Math.floor(i / 5) * 60;
        
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

    createIdeaMutation.mutate({
      userId: user?.id || "",
      title: newIdeaTitle.trim(),
      description: newIdeaDescription.trim(),
      groupId: finalGroupId || null,
      color: finalColor,
      canvasX: newX,
      canvasY: newY,
    });
  };

  const handleEditIdea = (ideaId: string) => {
    console.log('Edit idea:', ideaId);
    // TODO: Implement edit modal
  };

  const handleDeleteIdea = (ideaId: string) => {
    if (window.confirm("Are you sure you want to delete this idea?")) {
      deleteIdeaMutation.mutate(ideaId);
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
  const handleToggleTask = (taskId: number) => {
    console.log('Toggle task:', taskId);
    // TODO: Implement task toggling
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
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Palette className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Canvas Ideas</h1>
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
              {ideas.length} ideas • {mockTodoLists.reduce((acc, list) => acc + list.tasks.length, 0)} tasks
            </div>
          </div>
        </aside>

        {/* Center Canvas Area */}
        <main className="flex-1 relative bg-white overflow-hidden">
          {/* Zoom-Responsive Dot Grid Background */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #E5E7EB 2px, transparent 2px)`,
              backgroundSize: `${50 * (zoomLevel / 100)}px ${50 * (zoomLevel / 100)}px`,
              backgroundPosition: '0 0'
            }}
          />

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex items-center space-x-1 bg-white rounded-lg shadow-md p-1 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
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
              disabled={zoomLevel >= 200}
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

          {/* Canvas Content */}
          <div 
            ref={canvasRef}
            className="absolute inset-0 p-8 overflow-auto"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / (zoomLevel / 100)}px`,
              height: `${10000 / (zoomLevel / 100)}px`
            }}
            onClick={handleCanvasClick}
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
                            <Edit className="mr-2 w-4 h-4" />
                            Edit Idea
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIdea(idea.id);
                            }}
                            className="text-red-600"
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
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Infinite Canvas</h3>
                  <p className="text-sm text-gray-600">
                    Drag ideas around • Zoom to explore • Cmd/Ctrl+click to multi-select
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - To-Do Lists */}
        <aside className={`w-80 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 ${
          isRightSidebarOpen ? 'translate-x-0' : 'translate-x-80'
        }`}>
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
            {mockTodoLists.map((list) => (
              <div key={list.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">{list.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {list.tasks.filter(t => !t.completed).length} left
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {list.tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-start space-x-2 group"
                      data-testid={`task-${task.id}`}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(task.id)}
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
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 border-dashed border-2 border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600"
                  data-testid={`button-add-task-${list.id}`}
                >
                  <Plus className="mr-1 w-3 h-3" />
                  Add task
                </Button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              className="w-full" 
              data-testid="button-new-todo-list"
            >
              <Plus className="mr-2 w-4 h-4" />
              New To-Do List
            </Button>
          </div>
        </aside>

        {/* Sidebar Toggle Button (when collapsed) */}
        {!isRightSidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-20 right-4 z-10 bg-white shadow-md"
            onClick={() => setIsRightSidebarOpen(true)}
            data-testid="button-show-sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
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
    </div>
  );
}