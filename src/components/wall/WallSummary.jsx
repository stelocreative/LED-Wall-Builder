import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Weight, 
  Grid3X3, 
  Ruler, 
  Monitor,
  Gauge
} from 'lucide-react';

export default function WallSummary({ 
  wall, 
  layout, 
  cabinets, 
  families,
  baseGridWidth = 500,
  baseGridHeight = 500,
  gridCols,
  gridRows
}) {
  const mmToM = (mm) => (mm / 1000).toFixed(2);
  const mmToFt = (mm) => (mm / 304.8).toFixed(2);
  const kgToLbs = (kg) => (kg * 2.205).toFixed(1);

  const voltage = wall?.voltage_mode === '120v' ? 120 : 208;

  // Calculate totals
  const calculateTotals = () => {
    let totalWeight = 0;
    let totalPixelsW = 0;
    let totalPixelsH = 0;
    let powerMin = 0;
    let powerTypical = 0;
    let powerMax = 0;
    let powerPeak = 0;
    const cabinetCounts = {};

    // Build a 2D grid to track actual dimensions
    const grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
    
    layout.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (!variant) return;

      const family = families.find(f => f.id === variant.panel_family_id);
      const key = `${family?.manufacturer || 'Unknown'} ${family?.family_name || ''} ${variant.variant_name}`;
      cabinetCounts[key] = (cabinetCounts[key] || 0) + 1;

      totalWeight += variant.weight_kg || 0;
      powerMin += variant.power_min_w || 0;
      powerTypical += variant.power_typical_w || 0;
      powerMax += variant.power_max_w || 0;
      powerPeak += variant.power_peak_w || (variant.power_max_w * (variant.peak_factor || 1.2)) || 0;

      // Mark grid cells
      const spanCols = Math.ceil(variant.width_mm / baseGridWidth);
      const spanRows = Math.ceil(variant.height_mm / baseGridHeight);
      for (let r = item.row; r < item.row + spanRows && r < gridRows; r++) {
        for (let c = item.col; c < item.col + spanCols && c < gridCols; c++) {
          grid[r][c] = item.id;
        }
      }
    });

    // Calculate pixel resolution based on grid
    let maxCol = 0;
    let maxRow = 0;
    layout.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (!variant) return;
      const spanCols = Math.ceil(variant.width_mm / baseGridWidth);
      const spanRows = Math.ceil(variant.height_mm / baseGridHeight);
      maxCol = Math.max(maxCol, item.col + spanCols);
      maxRow = Math.max(maxRow, item.row + spanRows);
    });

    // Sum pixels per column and row (simplified - assumes uniform pixel density)
    let pixelWidth = 0;
    let pixelHeight = 0;
    
    // Get pixels from first row
    for (let c = 0; c < maxCol; c++) {
      const item = layout.find(l => l.col === c && l.row === 0);
      if (item) {
        const variant = cabinets.find(cab => cab.id === item.cabinet_id);
        if (variant) pixelWidth += variant.pixel_width;
      } else {
        // Check if this column is part of a multi-span cabinet
        const spanning = layout.find(l => {
          const v = cabinets.find(cab => cab.id === l.cabinet_id);
          if (!v) return false;
          const spanCols = Math.ceil(v.width_mm / baseGridWidth);
          return l.row === 0 && c >= l.col && c < l.col + spanCols;
        });
        if (spanning && spanning.col === c) {
          const variant = cabinets.find(cab => cab.id === spanning.cabinet_id);
          if (variant) pixelWidth += variant.pixel_width;
        }
      }
    }

    // Get pixels from first column
    for (let r = 0; r < maxRow; r++) {
      const item = layout.find(l => l.col === 0 && l.row === r);
      if (item) {
        const variant = cabinets.find(cab => cab.id === item.cabinet_id);
        if (variant) pixelHeight += variant.pixel_height;
      } else {
        const spanning = layout.find(l => {
          const v = cabinets.find(cab => cab.id === l.cabinet_id);
          if (!v) return false;
          const spanRows = Math.ceil(v.height_mm / baseGridHeight);
          return l.col === 0 && r >= l.row && r < l.row + spanRows;
        });
        if (spanning && spanning.row === r) {
          const variant = cabinets.find(cab => cab.id === spanning.cabinet_id);
          if (variant) pixelHeight += variant.pixel_height;
        }
      }
    }

    const widthMm = maxCol * baseGridWidth;
    const heightMm = maxRow * baseGridHeight;

    return {
      totalCabinets: layout.length,
      cabinetCounts,
      totalWeight,
      widthMm,
      heightMm,
      pixelWidth: pixelWidth || maxCol * 128,
      pixelHeight: pixelHeight || maxRow * 128,
      powerMin,
      powerTypical,
      powerMax,
      powerPeak
    };
  };

  const totals = calculateTotals();

  const ampsFromWatts = (watts) => (watts / voltage).toFixed(1);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Wall Summary</CardTitle>
          <Badge className={wall?.voltage_mode === '120v' ? 'bg-amber-600' : 'bg-blue-600'}>
            {voltage}V
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimensions */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Dimensions</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400">Width</p>
              <p className="text-white font-medium">
                {mmToM(totals.widthMm)}m <span className="text-slate-400">({mmToFt(totals.widthMm)}')</span>
              </p>
            </div>
            <div>
              <p className="text-slate-400">Height</p>
              <p className="text-white font-medium">
                {mmToM(totals.heightMm)}m <span className="text-slate-400">({mmToFt(totals.heightMm)}')</span>
              </p>
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Resolution</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totals.pixelWidth} × {totals.pixelHeight} <span className="text-sm text-slate-400">px</span>
          </p>
          <p className="text-xs text-slate-400">
            {(totals.pixelWidth * totals.pixelHeight).toLocaleString()} total pixels
          </p>
        </div>

        {/* Cabinet Counts */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">Cabinets ({totals.totalCabinets})</span>
          </div>
          <div className="space-y-1 text-sm">
            {Object.entries(totals.cabinetCounts).map(([key, count]) => (
              <div key={key} className="flex justify-between text-slate-300">
                <span>{key}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Weight className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-white">Total Weight</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totals.totalWeight.toFixed(1)} <span className="text-sm text-slate-400">kg</span>
            <span className="text-slate-400 text-sm ml-2">({kgToLbs(totals.totalWeight)} lbs)</span>
          </p>
        </div>

        {/* Power */}
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Power @ {voltage}V</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-600/50 rounded text-center">
              <p className="text-slate-400">Min</p>
              <p className="text-white font-medium">{totals.powerMin}W</p>
              <p className="text-slate-400">{ampsFromWatts(totals.powerMin)}A</p>
            </div>
            <div className="p-2 bg-slate-600/50 rounded text-center">
              <p className="text-slate-400">Typical</p>
              <p className="text-white font-medium">{totals.powerTypical}W</p>
              <p className="text-slate-400">{ampsFromWatts(totals.powerTypical)}A</p>
            </div>
            <div className="p-2 bg-slate-600/50 rounded text-center">
              <p className="text-slate-400">Max</p>
              <p className="text-white font-medium">{totals.powerMax}W</p>
              <p className="text-slate-400">{ampsFromWatts(totals.powerMax)}A</p>
            </div>
            <div className="p-2 bg-red-900/30 rounded text-center border border-red-700/50">
              <p className="text-slate-400">Peak</p>
              <p className="text-red-300 font-medium">{Math.round(totals.powerPeak)}W</p>
              <p className="text-red-400">{ampsFromWatts(totals.powerPeak)}A</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}