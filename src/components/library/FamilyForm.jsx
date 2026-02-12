import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from 'lucide-react';

export default function FamilyForm({ family, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    manufacturer: '',
    family_name: '',
    pixel_pitch: 3.9,
    outdoor_rated: false,
    service_access: 'rear',
    rigging_notes: '',
    notes: '',
    ...family
  });

  useEffect(() => {
    if (family) {
      setFormData(prev => ({ ...prev, ...family }));
    }
  }, [family]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      pixel_pitch: Number(formData.pixel_pitch)
    });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          {family?.id ? 'Edit Panel Family' : 'Add Panel Family'}
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Manufacturer</Label>
            <Input 
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="e.g., Absen"
              className="bg-slate-700 border-slate-600"
            />
          </div>
          <div>
            <Label>Family Name</Label>
            <Input 
              value={formData.family_name}
              onChange={(e) => handleChange('family_name', e.target.value)}
              placeholder="e.g., PL3.9 Pro V2"
              className="bg-slate-700 border-slate-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Pixel Pitch (mm)</Label>
            <Input 
              type="number"
              step="0.1"
              value={formData.pixel_pitch}
              onChange={(e) => handleChange('pixel_pitch', e.target.value)}
              className="bg-slate-700 border-slate-600"
            />
          </div>
          <div>
            <Label>Service Access</Label>
            <Select 
              value={formData.service_access} 
              onValueChange={(v) => handleChange('service_access', v)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front">Front</SelectItem>
                <SelectItem value="rear">Rear</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch 
            checked={formData.outdoor_rated}
            onCheckedChange={(v) => handleChange('outdoor_rated', v)}
          />
          <Label>Outdoor Rated (IP65+)</Label>
        </div>

        <div>
          <Label>Rigging Notes</Label>
          <Textarea 
            value={formData.rigging_notes}
            onChange={(e) => handleChange('rigging_notes', e.target.value)}
            placeholder="Rigging specifications, max array height, etc."
            className="bg-slate-700 border-slate-600"
          />
        </div>

        <div>
          <Label>General Notes</Label>
          <Textarea 
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="bg-slate-700 border-slate-600"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Family
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}