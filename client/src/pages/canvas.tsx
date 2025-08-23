import { useState } from "react";
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
  Settings
} from "lucide-react";

// Mock data for demonstration
const mockIdeaCards = [
  {
    id: 1,
    title: "Mobile App Redesign",
    description: "Revamp the user interface for better accessibility and modern design trends",
    color: "border-blue-400",
    bgColor: "bg-blue-50",
    position: { x: 120, y: 80 }
  },
  {
    id: 2,
    title: "AI Integration",
    description: "Explore machine learning capabilities for personalized user experiences",
    color: "border-purple-400",
    bgColor: "bg-purple-50",
    position: { x: 320, y: 200 }
  },
  {
    id: 3,
    title: "User Research Study",
    description: "Conduct interviews with key stakeholders and analyze user behavior patterns",
    color: "border-green-400",
    bgColor: "bg-green-50",
    position: { x: 480, y: 120 }
  },
  {
    id: 4,
    title: "Marketing Campaign",
    description: "Launch targeted social media strategy to increase brand awareness",
    color: "border-orange-400",
    bgColor: "bg-orange-50",
    position: { x: 240, y: 320 }
  },
  {
    id: 5,
    title: "Performance Optimization",
    description: "Improve loading times and reduce server response latency",
    color: "border-red-400",
    bgColor: "bg-red-50",
    position: { x: 520, y: 280 }
  },
  {
    id: 6,
    title: "Database Migration",
    description: "Migrate legacy systems to modern cloud infrastructure",
    color: "border-teal-400",
    bgColor: "bg-teal-50",
    position: { x: 360, y: 400 }
  }
];

const mockCategories = [
  { id: 1, name: "Product Ideas", count: 12, color: "bg-blue-100 text-blue-800" },
  { id: 2, name: "Marketing", count: 8, color: "bg-green-100 text-green-800" },
  { id: 3, name: "Engineering", count: 15, color: "bg-purple-100 text-purple-800" },
  { id: 4, name: "Design", count: 6, color: "bg-orange-100 text-orange-800" },
  { id: 5, name: "Research", count: 4, color: "bg-pink-100 text-pink-800" }
];

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
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNewIdeaDialogOpen, setIsNewIdeaDialogOpen] = useState(false);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleToggleTask = (taskId: number) => {
    // Mock functionality - would update task completion status
    console.log('Toggle task:', taskId);
  };

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
            <span className="text-sm text-gray-700">John Doe</span>
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
                      data-testid="textarea-idea-description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Category</label>
                    <select className="w-full p-2 border rounded-md" data-testid="select-idea-category">
                      <option>Product Ideas</option>
                      <option>Marketing</option>
                      <option>Engineering</option>
                      <option>Design</option>
                      <option>Research</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewIdeaDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsNewIdeaDialogOpen(false)} data-testid="button-save-idea">
                    Save Idea
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-2">
                {mockCategories.map((category) => (
                  <div 
                    key={category.id} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center space-x-2">
                      <Folder className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </div>
                    <Badge className={`text-xs ${category.color}`}>
                      {category.count}
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
              {mockIdeaCards.length} ideas • {mockTodoLists.reduce((acc, list) => acc + list.tasks.length, 0)} tasks
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

          {/* Canvas Content */}
          <div 
            className="absolute inset-0 p-8 overflow-auto"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / (zoomLevel / 100)}px`,
              height: `${10000 / (zoomLevel / 100)}px`
            }}
          >
            {/* Mock Idea Cards */}
            {mockIdeaCards.map((idea) => (
              <Card 
                key={idea.id}
                className={`absolute w-64 ${idea.bgColor} border-2 ${idea.color} shadow-md hover:shadow-lg transition-all cursor-move hover:scale-105`}
                style={{ 
                  left: idea.position.x, 
                  top: idea.position.y 
                }}
                data-testid={`idea-card-${idea.id}`}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    {idea.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {idea.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Idea
                    </Badge>
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Canvas Instructions */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Infinite Canvas</h3>
                <p className="text-sm text-gray-600">
                  Drag ideas around • Zoom to explore • Click cards to edit
                </p>
              </div>
            </div>
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
              className="w-full border-dashed"
              data-testid="button-new-list"
            >
              <Plus className="mr-2 w-4 h-4" />
              New List
            </Button>
          </div>
        </aside>

        {/* Sidebar Toggle Button (when collapsed) */}
        {!isRightSidebarOpen && (
          <Button
            className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 h-12 w-8 rounded-l-lg rounded-r-none bg-white border border-gray-200 shadow-md hover:bg-gray-50"
            onClick={() => setIsRightSidebarOpen(true)}
            data-testid="button-expand-sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}