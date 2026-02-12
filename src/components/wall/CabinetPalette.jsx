import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import CabinetCard from '../library/CabinetCard';

export default function CabinetPalette({ 
  cabinets, 
  families, 
  selectedCabinet, 
  onSelectCabinet,
  baseGridWidth = 500,
  baseGridHeight = 500
}) {
  const getGridSpan = (variant) => {
    const cols = Math.ceil(variant.width_mm / baseGridWidth);
    const rows = Math.ceil(variant.height_mm / baseGridHeight);
    return `${cols}×${rows}`;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm">Cabinet Palette</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-2">
            {cabinets.map(variant => {
              const family = families.find(f => f.id === variant.panel_family_id);
              return (
                <div
                  key={variant.id}
                  onClick={() => onSelectCabinet(variant.id === selectedCabinet ? null : variant.id)}
                  className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCabinet === variant.id 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">{variant.variant_name}</p>
                      <p className="text-xs text-slate-400">
                        {family?.manufacturer} {family?.family_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs mb-1">
                        {getGridSpan(variant)} grid
                      </Badge>
                      <p className="text-xs text-slate-500">
                        {variant.pixel_width}×{variant.pixel_height}px
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {cabinets.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">
                No cabinets in library. Add some in Cabinet Library.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}