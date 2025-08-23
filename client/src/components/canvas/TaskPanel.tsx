import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Target,
  Wand2,
  Filter,
  SortDesc,
  MoreVertical
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@shared/schema";

interface TaskPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  tasks: Task[];
  isLoading?: boolean;
  onTaskToggle: (taskId: string, isCompleted: boolean) => void;
  onAddTask: () => void;
  onConvertToTasks?: () => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  className?: string;
}

export default function TaskPanel({
  isOpen,
  onToggle,
  tasks,
  isLoading = false,
  onTaskToggle,
  onAddTask,
  onConvertToTasks,
  onDeleteTask,
  onEditTask,
  className = ""
}: TaskPanelProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'status'>('created');

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs">Normal</Badge>;
    }
  };

  const getStatusBadge = (task: Task) => {
    if (task.isCompleted) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Completed</Badge>;
    }
    return getPriorityBadge(task.priority);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.isCompleted;
    if (filter === 'completed') return task.isCompleted;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      case 'status':
        return Number(a.isCompleted) - Number(b.isCompleted);
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <aside className={`w-80 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-80'
    } ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900" data-testid="text-panel-title">
            Tasks ({tasks.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            data-testid="button-toggle-panel"
          >
            {isOpen ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-gray-900" data-testid="text-progress">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-filter">
                <Filter className="w-3 h-3 mr-1" />
                {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Completed'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('pending')}>
                Pending Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('completed')}>
                Completed Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-sort">
                <SortDesc className="w-3 h-3 mr-1" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('created')}>
                By Date Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('priority')}>
                By Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('status')}>
                By Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground text-sm">Loading tasks...</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-4">
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </p>
            {filter === 'all' && onConvertToTasks && (
              <Button
                size="sm"
                onClick={onConvertToTasks}
                data-testid="button-generate-tasks"
              >
                <Wand2 className="mr-2 w-4 h-4" />
                Generate Tasks
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task: Task) => (
              <Card 
                key={task.id} 
                className="bg-gray-50 hover:bg-gray-100 transition-colors border-0"
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={task.isCompleted || false}
                      onCheckedChange={(checked) => onTaskToggle(task.id, !!checked)}
                      className="mt-1"
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium text-gray-900 ${
                            task.isCompleted ? 'line-through opacity-60' : ''
                          }`} data-testid={`text-task-title-${task.id}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className={`text-xs text-muted-foreground mt-1 ${
                              task.isCompleted ? 'opacity-60' : ''
                            }`} data-testid={`text-task-description-${task.id}`}>
                              {task.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              data-testid={`button-task-menu-${task.id}`}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {onEditTask && (
                              <DropdownMenuItem onClick={() => onEditTask(task.id)}>
                                Edit Task
                              </DropdownMenuItem>
                            )}
                            {onDeleteTask && (
                              <DropdownMenuItem 
                                onClick={() => onDeleteTask(task.id)}
                                className="text-red-600"
                              >
                                Delete Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        {getStatusBadge(task)}
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

        {/* Add Task Button */}
        <Button
          variant="outline"
          className="w-full mt-4 border-dashed"
          onClick={onAddTask}
          data-testid="button-add-task"
        >
          <Plus className="mr-2 w-4 h-4" />
          Add Custom Task
        </Button>
      </div>
    </aside>
  );
}
