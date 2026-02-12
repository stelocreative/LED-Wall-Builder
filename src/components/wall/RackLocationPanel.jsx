import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, MapPin } from 'lucide-react';

export default function RackLocationPanel({ wall, onWallUpdate }) {
  const handleChange = (field, value) => {
    onWallUpdate({ [field]: value });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-400" />
          Rack & Cable Origin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Rack Location *</Label>
          <Select 
            value={wall?.rack_location || 'SL'} 
            onValueChange={(v) => handleChange('rack_location', v)}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SL">Stage Left (SL)</SelectItem>
              <SelectItem value="SR">Stage Right (SR)</SelectItem>
              <SelectItem value="USC">Upstage Center (USC)</SelectItem>
              <SelectItem value="FOH">Front of House (FOH)</SelectItem>
              <SelectItem value="Custom">Custom Location</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {wall?.rack_location === 'Custom' && (
          <div>
            <Label className="text-slate-400 text-xs">Custom Location Name</Label>
            <Input
              value={wall?.custom_rack_location || ''}
              onChange={(e) => handleChange('custom_rack_location', e.target.value)}
              placeholder="e.g., DSL behind PA wing"
              className="bg-slate-700 border-slate-600 mt-1 text-white"
            />
          </div>
        )}

        {wall?.rack_location === 'FOH' && (
          <div>
            <Label className="text-slate-400 text-xs">Stage Handoff Point</Label>
            <Select 
              value={wall?.foh_handoff_location || 'SL'} 
              onValueChange={(v) => handleChange('foh_handoff_location', v)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SL">Stage Left</SelectItem>
                <SelectItem value="SR">Stage Right</SelectItem>
                <SelectItem value="USC">Upstage Center</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Fiber from FOH breaks out at this location
            </p>
          </div>
        )}

        <div>
          <Label className="text-slate-400 text-xs">Rack Notes</Label>
          <Textarea
            value={wall?.rack_notes || ''}
            onChange={(e) => handleChange('rack_notes', e.target.value)}
            placeholder="e.g., Processor rack behind SL legs, fiber run from FOH to SL breakout..."
            className="bg-slate-700 border-slate-600 mt-1 min-h-[80px] text-white"
          />
        </div>

        <div className="p-3 bg-blue-900/20 rounded border border-blue-700/30 text-xs text-blue-300">
          <MapPin className="w-4 h-4 inline mr-1" />
          Data runs will originate from this location by default
        </div>
      </CardContent>
    </Card>
  );
}