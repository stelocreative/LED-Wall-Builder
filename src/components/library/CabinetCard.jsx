import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Weight, Grid3X3, Ruler } from 'lucide-react';

export default function CabinetCard({ variant, family, selected, onClick, compact = false, builtIn = false }) {
  const mmToInches = (mm) => (mm / 25.4).toFixed(1);
  const kgToLbs = (kg) => (kg * 2.205).toFixed(1);

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
          selected 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-white text-sm">{variant.variant_name}</p>
            <p className="text-xs text-slate-400">{family?.manufacturer} {family?.family_name}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {variant.pixel_width}×{variant.pixel_height}px
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card 
      onClick={onClick}
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected 
          ? 'ring-2 ring-blue-500 bg-slate-800' 
          : 'bg-slate-800/50 hover:bg-slate-800'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-white">{family?.manufacturer}</h3>
            <p className="text-sm text-slate-300">{family?.family_name} - {variant.variant_name}</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="bg-emerald-600">{family?.pixel_pitch}mm</Badge>
            {builtIn ? <Badge className="bg-indigo-600">Built-in</Badge> : null}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Ruler className="w-4 h-4 text-blue-400" />
            <span>{variant.width_mm}×{variant.height_mm}mm</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>({mmToInches(variant.width_mm)}×{mmToInches(variant.height_mm)}")</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Grid3X3 className="w-4 h-4 text-purple-400" />
            <span>{variant.pixel_width}×{variant.pixel_height}px</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Weight className="w-4 h-4 text-orange-400" />
            <span>{variant.weight_kg}kg ({kgToLbs(variant.weight_kg)}lbs)</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-400">Power Profile (Watts)</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-xs">
            <div className="text-center p-1 bg-slate-700/50 rounded">
              <p className="text-slate-500">Min</p>
              <p className="text-slate-200">{variant.power_min_w || '-'}</p>
            </div>
            <div className="text-center p-1 bg-slate-700/50 rounded">
              <p className="text-slate-500">Typ</p>
              <p className="text-slate-200">{variant.power_typical_w}</p>
            </div>
            <div className="text-center p-1 bg-slate-700/50 rounded">
              <p className="text-slate-500">Max</p>
              <p className="text-slate-200">{variant.power_max_w || '-'}</p>
            </div>
            <div className="text-center p-1 bg-slate-700/50 rounded">
              <p className="text-slate-500">Peak</p>
              <p className="text-slate-200">{variant.power_peak_w || '-'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
