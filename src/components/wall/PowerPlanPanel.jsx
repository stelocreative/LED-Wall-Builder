import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Trash2,
  Wand2
} from 'lucide-react';

const POWER_STRATEGIES = {
  edison_20a: { name: '20A Edison', maxAmps: 20, circuits: 'individual' },
  l21_30: { name: 'L21-30 30A', maxAmps: 30, circuits: 'individual' },
  socapex: { name: 'Socapex', maxAmps: 20, circuits: 6, perTail: true },
  camlock: { name: 'Camlock Distro', maxAmps: 100, circuits: 'distro' },
};

export default function PowerPlanPanel({ 
  wall,
  layout,
  cabinets,
  powerPlan = [],
  onPowerPlanChange,
  onStrategyChange,
  activeCircuitId = null,
  onActiveCircuitChange
}) {
  const voltage = wall?.voltage_mode === '120v' ? 120 : 208;
  const strategy = POWER_STRATEGIES[wall?.power_strategy || 'edison_20a'];

  const calculateCircuitLoad = (circuit) => {
    let totalWatts = { min: 0, typical: 0, max: 0, peak: 0 };
    
    (circuit.cabinet_ids || []).forEach(cabId => {
      const layoutItem = layout.find(l => l.id === cabId);
      if (!layoutItem) return;
      const variant = cabinets.find(c => c.id === layoutItem.cabinet_id);
      if (!variant) return;
      
      totalWatts.min += variant.power_min_w || 0;
      totalWatts.typical += variant.power_typical_w || 0;
      totalWatts.max += variant.power_max_w || 0;
      totalWatts.peak += variant.power_peak_w || (variant.power_max_w * (variant.peak_factor || 1.2));
    });

    return {
      watts: totalWatts,
      amps: {
        min: totalWatts.min / voltage,
        typical: totalWatts.typical / voltage,
        max: totalWatts.max / voltage,
        peak: totalWatts.peak / voltage
      }
    };
  };

  const getLoadStatus = (amps) => {
    const maxAmps = strategy.maxAmps;
    const percent = (amps / maxAmps) * 100;
    if (percent > 100) return { status: 'overload', color: 'bg-red-500', text: 'OVERLOAD' };
    if (percent > 80) return { status: 'warning', color: 'bg-amber-500', text: 'Warning' };
    return { status: 'ok', color: 'bg-emerald-500', text: 'OK' };
  };

  const addCircuit = () => {
    const newCircuit = {
      id: `circuit-${Date.now()}`,
      label: `Circuit ${powerPlan.length + 1}`,
      cabinet_ids: [],
      drop_location: '',
      distro_type: '',
      notes: ''
    };
    onPowerPlanChange([...powerPlan, newCircuit]);
    onActiveCircuitChange?.(newCircuit.id);
  };

  const removeCircuit = (id) => {
    onPowerPlanChange(powerPlan.filter(c => c.id !== id));
    if (activeCircuitId === id) {
      onActiveCircuitChange?.(null);
    }
  };

  const clearAllCircuits = () => {
    if (!powerPlan.length) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Clear all power circuits? This removes all circuit assignments.');
      if (!confirmed) return;
    }
    onPowerPlanChange([]);
    onActiveCircuitChange?.(null);
  };

  const getPowerOrderedLayout = (entrySide) => {
    const rackLocation = wall?.rack_location || 'SL';
    const preferLeftToRight = rackLocation !== 'SR';
    const preferTopToBottom = wall?.deployment_type === 'flown';
    const byCol = {};
    const byRow = {};

    layout.forEach((item) => {
      if (!byCol[item.col]) byCol[item.col] = [];
      if (!byRow[item.row]) byRow[item.row] = [];
      byCol[item.col].push(item);
      byRow[item.row].push(item);
    });

    const sortedCols = Object.keys(byCol)
      .map(Number)
      .sort((a, b) => (preferLeftToRight ? a - b : b - a));
    const sortedRows = Object.keys(byRow)
      .map(Number)
      .sort((a, b) => (preferTopToBottom ? a - b : b - a));

    const ordered = [];

    if (entrySide === 'top' || entrySide === 'bottom') {
      const rowCompare = entrySide === 'top' ? (a, b) => a.row - b.row : (a, b) => b.row - a.row;
      sortedCols.forEach((col) => {
        const colItems = [...byCol[col]].sort((a, b) => rowCompare(a, b));
        ordered.push(...colItems);
      });
      return ordered;
    }

    if (entrySide === 'left' || entrySide === 'right') {
      const colCompare = entrySide === 'left' ? (a, b) => a.col - b.col : (a, b) => b.col - a.col;
      sortedRows.forEach((row) => {
        const rowItems = [...byRow[row]].sort((a, b) => colCompare(a, b));
        ordered.push(...rowItems);
      });
      return ordered;
    }

    // Custom: fallback to deployment-aware row-first ordering.
    sortedRows.forEach((row) => {
      const rowItems = [...byRow[row]].sort((a, b) => (preferLeftToRight ? a.col - b.col : b.col - a.col));
      ordered.push(...rowItems);
    });
    return ordered;
  };

  const autoAssign = () => {
    if (layout.length === 0) return;
    
    const variant = cabinets.find(c => c.id === layout[0]?.cabinet_id);
    if (!variant) return;

    const cabinetsPerCircuit = wall?.voltage_mode === '120v' 
      ? variant.cabinets_per_20a_120v || 8
      : variant.cabinets_per_20a_208v || 14;

    const powerEntry = wall?.power_entry_side || (wall?.deployment_type === 'flown' ? 'top' : 'bottom');
    const orderedLayout = getPowerOrderedLayout(powerEntry);

    const newCircuits = [];
    let currentCircuit = { 
      id: `circuit-${Date.now()}`, 
      label: 'Circuit 1', 
      cabinet_ids: [],
      drop_location: powerEntry,
      distro_type: strategy.perTail ? 'Socapex breakout' : 'Edison tree',
      notes: `Auto ${powerEntry}-entry grouping`
    };

    orderedLayout.forEach((item, idx) => {
      currentCircuit.cabinet_ids.push(item.id);
      
      if (currentCircuit.cabinet_ids.length >= cabinetsPerCircuit || idx === orderedLayout.length - 1) {
        newCircuits.push(currentCircuit);
        if (idx < orderedLayout.length - 1) {
          currentCircuit = {
            id: `circuit-${Date.now()}-${idx}`,
            label: `Circuit ${newCircuits.length + 1}`,
            cabinet_ids: [],
            drop_location: powerEntry,
            distro_type: strategy.perTail ? 'Socapex breakout' : 'Edison tree',
            notes: `Auto ${powerEntry}-entry grouping`
          };
        }
      }
    });

    onPowerPlanChange(newCircuits);
  };

  const totalLoad = powerPlan.reduce((acc, circuit) => {
    const load = calculateCircuitLoad(circuit);
    return {
      min: acc.min + load.watts.min,
      typical: acc.typical + load.watts.typical,
      max: acc.max + load.watts.max,
      peak: acc.peak + load.watts.peak
    };
  }, { min: 0, typical: 0, max: 0, peak: 0 });

  const socapexTails = strategy.perTail ? Math.ceil(powerPlan.length / 6) : 0;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Power Plan
          </CardTitle>
          <Badge className={wall?.voltage_mode === '120v' ? 'bg-amber-600' : 'bg-blue-600'}>
            {voltage}V
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy Selection */}
        <div>
          <Label className="text-slate-400 text-xs">Power Strategy</Label>
          <Select 
            value={wall?.power_strategy || 'edison_20a'} 
            onValueChange={onStrategyChange}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POWER_STRATEGIES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Total Summary */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-400 mb-2">Total Power Draw @ {voltage}V</p>
          <div className="grid grid-cols-4 gap-1 text-xs text-center">
            <div>
              <p className="text-slate-500">Min</p>
              <p className="text-white font-medium">{totalLoad.min}W</p>
              <p className="text-slate-400">{(totalLoad.min/voltage).toFixed(1)}A</p>
            </div>
            <div>
              <p className="text-slate-500">Typ</p>
              <p className="text-white font-medium">{totalLoad.typical}W</p>
              <p className="text-slate-400">{(totalLoad.typical/voltage).toFixed(1)}A</p>
            </div>
            <div>
              <p className="text-slate-500">Max</p>
              <p className="text-white font-medium">{totalLoad.max}W</p>
              <p className="text-slate-400">{(totalLoad.max/voltage).toFixed(1)}A</p>
            </div>
            <div className="text-red-400">
              <p className="text-red-500/70">Peak</p>
              <p className="font-medium">{Math.round(totalLoad.peak)}W</p>
              <p>{(totalLoad.peak/voltage).toFixed(1)}A</p>
            </div>
          </div>
        </div>

        {strategy.perTail && (
          <div className="p-2 bg-blue-900/30 rounded border border-blue-700/50 text-xs">
            <p className="text-blue-300">
              Socapex tails needed: <span className="font-bold">{socapexTails}</span>
            </p>
            <p className="text-blue-400/70">
              ({powerPlan.length} circuits across {socapexTails} × 6-circuit tails)
            </p>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Button size="sm" onClick={addCircuit} className="bg-slate-700 hover:bg-slate-600">
            <Plus className="w-4 h-4 mr-1" /> Add Circuit
          </Button>
          <Button size="sm" onClick={autoAssign} variant="outline" className="gap-1">
            <Wand2 className="w-4 h-4" /> Auto
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={clearAllCircuits}
            disabled={!powerPlan.length}
            title="Clear all circuits"
            className="border-red-700/70 text-red-300 hover:bg-red-900/30 hover:text-red-200"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className={`rounded-md border px-3 py-2 text-xs ${activeCircuitId ? 'border-orange-500/70 bg-orange-900/20 text-orange-100' : 'border-slate-700 bg-slate-900/30 text-slate-300'}`}>
          {activeCircuitId
            ? 'Circuit assignment active: click cabinets on the canvas to add/remove them from this circuit.'
            : 'Tip: click Add Circuit, then click cabinets on the canvas to assign power manually.'}
        </div>

        <Separator className="bg-slate-700" />

        {/* Circuit List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {powerPlan.map((circuit, idx) => {
            const load = calculateCircuitLoad(circuit);
            const status = getLoadStatus(load.amps.typical);
            const isActive = activeCircuitId === circuit.id;
            
            return (
              <div
                key={circuit.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'ring-1 ring-orange-400 bg-orange-900/20' : 'bg-slate-700/30 hover:bg-slate-700/50'}`}
                onClick={() => onActiveCircuitChange?.(isActive ? null : circuit.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{circuit.label}</span>
                    {isActive && (
                      <Badge className="bg-orange-600 text-[10px]">Assigning</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {circuit.cabinet_ids?.length || 0} panels
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.status === 'overload' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {status.status === 'ok' && (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeCircuit(circuit.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="space-y-0.5 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Min: {load.watts.min}W</span>
                      <span>{load.amps.min.toFixed(1)}A</span>
                    </div>
                    <div className="flex justify-between font-medium text-white">
                      <span>Typ: {load.watts.typical}W</span>
                      <span>{load.amps.typical.toFixed(1)}A</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max: {load.watts.max}W</span>
                      <span>{load.amps.max.toFixed(1)}A</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Peak: {Math.round(load.watts.peak)}W</span>
                      <span>{load.amps.peak.toFixed(1)}A</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={`${status.status === 'overload' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {status.text}
                    </span>
                    <span className="text-slate-500">{strategy.maxAmps}A max</span>
                  </div>
                  <Progress 
                    value={Math.min((load.amps.typical / strategy.maxAmps) * 100, 100)} 
                    className={`h-1.5 ${status.status === 'overload' ? '[&>div]:bg-red-500' : status.status === 'warning' ? '[&>div]:bg-amber-500' : ''}`}
                  />
                  {circuit.drop_location && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Drop: {circuit.drop_location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {powerPlan.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">
              No circuits defined. Click "Add Circuit" or "Auto" to start.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
