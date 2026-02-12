import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cable, Plus, Trash2, Package } from 'lucide-react';

const LOOM_PRESETS = {
  '2_loom_sl_sr': {
    name: '2 Looms: SL/SR',
    looms: [
      { name: 'Loom A (SL)', assignedPorts: [1, 2, 3, 4], origin: 'SL bottom', notes: '' },
      { name: 'Loom B (SR)', assignedPorts: [5, 6, 7, 8], origin: 'SR bottom', notes: '' }
    ]
  },
  '1_loom_sl': {
    name: '1 Loom: SL Only',
    looms: [
      { name: 'Main Loom (SL)', assignedPorts: [1, 2, 3, 4, 5, 6, 7, 8], origin: 'SL bottom', notes: '' }
    ]
  },
  '3_loom_sl_sr_top': {
    name: '3 Looms: SL/SR/Top',
    looms: [
      { name: 'Loom A (SL)', assignedPorts: [1, 2, 3], origin: 'SL bottom', notes: '' },
      { name: 'Loom B (SR)', assignedPorts: [4, 5, 6], origin: 'SR bottom', notes: '' },
      { name: 'Loom C (Top)', assignedPorts: [7, 8], origin: 'Top truss', notes: '' }
    ]
  },
  'custom': { name: 'Custom', looms: [] }
};

function parseLoomBundlesSafe(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function LoomBundlePanel({ wall, onWallUpdate }) {
  const loomBundles = parseLoomBundlesSafe(wall?.loom_bundles);
  const [editingLoom, setEditingLoom] = useState(null);

  const applyPreset = (presetKey) => {
    const preset = LOOM_PRESETS[presetKey];
    if (preset && preset.looms) {
      onWallUpdate({
        loom_strategy: presetKey,
        loom_bundles: JSON.stringify(preset.looms)
      });
    } else {
      onWallUpdate({ loom_strategy: presetKey });
    }
  };

  const addLoom = () => {
    const newLoom = {
      id: `loom-${Date.now()}`,
      name: `Loom ${loomBundles.length + 1}`,
      assignedPorts: [],
      origin: 'SL bottom',
      notes: ''
    };
    onWallUpdate({
      loom_bundles: JSON.stringify([...loomBundles, newLoom]),
      loom_strategy: 'custom'
    });
  };

  const removeLoom = (id) => {
    onWallUpdate({
      loom_bundles: JSON.stringify(loomBundles.filter(l => l.id !== id))
    });
  };

  const updateLoom = (id, updates) => {
    const updated = loomBundles.map(l => l.id === id ? { ...l, ...updates } : l);
    onWallUpdate({ loom_bundles: JSON.stringify(updated) });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-400" />
          Loom Bundles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Loom Strategy</Label>
          <Select 
            value={wall?.loom_strategy || '2_loom_sl_sr'} 
            onValueChange={applyPreset}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOOM_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>{preset.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {wall?.loom_strategy === 'custom' && (
          <Button size="sm" onClick={addLoom} className="w-full bg-slate-700 hover:bg-slate-600">
            <Plus className="w-4 h-4 mr-1" /> Add Loom
          </Button>
        )}

        <Separator className="bg-slate-700" />

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loomBundles.map((loom, idx) => (
            <div key={loom.id || idx} className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Input
                  value={loom.name}
                  onChange={(e) => updateLoom(loom.id, { name: e.target.value })}
                  className="flex-1 bg-slate-700 border-slate-600 text-white text-sm font-medium"
                  disabled={wall?.loom_strategy !== 'custom'}
                />
                {wall?.loom_strategy === 'custom' && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 ml-2"
                    onClick={() => removeLoom(loom.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-slate-500 text-xs">Assigned Ports</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {loom.assignedPorts?.map(port => (
                      <Badge key={port} variant="outline" className="text-xs">
                        Port {port}
                      </Badge>
                    )) || <span className="text-xs text-slate-500">None</span>}
                  </div>
                </div>
                
                <div>
                  <Label className="text-slate-500 text-xs">Origin Point</Label>
                  <Input
                    value={loom.origin}
                    onChange={(e) => updateLoom(loom.id, { origin: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white text-xs mt-1"
                    placeholder="e.g., SL bottom, SR top truss"
                    disabled={wall?.loom_strategy !== 'custom'}
                  />
                </div>
                
                {loom.notes && (
                  <div>
                    <Label className="text-slate-500 text-xs">Notes</Label>
                    <p className="text-xs text-slate-400 mt-1">{loom.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loomBundles.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">
              Select a loom strategy or create custom looms
            </p>
          )}
        </div>

        <div className="p-2 bg-indigo-900/20 rounded border border-indigo-700/30 text-xs text-indigo-300">
          <Cable className="w-4 h-4 inline mr-1" />
          Looms group processor ports for cleaner cable pulls
        </div>
      </CardContent>
    </Card>
  );
}
