import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Cable, 
  Plus,
  Trash2,
  Wand2,
  ArrowRight
} from 'lucide-react';

export default function DataRunPanel({ 
  layout,
  cabinets,
  dataRuns = [],
  onDataRunsChange,
  gridCols,
  gridRows,
  wall
}) {
  const addRun = () => {
    const newRun = {
      id: `run-${Date.now()}`,
      label: `Run ${dataRuns.length + 1}`,
      path: [],
      processor_port: '',
      home_run_location: '',
      notes: ''
    };
    onDataRunsChange([...dataRuns, newRun]);
  };

  const removeRun = (id) => {
    onDataRunsChange(dataRuns.filter(r => r.id !== id));
  };

  const getPreferredStartEdge = () => {
    const rackLocation = wall?.rack_location || 'SL';
    const deploymentType = wall?.deployment_type || 'ground_stack';
    const fohHandoff = wall?.foh_handoff_location || 'SL';

    if (rackLocation === 'FOH') {
      // FOH with handoff location
      if (deploymentType === 'flown') {
        return fohHandoff === 'SL' ? 'SL top' : fohHandoff === 'SR' ? 'SR top' : 'Top center';
      }
      return fohHandoff === 'SL' ? 'SL bottom' : fohHandoff === 'SR' ? 'SR bottom' : 'Bottom center';
    }

    if (rackLocation === 'USC') {
      return deploymentType === 'flown' ? 'Top center' : 'Bottom center';
    }

    // SL or SR
    const side = rackLocation === 'SR' ? 'SR' : 'SL';
    return deploymentType === 'flown' ? `${side} top` : `${side} bottom`;
  };

  const autoSnake = () => {
    if (layout.length === 0) return;

    const preferredEdge = getPreferredStartEdge();
    
    // Sort layout by row then column for snake pattern
    const sorted = [...layout].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      // Alternate direction per row (snake)
      return a.row % 2 === 0 ? a.col - b.col : b.col - a.col;
    });

    const newRun = {
      id: `run-${Date.now()}`,
      label: 'Run 1',
      path: sorted.map(item => item.id),
      processor_port: 'Port 1',
      home_run_location: preferredEdge,
      notes: `Auto-generated snake pattern from ${preferredEdge}`
    };

    onDataRunsChange([newRun]);
  };

  const autoColumn = () => {
    if (layout.length === 0) return;

    const preferredEdge = getPreferredStartEdge();

    // Group by columns
    const columns = {};
    layout.forEach(item => {
      if (!columns[item.col]) columns[item.col] = [];
      columns[item.col].push(item);
    });

    // Get loom bundles if available
    const loomBundles = wall?.loom_bundles ? JSON.parse(wall.loom_bundles) : [];
    
    const runs = Object.entries(columns)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([col, items], idx) => {
        // Assign to loom based on column position
        let loomName = '';
        let portNum = idx + 1;
        
        if (loomBundles.length > 0) {
          // Simple assignment: distribute columns across looms
          const loomIdx = idx % loomBundles.length;
          const loom = loomBundles[loomIdx];
          loomName = loom.name;
          if (loom.assignedPorts && loom.assignedPorts.length > 0) {
            portNum = loom.assignedPorts[0] + Math.floor(idx / loomBundles.length);
          }
        }

        return {
          id: `run-${Date.now()}-${idx}`,
          label: `Run ${idx + 1}`,
          path: items.sort((a, b) => a.row - b.row).map(item => item.id),
          processor_port: `Port ${portNum}`,
          loom: loomName,
          home_run_location: preferredEdge,
          notes: `Column ${Number(col) + 1}${loomName ? ` (${loomName})` : ''}`
        };
      });

    onDataRunsChange(runs);
  };

  const totalJumpers = dataRuns.reduce((acc, run) => {
    return acc + Math.max(0, (run.path?.length || 0) - 1);
  }, 0);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Cable className="w-5 h-5 text-blue-400" />
          Data Runs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-slate-700/50 rounded">
            <p className="text-xs text-slate-400">Runs</p>
            <p className="text-lg font-bold text-white">{dataRuns.length}</p>
          </div>
          <div className="p-2 bg-slate-700/50 rounded">
            <p className="text-xs text-slate-400">Jumpers</p>
            <p className="text-lg font-bold text-white">{totalJumpers}</p>
          </div>
          <div className="p-2 bg-slate-700/50 rounded">
            <p className="text-xs text-slate-400">Home Runs</p>
            <p className="text-lg font-bold text-white">{dataRuns.length}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={addRun} className="flex-1 bg-slate-700 hover:bg-slate-600">
            <Plus className="w-4 h-4 mr-1" /> Add Run
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" onClick={autoSnake} variant="outline" className="flex-1 gap-1">
            <Wand2 className="w-4 h-4" /> Snake
          </Button>
          <Button size="sm" onClick={autoColumn} variant="outline" className="flex-1 gap-1">
            <Wand2 className="w-4 h-4" /> Columns
          </Button>
        </div>

        <Separator className="bg-slate-700" />

        {/* Run List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dataRuns.map((run, idx) => (
            <div key={run.id} className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-white">{run.label}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => removeRun(run.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Badge variant="outline" className="text-xs">
                  {run.path?.length || 0} panels
                </Badge>
                <ArrowRight className="w-3 h-3" />
                <span>{run.processor_port || 'Unassigned'}</span>
                {run.home_run_location && (
                  <>
                    <span>•</span>
                    <span>Drop: {run.home_run_location}</span>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {dataRuns.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">
              No data runs defined. Use "Snake" or "Columns" for auto-routing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}