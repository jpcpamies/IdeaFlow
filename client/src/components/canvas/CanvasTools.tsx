import { Button } from "@/components/ui/button";
import { 
  MousePointer, 
  Pen, 
  Shapes, 
  Type, 
  StickyNote,
  Eraser,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw
} from "lucide-react";

export type CanvasTool = 'select' | 'pen' | 'shapes' | 'text' | 'sticky' | 'eraser' | 'move';

interface CanvasToolsProps {
  selectedTool: CanvasTool;
  onToolSelect: (tool: CanvasTool) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
}

export default function CanvasTools({
  selectedTool,
  onToolSelect,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  className = ""
}: CanvasToolsProps) {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select' },
    { id: 'pen' as const, icon: Pen, label: 'Pen' },
    { id: 'shapes' as const, icon: Shapes, label: 'Shapes' },
    { id: 'text' as const, icon: Type, label: 'Text' },
    { id: 'sticky' as const, icon: StickyNote, label: 'Sticky Note' },
    { id: 'eraser' as const, icon: Eraser, label: 'Eraser' },
    { id: 'move' as const, icon: Move, label: 'Move' },
  ];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Main Tools */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolSelect(tool.id)}
              className="relative"
              data-testid={`button-tool-${tool.id}`}
              title={tool.label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>

      {/* Zoom and Action Tools */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          data-testid="button-zoom-out"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          data-testid="button-zoom-in"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Undo/Redo Tools */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          data-testid="button-undo"
          title="Undo"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          data-testid="button-redo"
          title="Redo"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
