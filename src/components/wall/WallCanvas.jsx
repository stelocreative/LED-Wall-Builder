import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move, MousePointer, Trash2, RotateCcw } from 'lucide-react';

const CELL_COLORS = {
  active: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400',
  spare: 'bg-amber-600 hover:bg-amber-500 border-amber-400',
  void: 'bg-slate-700 hover:bg-slate-600 border-slate-500',
  cutout: 'bg-transparent border-dashed border-slate-600',
};

const DATA_PATH_COLOR = '#facc15';
const DATA_PATH_OUTLINE = '#0f172a';
const DATA_PATH_STROKE = 3.5;
const DATA_PATH_OUTLINE_STROKE = 6.5;

export default function WallCanvas({ 
  gridCols, 
  gridRows, 
  baseGridWidth = 500,
  baseGridHeight = 500,
  layout = [],
  selectedCabinet,
  cabinets = [],
  families = [],
  onLayoutChange,
  dataRuns = [],
  powerPlan = [],
  showDataPaths = true,
  showPowerPaths = true,
  showLabels = true,
  showMeasurements = true,
  tool = 'select'
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedCells, setSelectedCells] = useState([]);
  const containerRef = useRef(null);

  const baseCellSize = 60; // Display size for one base grid unit (500mm)

  const getCabinetForCell = (col, row) => {
    return layout.find(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (!variant) return false;
      const wUnits = Math.round(variant.width_mm / baseGridWidth);
      const hUnits = Math.round(variant.height_mm / baseGridHeight);
      return col >= item.col && col < item.col + wUnits && 
             row >= item.row && row < item.row + hUnits;
    });
  };

  const isOccupied = (col, row, excludeId = null) => {
    const item = getCabinetForCell(col, row);
    return item && item.id !== excludeId;
  };

  const canPlace = (col, row, variant) => {
    if (!variant) return false;
    const wUnits = Math.round(variant.width_mm / baseGridWidth);
    const hUnits = Math.round(variant.height_mm / baseGridHeight);
    
    // Check all cells this cabinet would occupy
    for (let c = col; c < col + wUnits; c++) {
      for (let r = row; r < row + hUnits; r++) {
        if (c >= gridCols || r >= gridRows) return false;
        if (isOccupied(c, r)) return false;
      }
    }
    return true;
  };

  const handleCellClick = (col, row) => {
    if (tool === 'select') {
      const existing = getCabinetForCell(col, row);
      if (existing) {
        setSelectedCells([existing.id]);
      } else {
        setSelectedCells([]);
      }
    } else if (tool === 'place' && selectedCabinet) {
      const variant = cabinets.find(c => c.id === selectedCabinet);
      if (canPlace(col, row, variant)) {
        const newItem = {
          id: `cell-${Date.now()}`,
          col,
          row,
          cabinet_id: selectedCabinet,
          label: `P${layout.length + 1}`,
          status: 'active'
        };
        onLayoutChange([...layout, newItem]);
      }
    } else if (tool === 'delete') {
      const existing = getCabinetForCell(col, row);
      if (existing) {
        onLayoutChange(layout.filter(item => item.id !== existing.id));
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.3, Math.min(3, z + delta)));
  };

  const handleMouseDown = (e) => {
    if (tool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const renderCell = (col, row) => {
    const layoutItem = layout.find(item => item.col === col && item.row === row);
    const occupyingItem = getCabinetForCell(col, row);
    
    // Skip rendering if this cell is occupied by a cabinet that starts elsewhere
    if (occupyingItem && occupyingItem !== layoutItem) {
      return null;
    }

    if (layoutItem) {
      const variant = cabinets.find(c => c.id === layoutItem.cabinet_id);
      const family = families.find(f => f.id === variant?.panel_family_id);
      
      // Calculate units - how many base grid cells this cabinet occupies
      const wUnits = variant ? Math.round(variant.width_mm / baseGridWidth) : 1;
      const hUnits = variant ? Math.round(variant.height_mm / baseGridHeight) : 1;
      
      const status = layoutItem.status || 'active';
      const isSelected = selectedCells.includes(layoutItem.id);

      return (
        <div
          key={`cabinet-${layoutItem.id}`}
          onClick={() => handleCellClick(col, row)}
          className={`absolute border-2 rounded-sm cursor-pointer transition-all flex flex-col items-center justify-center text-xs ${CELL_COLORS[status]} ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
          style={{
            left: col * baseCellSize * zoom + pan.x,
            top: row * baseCellSize * zoom + pan.y,
            width: wUnits * baseCellSize * zoom - 2,
            height: hUnits * baseCellSize * zoom - 2,
          }}
        >
          {showLabels && (
            <>
              <span className="font-bold text-white">{layoutItem.label}</span>
              {zoom > 0.7 && variant && (
                <span className="text-white/70 text-[10px]">{variant.variant_name}</span>
              )}
            </>
          )}
        </div>
      );
    }

    // Empty cell - render base grid unit
    return (
      <div
        key={`empty-${col}-${row}`}
        onClick={() => handleCellClick(col, row)}
        className="absolute border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/30 cursor-pointer transition-all rounded-sm"
        style={{
          left: col * baseCellSize * zoom + pan.x,
          top: row * baseCellSize * zoom + pan.y,
          width: baseCellSize * zoom - 2,
          height: baseCellSize * zoom - 2,
        }}
      />
    );
  };

  const renderMeasurements = () => {
    if (!showMeasurements) return null;
    
    const totalWidthMm = gridCols * baseGridWidth;
    const totalHeightMm = gridRows * baseGridHeight;
    const widthM = (totalWidthMm / 1000).toFixed(2);
    const heightM = (totalHeightMm / 1000).toFixed(2);
    const widthFt = (totalWidthMm / 304.8).toFixed(2);
    const heightFt = (totalHeightMm / 304.8).toFixed(2);

    return (
      <>
        <div 
          className="absolute text-xs text-slate-400 flex items-center justify-center"
          style={{
            left: pan.x,
            top: pan.y - 24,
            width: gridCols * baseCellSize * zoom,
          }}
        >
          {widthM}m ({widthFt}')
        </div>
        <div 
          className="absolute text-xs text-slate-400 flex items-center justify-center writing-mode-vertical"
          style={{
            left: pan.x - 30,
            top: pan.y,
            height: gridRows * baseCellSize * zoom,
            writingMode: 'vertical-lr',
            transform: 'rotate(180deg)'
          }}
        >
          {heightM}m ({heightFt}')
        </div>
      </>
    );
  };

  const renderDataPaths = () => {
    if (!showDataPaths || !dataRuns.length) return null;

    const segments = [];

    dataRuns.forEach((run, runIndex) => {
      if (!run.path || run.path.length < 2) return;

      run.path.forEach((point, pointIndex) => {
        if (pointIndex === run.path.length - 1) return;

        const nextPoint = run.path[pointIndex + 1];
        const item = layout.find((entry) => entry.id === point);
        const nextItem = layout.find((entry) => entry.id === nextPoint);
        if (!item || !nextItem) return;

        const variant = cabinets.find((cabinet) => cabinet.id === item.cabinet_id);
        const nextVariant = cabinets.find((cabinet) => cabinet.id === nextItem.cabinet_id);
        const wUnits = variant ? Math.round(variant.width_mm / baseGridWidth) : 1;
        const hUnits = variant ? Math.round(variant.height_mm / baseGridHeight) : 1;
        const nextWUnits = nextVariant ? Math.round(nextVariant.width_mm / baseGridWidth) : 1;
        const nextHUnits = nextVariant ? Math.round(nextVariant.height_mm / baseGridHeight) : 1;

        const x1 = (item.col + wUnits / 2) * baseCellSize * zoom + pan.x;
        const y1 = (item.row + hUnits / 2) * baseCellSize * zoom + pan.y;
        const x2 = (nextItem.col + nextWUnits / 2) * baseCellSize * zoom + pan.x;
        const y2 = (nextItem.row + nextHUnits / 2) * baseCellSize * zoom + pan.y;

        // LED jumper maps are orthogonal in real-world rigging, never diagonal.
        const points =
          x1 === x2 || y1 === y2
            ? `${x1},${y1} ${x2},${y2}`
            : `${x1},${y1} ${x2},${y1} ${x2},${y2}`;

        segments.push(
          <g key={`data-${runIndex}-${pointIndex}`}>
            <polyline
              points={points}
              fill="none"
              stroke={DATA_PATH_OUTLINE}
              strokeWidth={DATA_PATH_OUTLINE_STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
            <polyline
              points={points}
              fill="none"
              stroke={DATA_PATH_COLOR}
              strokeWidth={DATA_PATH_STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#arrowhead-data)"
            />
          </g>
        );
      });
    });

    if (!segments.length) return null;

    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead-data" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto">
            <polygon points="0 0, 14 5, 0 10" fill={DATA_PATH_COLOR} stroke={DATA_PATH_OUTLINE} strokeWidth="0.9" />
          </marker>
        </defs>
        {segments}
      </svg>
    );
  };

  const cells = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const cell = renderCell(col, row);
      if (cell) cells.push(cell);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
        <Button 
          size="sm" 
          variant={tool === 'select' ? 'default' : 'outline'}
          onClick={() => {}}
          className="gap-1"
        >
          <MousePointer className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => { setZoom(1); setPan({ x: 20, y: 40 }); }}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <span className="text-xs text-slate-400 ml-2">{Math.round(zoom * 100)}%</span>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 bg-slate-900 overflow-hidden relative cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderMeasurements()}
        {cells}
        {renderDataPaths()}
      </div>
    </div>
  );
}
