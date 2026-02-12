import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Wand2 } from 'lucide-react';
import {
  readFavoriteCabinetIds,
  subscribeFavoriteCabinetIds,
  sortCabinetsByFavorites,
  isCabinetFavorite
} from '@/lib/cabinet-favorites';

export default function CabinetPalette({ 
  cabinets, 
  families, 
  selectedCabinet, 
  onSelectCabinet,
  onAutoPlace,
  baseGridWidth = 500,
  baseGridHeight = 500
}) {
  const getGridSpan = (variant) => {
    const cols = Math.ceil(variant.width_mm / baseGridWidth);
    const rows = Math.ceil(variant.height_mm / baseGridHeight);
    return `${cols}×${rows}`;
  };

  const [favoriteCabinetIds, setFavoriteCabinetIds] = useState(() => readFavoriteCabinetIds());

  useEffect(() => {
    return subscribeFavoriteCabinetIds((ids) => setFavoriteCabinetIds(ids));
  }, []);

  const sortedCabinets = useMemo(
    () => sortCabinetsByFavorites(cabinets, favoriteCabinetIds),
    [cabinets, favoriteCabinetIds]
  );

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-white text-sm">Cabinet Palette</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoPlace}
            disabled={!selectedCabinet}
            className="h-8 border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <Wand2 className="w-3 h-3 mr-1.5" />
            Auto Place
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Favorites are pinned first. Select a cabinet, then auto-fill all open spots that physically fit that size.
        </p>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-2">
            {sortedCabinets.map(variant => {
              const family = families.find(f => f.id === variant.panel_family_id);
              const favorite = isCabinetFavorite(variant.id, favoriteCabinetIds);
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
                      <p className="font-medium text-white text-sm flex items-center gap-1.5">
                        {favorite ? <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> : null}
                        <span>{variant.variant_name}</span>
                      </p>
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
            {sortedCabinets.length === 0 && (
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
