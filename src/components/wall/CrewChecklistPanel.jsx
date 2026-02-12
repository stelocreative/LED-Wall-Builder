import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';

export default function CrewChecklistPanel({ wall, onWallUpdate }) {
  const checklist = wall?.crew_checklist ? JSON.parse(wall.crew_checklist) : getDefaultChecklist(wall?.deployment_type);
  
  function getDefaultChecklist(deploymentType) {
    const baseItems = [
      { id: 'power-distro', text: 'Power distro verified and grounded', checked: false },
      { id: 'controller', text: 'Controller/processor configured and tested', checked: false },
      { id: 'spare-count', text: 'Spare cabinets counted and labeled', checked: false },
      { id: 'data-jumpers', text: 'Data jumpers inspected and ready', checked: false },
      { id: 'power-jumpers', text: 'Power jumpers inspected and ready', checked: false }
    ];

    if (deploymentType === 'flown') {
      return [
        { id: 'rigging-cert', text: 'Rigging hardware certified and inspected', checked: false },
        { id: 'weight-check', text: 'Total weight verified against trim capacity', checked: false },
        { id: 'truss-inspect', text: 'Truss and motors inspected', checked: false },
        ...baseItems,
        { id: 'safety-cables', text: 'Safety cables installed on all panels', checked: false }
      ];
    } else {
      return [
        { id: 'ground-support', text: 'Ground support/base inspected and leveled', checked: false },
        { id: 'stability', text: 'Wall stability and bracing checked', checked: false },
        ...baseItems
      ];
    }
  }

  const updateChecklist = (newChecklist) => {
    onWallUpdate({ crew_checklist: JSON.stringify(newChecklist) });
  };

  const toggleItem = (id) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    updateChecklist(updated);
  };

  const addItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      text: 'New checklist item',
      checked: false
    };
    updateChecklist([...checklist, newItem]);
  };

  const removeItem = (id) => {
    updateChecklist(checklist.filter(item => item.id !== id));
  };

  const updateItemText = (id, text) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, text } : item
    );
    updateChecklist(updated);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-400" />
            Crew Checklist
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-start gap-2 p-2 bg-slate-700/30 rounded group">
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-1"
            />
            <Input
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              className="flex-1 bg-slate-700 border-slate-600 text-white text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {checklist.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-4">
            No checklist items. Click "Add Item" to start.
          </p>
        )}
      </CardContent>
    </Card>
  );
}