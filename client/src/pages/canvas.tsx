import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNewIdeaDialogOpen, setIsNewIdeaDialogOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isGroupActionsModalOpen, setIsGroupActionsModalOpen] = useState(false);
  const [isAssignGroupModalOpen, setIsAssignGroupModalOpen] = useState(false);
  
  // Form State
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  
  // Drag State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragCardId: null,
    startPos: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    initialPositions: {}
  });

  // API Queries
  const { data: ideas = [], isLoading: ideasLoading } = useQuery({
    queryKey: ['/api/ideas'],
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups'],
  });

  // Mutations
  const createIdeaMutation = useMutation({
    mutationFn: async (data: InsertIdea) => {
      const res = await apiRequest('POST', '/api/ideas', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      setNewIdeaTitle("");
      setNewIdeaDescription("");
      setIsNewIdeaDialogOpen(false);
    },
  });

  const updateIdeaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Idea> }) => {
      const res = await apiRequest('PATCH', `/api/ideas/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
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
  const handleCreateIdea = () => {
    if (!newIdeaTitle.trim()) return;
    
    // Find a good position for the new card
    const existingPositions = ideas.map((idea: Idea) => ({ x: idea.canvasX, y: idea.canvasY }));
    let newX = 100;
    let newY = 100;
    
    // Simple positioning logic - place new cards in a grid
    const gridSize = 300;
    while (existingPositions.some(pos => 
      Math.abs(pos.x - newX) < gridSize && Math.abs(pos.y - newY) < gridSize
    )) {
      newX += gridSize;
      if (newX > 1000) {
        newX = 100;
        newY += 250;
      }
    }

    createIdeaMutation.mutate({
      userId: user?.id || "",
      title: newIdeaTitle,
      description: newIdeaDescription,
      color: "#E2E8F0",
      canvasX: newX,
      canvasY: newY,
      groupId: null
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

  // Group action functions
  const handleGroupActions = () => {
    setIsGroupActionsModalOpen(true);
  };

  const handleAssignToGroup = (groupId: string) => {
    console.log('Assign cards to group:', selectedCards, groupId);
    // TODO: Implement group assignment
    setIsAssignGroupModalOpen(false);
    setIsGroupActionsModalOpen(false);
    setSelectedCards([]);
  };

  const handleCreateNewGroup = () => {
    console.log('Create new group for cards:', selectedCards);
    setIsGroupActionsModalOpen(false);
    setSelectedCards([]);
  };

  const handleRemoveFromGroups = () => {
    console.log('Remove cards from all groups:', selectedCards);
    setIsGroupActionsModalOpen(false);
    setSelectedCards([]);
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

  // Drag and Drop functions
  const handleMouseDown = (event: React.MouseEvent, cardId: string) => {
    // Only start drag on left mouse button
    if (event.button !== 0) return;
    
    // Don't start drag if clicking on menu buttons
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    
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
    
    // Get initial positions of all cards that will be dragged
    const cardsToMove = selectedCards.includes(cardId) ? selectedCards : [cardId];
    const initialPositions: Record<string, { x: number, y: number }> = {};
    
    cardsToMove.forEach(id => {
      const idea = ideas.find((i: Idea) => i.id === id);
      if (idea) {
        initialPositions[id] = { x: idea.canvasX, y: idea.canvasY };
      }
    });
    
    setDragState({
      isDragging: true,
      dragCardId: cardId,
      startPos: { x: mouseX, y: mouseY },
      offset: { x: offsetX, y: offsetY },
      initialPositions
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragState.isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / (zoomLevel / 100);
    const mouseY = (event.clientY - rect.top) / (zoomLevel / 100);
    
    const deltaX = mouseX - dragState.startPos.x;
    const deltaY = mouseY - dragState.startPos.y;
    
    // Update positions of all selected cards
    const cardsToMove = selectedCards.includes(dragState.dragCardId!) 
      ? selectedCards 
      : [dragState.dragCardId!];
    
    cardsToMove.forEach(cardId => {
      const initialPos = dragState.initialPositions[cardId];
      if (initialPos) {
        const newX = Math.max(0, initialPos.x + deltaX);
        const newY = Math.max(0, initialPos.y + deltaY);
        
        // Update the card position immediately in the UI
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
        if (cardElement) {
          cardElement.style.left = `${newX}px`;
          cardElement.style.top = `${newY}px`;
          cardElement.style.cursor = 'grabbing';
          cardElement.style.userSelect = 'none';
          cardElement.style.pointerEvents = 'none';
          cardElement.style.zIndex = '1000';
          cardElement.style.transform = 'rotate(2deg)';
          cardElement.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        }
      }
    });
  };

  const handleMouseUp = () => {
    if (!dragState.isDragging) return;
    
    const cardsToMove = selectedCards.includes(dragState.dragCardId!) 
      ? selectedCards 
      : [dragState.dragCardId!];
    
    // Save final positions to database
    cardsToMove.forEach(cardId => {
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement;
      if (cardElement) {
        const finalX = parseInt(cardElement.style.left);
        const finalY = parseInt(cardElement.style.top);
        
        // Reset visual effects
        cardElement.style.cursor = 'pointer';
        cardElement.style.userSelect = '';
        cardElement.style.pointerEvents = '';
        cardElement.style.zIndex = '';
        cardElement.style.transform = '';
        cardElement.style.boxShadow = '';
        
        // Update database
        updateIdeaMutation.mutate({
          id: cardId,
          updates: { canvasX: finalX, canvasY: finalY }
        });
      }
    });
    
    setDragState({
      isDragging: false,
      dragCardId: null,
      startPos: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
      initialPositions: {}
    });
  };

  // Mouse event listeners
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [dragState.isDragging, dragState.startPos, dragState.initialPositions, selectedCards, zoomLevel]);

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
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Idea</DialogTitle>
                  <DialogDescription>
                    Add your creative ideas to the canvas
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="idea-title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="idea-title"
                      placeholder="Enter your idea title..."
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                      data-testid="input-idea-title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="idea-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="idea-description"
                      placeholder="Describe your idea in detail..."
                      className="resize-none"
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      data-testid="textarea-idea-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewIdeaDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateIdea} 
                    disabled={!newIdeaTitle.trim() || createIdeaMutation.isPending}
                    data-testid="button-save-idea"
                  >
                    {createIdeaMutation.isPending ? 'Creating...' : 'Save Idea'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Groups</h3>
              <div className="space-y-2">
                {groups.map((group: Group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    data-testid={`group-${group.id}`}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-sm text-gray-700">{group.name}</span>
                    </div>
                    <Badge className="text-xs bg-gray-100 text-gray-600">
                      {ideas.filter((idea: Idea) => idea.groupId === group.id).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm" data-testid="button-templates">
                  <Bookmark className="mr-2 w-4 h-4" />
                  Templates
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" data-testid="button-recent-ideas">
                  <Lightbulb className="mr-2 w-4 h-4" />
                  Recent Ideas
                </Button>
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
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
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
              {zoomLevel}%
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
          >
            {/* Idea Cards */}
            {ideas.map((idea: Idea) => {
              const isSelected = selectedCards.includes(idea.id);
              const group = groups.find((g: Group) => g.id === idea.groupId);
              const cardColor = group ? group.color : idea.color;
              
              return (
                <Card 
                  key={idea.id}
                  data-card-id={idea.id}
                  className={`absolute w-64 shadow-md hover:shadow-lg transition-all cursor-pointer border-2 ${
                    isSelected 
                      ? 'border-blue-500 shadow-blue-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ 
                    left: idea.canvasX, 
                    top: idea.canvasY,
                    backgroundColor: cardColor,
                    cursor: dragState.isDragging ? 'grabbing' : 'pointer'
                  }}
                  onClick={(e) => handleCardClick(idea.id, e)}
                  onMouseDown={(e) => handleMouseDown(e, idea.id)}
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
    </div>
  );
}