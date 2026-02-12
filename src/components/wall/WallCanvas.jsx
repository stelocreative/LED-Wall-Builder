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
const DATA_ARROW_BASE_WIDTH = 14;
const DATA_ARROW_BASE_HEIGHT = 10;
const POWER_CIRCUIT_PALETTE = [
  { fill: '#ef4444', border: '#fecaca' },
  { fill: '#8b5cf6', border: '#ddd6fe' },
  { fill: '#f97316', border: '#fed7aa' },
  { fill: '#06b6d4', border: '#a5f3fc' },
  { fill: '#e11d48', border: '#fecdd3' },
  { fill: '#6366f1', border: '#c7d2fe' },
  { fill: '#14b8a6', border: '#99f6e4' },
  { fill: '#a855f7', border: '#f3e8ff' },
  { fill: '#dc2626', border: '#fee2e2' },
  { fill: '#0ea5e9', border: '#bae6fd' },
  { fill: '#f59e0b', border: '#fde68a' },
  { fill: '#10b981', border: '#a7f3d0' }
];

function getCircuitShortLabel(label, fallbackIndex) {
  const match = String(label || '').match(/(\d+)/);
  if (match) {
    return `C${match[1]}`;
  }
  return `C${fallbackIndex + 1}`;
}

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
  tool = 'select',
  activeDataRunId = null,
  activePowerCircuitId = null,
  onDataRunCabinetClick,
  onPowerCircuitCabinetClick
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedCells, setSelectedCells] = useState([]);
  const containerRef = useRef(null);

  const baseCellSize = 60; // Display size for one base grid unit (500mm)
  const powerCircuitByCabinetId = new Map();
  const powerCircuitLegend = [];
  const activeDataRun = dataRuns.find((run) => run.id === activeDataRunId);
  const activeDataCabinetIds = new Set(activeDataRun?.path || []);
  const activePowerCircuit = powerPlan.find((circuit) => circuit.id === activePowerCircuitId);
  const activePowerCabinetIds = new Set(activePowerCircuit?.cabinet_ids || []);

  if (showPowerPaths && Array.isArray(powerPlan)) {
    powerPlan.forEach((circuit, index) => {
      const cabinetIds = Array.isArray(circuit?.cabinet_ids) ? circuit.cabinet_ids : [];
      if (!cabinetIds.length) {
        return;
      }

      const palette = POWER_CIRCUIT_PALETTE[index % POWER_CIRCUIT_PALETTE.length];
      const circuitLabel = circuit?.label || `Circuit ${index + 1}`;
      const summary = {
        id: circuit?.id || `circuit-${index + 1}`,
        label: circuitLabel,
        shortLabel: getCircuitShortLabel(circuitLabel, index),
        panelCount: cabinetIds.length,
        fill: palette.fill,
        border: palette.border
      };

      powerCircuitLegend.push(summary);
      cabinetIds.forEach((cabinetId) => {
        powerCircuitByCabinetId.set(cabinetId, summary);
      });
    });
  }

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
    const existing = getCabinetForCell(col, row);

    if (activeDataRunId && existing) {
      onDataRunCabinetClick?.(activeDataRunId, existing.id);
      return;
    }

    if (activePowerCircuitId && existing) {
      onPowerCircuitCabinetClick?.(activePowerCircuitId, existing.id);
      return;
    }

    if (tool === 'select') {
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
      const powerCircuit = showPowerPaths ? powerCircuitByCabinetId.get(layoutItem.id) : null;
      const shouldColorByCircuit = Boolean(powerCircuit) && status !== 'void' && status !== 'cutout';
      const isDataTarget = activeDataCabinetIds.has(layoutItem.id);
      const isPowerTarget = activePowerCabinetIds.has(layoutItem.id);

      return (
        <div
          key={`cabinet-${layoutItem.id}`}
          onClick={() => handleCellClick(col, row)}
          className={`absolute border-2 rounded-sm cursor-pointer transition-all flex flex-col items-center justify-center text-xs ${CELL_COLORS[status]} ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''} ${isDataTarget ? 'ring-2 ring-yellow-300/90 ring-offset-1 ring-offset-slate-900' : ''} ${isPowerTarget ? 'ring-2 ring-orange-300/90 ring-offset-1 ring-offset-slate-900' : ''}`}
          style={{
            left: col * baseCellSize * zoom + pan.x,
            top: row * baseCellSize * zoom + pan.y,
            width: wUnits * baseCellSize * zoom - 2,
            height: hUnits * baseCellSize * zoom - 2,
            ...(shouldColorByCircuit
              ? {
                  backgroundColor: powerCircuit.fill,
                  borderColor: powerCircuit.border,
                  boxShadow: `inset 0 0 0 1px ${powerCircuit.border}`
                }
              : {})
          }}
        >
          {showLabels && (
            <>
              <span className="font-bold text-white">{layoutItem.label}</span>
              {zoom > 0.7 && variant && (
                <span className="text-white/70 text-[10px]">{variant.variant_name}</span>
              )}
              {showPowerPaths && powerCircuit && zoom > 0.55 && (
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/40 text-[9px] font-semibold text-white">
                  {powerCircuit.shortLabel}
                </span>
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

    const zoomStrokeFactor = Math.max(0.45, Math.min(1.4, zoom));
    const lineStroke = DATA_PATH_STROKE * zoomStrokeFactor;
    const outlineStroke = DATA_PATH_OUTLINE_STROKE * zoomStrokeFactor;
    const markerScale = Math.max(0.55, Math.min(1.2, zoom));
    const markerWidth = DATA_ARROW_BASE_WIDTH * markerScale;
    const markerHeight = DATA_ARROW_BASE_HEIGHT * markerScale;
    const markerRefX = markerWidth * 0.86;
    const markerRefY = markerHeight / 2;
    const markerPoints = `0 0, ${markerWidth} ${markerRefY}, 0 ${markerHeight}`;

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
              strokeWidth={outlineStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
            <polyline
              points={points}
              fill="none"
              stroke={DATA_PATH_COLOR}
              strokeWidth={lineStroke}
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
          <marker
            id="arrowhead-data"
            markerWidth={markerWidth}
            markerHeight={markerHeight}
            refX={markerRefX}
            refY={markerRefY}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points={markerPoints} fill={DATA_PATH_COLOR} stroke={DATA_PATH_OUTLINE} strokeWidth={Math.max(0.6, lineStroke * 0.35)} />
          </marker>
        </defs>
        {segments}
      </svg>
    );
  };

  const renderPowerCircuitLegend = () => {
    if (!showPowerPaths || !powerCircuitLegend.length) return null;

    return (
      <div className="absolute right-3 top-3 z-10 rounded-md border border-slate-600 bg-slate-900/85 p-2 text-[10px] text-white">
        <p className="mb-1 font-semibold text-slate-200">Power Circuits</p>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {powerCircuitLegend.map((circuit) => (
            <div key={circuit.id} className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="h-2.5 w-2.5 rounded-sm border"
                style={{ backgroundColor: circuit.fill, borderColor: circuit.border }}
              />
              <span className="text-slate-100">{circuit.shortLabel}</span>
              <span className="text-slate-400">({circuit.panelCount})</span>
            </div>
          ))}
        </div>
      </div>
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
        {(activeDataRunId || activePowerCircuitId) && (
          <div className="absolute left-3 top-3 z-10 rounded-md border border-slate-500 bg-slate-900/90 px-3 py-2 text-xs text-slate-100">
            {activeDataRunId && <p>Routing Data: click cabinets in order to build the run.</p>}
            {activePowerCircuitId && <p>Assigning Power: click cabinets to toggle this circuit.</p>}
          </div>
        )}
        {renderPowerCircuitLegend()}
        {renderMeasurements()}
        {cells}
        {renderDataPaths()}
      </div>
    </div>
  );
}
