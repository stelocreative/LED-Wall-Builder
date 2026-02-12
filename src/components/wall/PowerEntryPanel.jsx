import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Info } from 'lucide-react';

export default function PowerEntryPanel({ wall, onWallUpdate }) {
  const handleChange = (field, value) => {
    onWallUpdate({ [field]: value });
  };

  const getDefaultPowerEntry = () => {
    if (wall?.deployment_type === 'flown') return 'top';
    return 'bottom';
  };

  const currentEntry = wall?.power_entry_side || getDefaultPowerEntry();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Power Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Power Entry Side</Label>
          <Select 
            value={currentEntry} 
            onValueChange={(v) => handleChange('power_entry_side', v)}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom">Bottom (Ground Stack Default)</SelectItem>
              <SelectItem value="top">Top (Flown Default)</SelectItem>
              <SelectItem value="left">Left Side (SL)</SelectItem>
              <SelectItem value="right">Right Side (SR)</SelectItem>
              <SelectItem value="custom">Custom Entry Point</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-400 text-xs">Power Entry Notes</Label>
          <Textarea
            value={wall?.power_entry_notes || ''}
            onChange={(e) => handleChange('power_entry_notes', e.target.value)}
            placeholder="e.g., Socapex drops from overhead truss, breakout at SL, 50' tails..."
            className="bg-slate-700 border-slate-600 mt-1 min-h-[60px] text-white"
          />
        </div>

        <div className="p-3 bg-yellow-900/20 rounded border border-yellow-700/30 text-xs text-yellow-300">
          <Info className="w-4 h-4 inline mr-1" />
          {wall?.deployment_type === 'flown' 
            ? 'Flown walls typically use top entry (overhead distro)'
            : 'Ground stack typically uses bottom entry (floor distro)'}
        </div>
      </CardContent>
    </Card>
  );
}