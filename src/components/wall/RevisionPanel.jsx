import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from 'lucide-react';

export default function RevisionPanel({ wall, onWallUpdate }) {
  const handleChange = (field, value) => {
    onWallUpdate({ [field]: value });
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          Revision Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-400 text-xs">Revision</Label>
          <Input
            value={wall?.revision || 'A'}
            onChange={(e) => handleChange('revision', e.target.value)}
            placeholder="A, B, C..."
            className="bg-slate-700 border-slate-600 mt-1 text-white"
            maxLength={10}
          />
          <p className="text-xs text-slate-500 mt-1">
            Typically a letter (A, B, C) or version number
          </p>
        </div>

        <div>
          <Label className="text-slate-400 text-xs">Revision Notes</Label>
          <Textarea
            value={wall?.revision_notes || ''}
            onChange={(e) => handleChange('revision_notes', e.target.value)}
            placeholder="What changed in this revision? e.g., Added 2 more columns, changed power from 120V to 208V..."
            className="bg-slate-700 border-slate-600 mt-1 min-h-[80px] text-white"
          />
        </div>
      </CardContent>
    </Card>
  );
}