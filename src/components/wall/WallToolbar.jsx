import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  MousePointer, 
  Plus, 
  Trash2, 
  Move, 
  Cable, 
  Zap,
  Tag,
  Ruler
} from 'lucide-react';

export default function WallToolbar({
  tool,
  onToolChange,
  showDataPaths,
  showPowerPaths,
  showLabels,
  showMeasurements,
  onToggleDataPaths,
  onTogglePowerPaths,
  onToggleLabels,
  onToggleMeasurements
}) {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'place', icon: Plus, label: 'Place' },
    { id: 'delete', icon: Trash2, label: 'Delete' },
    { id: 'pan', icon: Move, label: 'Pan' }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-lg">
      <div>
        <Label className="text-xs text-slate-400 mb-2 block">Tools</Label>
        <div className="grid grid-cols-2 gap-2">
          {tools.map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={tool === t.id ? 'default' : 'outline'}
              onClick={() => onToolChange(t.id)}
              className="flex flex-col gap-1 h-auto py-2"
            >
              <t.icon className="w-4 h-4" />
              <span className="text-[10px]">{t.label}</span>
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Data routing lives in the Data tab. Power assignment lives in the Power tab.
        </p>
      </div>

      <Separator className="bg-slate-700" />

      <div>
        <Label className="text-xs text-slate-400 mb-2 block">Visibility</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cable className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">Data Paths</span>
            </div>
            <Switch checked={showDataPaths} onCheckedChange={onToggleDataPaths} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-slate-300">Power Paths</span>
            </div>
            <Switch checked={showPowerPaths} onCheckedChange={onTogglePowerPaths} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Labels</span>
            </div>
            <Switch checked={showLabels} onCheckedChange={onToggleLabels} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-300">Measurements</span>
            </div>
            <Switch checked={showMeasurements} onCheckedChange={onToggleMeasurements} />
          </div>
        </div>
      </div>
    </div>
  );
}
