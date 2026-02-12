import React, { forwardRef } from 'react';
import {
  getDataCapacity,
  getRunPixelLoad,
  getWallPixelLoad,
  parsePortIndex
} from '@/lib/processor-catalog';

const DATA_PATH_COLOR = '#f59e0b';
const DATA_PATH_OUTLINE = '#111827';
const POWER_PATH_OUTLINE = '#111827';
const POWER_CIRCUIT_PALETTE = [
  { stroke: '#ef4444', fill: '#ef4444' },
  { stroke: '#8b5cf6', fill: '#8b5cf6' },
  { stroke: '#f97316', fill: '#f97316' },
  { stroke: '#06b6d4', fill: '#06b6d4' },
  { stroke: '#e11d48', fill: '#e11d48' },
  { stroke: '#6366f1', fill: '#6366f1' },
  { stroke: '#14b8a6', fill: '#14b8a6' },
  { stroke: '#a855f7', fill: '#a855f7' },
  { stroke: '#dc2626', fill: '#dc2626' },
  { stroke: '#0ea5e9', fill: '#0ea5e9' },
  { stroke: '#f59e0b', fill: '#f59e0b' },
  { stroke: '#10b981', fill: '#10b981' }
];

function parseArraySafe(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDefaultChecklist(deploymentType) {
  const baseItems = [
    { id: 'power-distro', text: 'Power distro verified and grounded', checked: false },
    { id: 'controller', text: 'Controller/processor configured and tested', checked: false },
    { id: 'spare-count', text: 'Spare cabinets counted and labeled', checked: false },
    { id: 'data-jumpers', text: 'Data jumpers inspected and ready', checked: false },
    { id: 'power-jumpers', text: 'Power jumpers inspected and ready', checked: false }
  ];

  if (deploymentType === 'flown') {
    return [
      { id: 'rigging-cert', text: 'Rigging hardware certified and inspected', checked: false },
      { id: 'weight-check', text: 'Total weight verified against trim capacity', checked: false },
      { id: 'truss-inspect', text: 'Truss and motors inspected', checked: false },
      ...baseItems,
      { id: 'safety-cables', text: 'Safety cables installed on all panels', checked: false }
    ];
  }

  return [
    { id: 'ground-support', text: 'Ground support/base inspected and leveled', checked: false },
    { id: 'stability', text: 'Wall stability and bracing checked', checked: false },
    ...baseItems
  ];
}

function getCircuitShortLabel(label, index) {
  const match = String(label || '').match(/(\d+)/);
  if (match) {
    return `C${match[1]}`;
  }
  return `C${index + 1}`;
}

function orthogonalPoints(x1, y1, x2, y2) {
  if (x1 === x2 || y1 === y2) {
    return `${x1},${y1} ${x2},${y2}`;
  }
  return `${x1},${y1} ${x1},${y2} ${x2},${y2}`;
}

const DeploymentSheet = forwardRef(({ 
  show, 
  wall, 
  layout, 
  cabinets, 
  families,
  dataRuns,
  powerPlan,
  baseGridWidth = 500,
  baseGridHeight = 500,
  gridCols,
  gridRows
}, ref) => {
  const mmToM = (mm) => (mm / 1000).toFixed(2);
  const mmToFt = (mm) => (mm / 304.8).toFixed(2);
  const kgToLbs = (kg) => (kg * 2.205).toFixed(1);
  const voltage = wall?.voltage_mode === '120v' ? 120 : 208;
  const processorModel = wall?.processor_model || 'mx30';
  const receivingCard = wall?.receiving_card || 'a8s';
  const colorDepth = wall?.color_depth || '10bit';
  const dataCapacity = getDataCapacity({ processorModel, receivingCard, colorDepth });
  const totalWallPixelsForData = getWallPixelLoad(layout, cabinets);
  const dataRunMetrics = dataRuns.map((run) => {
    const pixelLoad = run.pixel_load ?? getRunPixelLoad(run, layout, cabinets);
    const portIndex = run.processor_port_index || parsePortIndex(run.processor_port);
    return {
      runId: run.id,
      pixelLoad,
      portIndex,
      overPortBudget: pixelLoad > dataCapacity.perPortPixelBudget,
      overPortCount: (portIndex || 0) > dataCapacity.ethernetPorts
    };
  });
  const metricsByRunId = new Map(dataRunMetrics.map((metric) => [metric.runId, metric]));
  const maxPortIndex = dataRunMetrics.reduce((max, metric) => Math.max(max, metric.portIndex || 0), 0);
  const portsUsed = maxPortIndex || dataRuns.length;
  const wallPixelsOverLimit = totalWallPixelsForData > dataCapacity.maxDevicePixels;
  const dataPortsOverLimit = portsUsed > dataCapacity.ethernetPorts;
  const runsOverBudget = dataRunMetrics.filter((metric) => metric.overPortBudget).length;
  const receivingCardLabel = receivingCard === 'a10s' ? 'A10s / A10s Pro' : 'A8s';
  const colorDepthLabel = colorDepth === '8bit' ? '8-bit' : '10-bit';
  const loomBundles = parseArraySafe(wall?.loom_bundles);
  const storedCrewChecklist = parseArraySafe(wall?.crew_checklist);
  const crewChecklist = storedCrewChecklist.length
    ? storedCrewChecklist
    : getDefaultChecklist(wall?.deployment_type);

  // Calculate totals
  const calculateTotals = () => {
    let totalWeight = 0;
    let powerMin = 0, powerTypical = 0, powerMax = 0, powerPeak = 0;
    const cabinetCounts = {};
    let maxCol = 0, maxRow = 0;

    layout.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (!variant) return;

      const family = families.find(f => f.id === variant.panel_family_id);
      const key = `${family?.manufacturer || ''} ${family?.family_name || ''} ${variant.variant_name}`;
      cabinetCounts[key] = (cabinetCounts[key] || 0) + 1;

      totalWeight += variant.weight_kg || 0;
      powerMin += variant.power_min_w || 0;
      powerTypical += variant.power_typical_w || 0;
      powerMax += variant.power_max_w || 0;
      powerPeak += variant.power_peak_w || (variant.power_max_w * (variant.peak_factor || 1.2)) || 0;

      const spanCols = Math.ceil(variant.width_mm / baseGridWidth);
      const spanRows = Math.ceil(variant.height_mm / baseGridHeight);
      maxCol = Math.max(maxCol, item.col + spanCols);
      maxRow = Math.max(maxRow, item.row + spanRows);
    });

    // Estimate pixel dimensions
    let pixelWidth = 0, pixelHeight = 0;
    const firstRowItems = layout.filter(l => l.row === 0).sort((a, b) => a.col - b.col);
    const firstColItems = layout.filter(l => l.col === 0).sort((a, b) => a.row - b.row);
    
    firstRowItems.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (variant) pixelWidth += variant.pixel_width;
    });
    
    firstColItems.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (variant) pixelHeight += variant.pixel_height;
    });

    return {
      totalCabinets: layout.length,
      cabinetCounts,
      totalWeight,
      widthMm: maxCol * baseGridWidth,
      heightMm: maxRow * baseGridHeight,
      pixelWidth: pixelWidth || maxCol * 128,
      pixelHeight: pixelHeight || maxRow * 128,
      powerMin, powerTypical, powerMax, powerPeak
    };
  };

  const totals = calculateTotals();
  const ampsFromWatts = (watts) => (watts / voltage).toFixed(1);
  const dataJumpers = dataRuns.reduce((acc, run) => acc + Math.max(0, (run.path?.length || 0) - 1), 0);
  const dataHomeRuns = dataRuns.length;
  const powerJumpers = powerPlan.reduce((acc, circuit) => acc + Math.max(0, (circuit.cabinet_ids?.length || 0) - 1), 0);
  const powerHomeRuns = powerPlan.length;
  const powerOriginSide = wall?.deployment_type === 'flown' ? 'top' : 'bottom';
  const socapexMode = wall?.power_strategy === 'socapex';

  const safeGridCols = Math.max(1, Number(gridCols) || 1);
  const safeGridRows = Math.max(1, Number(gridRows) || 1);
  const DIAGRAM_MAX_WIDTH = 740;
  const DIAGRAM_MAX_HEIGHT = 940;
  const diagramPadding = 24;
  const cellSize = Math.max(
    10,
    Math.floor(
      Math.min(
        (DIAGRAM_MAX_WIDTH - diagramPadding * 2) / safeGridCols,
        (DIAGRAM_MAX_HEIGHT - diagramPadding * 2) / safeGridRows
      )
    )
  );
  const canvasWidth = safeGridCols * cellSize;
  const canvasHeight = safeGridRows * cellSize;
  const svgWidth = canvasWidth + diagramPadding * 2;
  const svgHeight = canvasHeight + diagramPadding * 2;

  const dataLineStroke = Math.max(1.1, Math.min(2.4, cellSize * 0.055));
  const dataOutlineStroke = dataLineStroke + 1.2;
  const powerLineStroke = Math.max(1.0, Math.min(2.1, cellSize * 0.05));
  const powerOutlineStroke = powerLineStroke + 1.1;

  const dataArrowWidth = Math.max(5, Math.min(8.5, cellSize * 0.17));
  const dataArrowHeight = Math.max(4, dataArrowWidth * 0.68);
  const dataArrowRefX = dataArrowWidth * 0.84;
  const dataArrowRefY = dataArrowHeight / 2;
  const dataArrowPoints = `0 0, ${dataArrowWidth} ${dataArrowRefY}, 0 ${dataArrowHeight}`;

  const powerArrowWidth = Math.max(4.5, Math.min(7.5, cellSize * 0.15));
  const powerArrowHeight = Math.max(3.5, powerArrowWidth * 0.66);
  const powerArrowRefX = powerArrowWidth * 0.82;
  const powerArrowRefY = powerArrowHeight / 2;
  const powerArrowPoints = `0 0, ${powerArrowWidth} ${powerArrowRefY}, 0 ${powerArrowHeight}`;

  const circuitTagWidth = Math.max(14, Math.min(20, cellSize * 0.42));
  const circuitTagHeight = Math.max(8, Math.min(12, cellSize * 0.28));
  const circuitTagFont = Math.max(5, Math.min(6.5, cellSize * 0.16));
  const cabinetLabelFont = Math.max(6, Math.min(10, cellSize * 0.24));
  const pageBreakAfterStyle = { breakAfter: 'page', pageBreakAfter: 'always' };
  const hasLoomSection = loomBundles.length > 0;
  const hasDataRunsSection = dataRuns.length > 0;
  const hasPowerSection = powerPlan.length > 0;
  const hasCableSection = true;
  const hasChecklistSection = crewChecklist.length > 0;

  const cabinetGeometryById = new Map(
    layout
      .map((item) => {
        const variant = cabinets.find((c) => c.id === item.cabinet_id);
        if (!variant) return null;
        const spanCols = Math.ceil(variant.width_mm / baseGridWidth);
        const spanRows = Math.ceil(variant.height_mm / baseGridHeight);
        const x = item.col * cellSize;
        const y = item.row * cellSize;
        const w = spanCols * cellSize;
        const h = spanRows * cellSize;
        return [
          item.id,
          {
            id: item.id,
            x,
            y,
            w,
            h,
            cx: x + w / 2,
            cy: y + h / 2,
            entryTopY: y + 3,
            entryBottomY: y + h - 3
          }
        ];
      })
      .filter(Boolean)
  );

  const powerCircuitsForDrawing = powerPlan
    .map((circuit, idx) => {
      const cabinetIds = (circuit.cabinet_ids || []).filter((id) => cabinetGeometryById.has(id));
      if (!cabinetIds.length) {
        return null;
      }
      const geometry = cabinetIds.map((id) => cabinetGeometryById.get(id));
      const avgX = geometry.reduce((sum, g) => sum + g.cx, 0) / geometry.length;
      const palette = POWER_CIRCUIT_PALETTE[idx % POWER_CIRCUIT_PALETTE.length];
      return {
        id: circuit.id || `circuit-${idx + 1}`,
        label: circuit.label || `Circuit ${idx + 1}`,
        shortLabel: getCircuitShortLabel(circuit.label, idx),
        markerId: `power-arrow-${idx}`,
        cabinetIds,
        geometry,
        avgX,
        color: palette,
        tailIndex: Math.floor(idx / 6)
      };
    })
    .filter(Boolean);

  const powerCircuitByCabinetId = new Map();
  powerCircuitsForDrawing.forEach((circuit) => {
    circuit.cabinetIds.forEach((cabinetId) => {
      powerCircuitByCabinetId.set(cabinetId, circuit);
    });
  });

  const powerEntryOffset = Math.max(8, Math.min(16, cellSize * 0.28));
  const socaBaseOffset = powerEntryOffset + Math.max(4, Math.min(10, cellSize * 0.16));
  const socaSpacing = Math.max(5, Math.min(10, cellSize * 0.18));
  const powerEntryY = powerOriginSide === 'top' ? -powerEntryOffset : canvasHeight + powerEntryOffset;
  const socapexTailCount = socapexMode ? Math.max(1, Math.ceil(powerCircuitsForDrawing.length / 6)) : 0;

  return (
    <div ref={ref} className="bg-white text-black p-8 min-h-[11in] w-[8.5in] mx-auto print:p-6">
      {/* Title Block */}
      <div className="border-2 border-black p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{show?.name || 'Untitled Show'}</h1>
            <p className="text-lg font-semibold">{wall?.name || 'Wall'}</p>
          </div>
          <div className="text-right text-sm">
            <p><strong>Date:</strong> {show?.date || new Date().toLocaleDateString()}</p>
            <p><strong>Venue:</strong> {show?.venue || '-'}</p>
            <p><strong>Revision:</strong> {wall?.revision || 'A'}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-300 text-sm flex-wrap">
          <span className="px-2 py-1 bg-gray-100 rounded">
            <strong>Type:</strong> {wall?.deployment_type === 'flown' ? 'FLOWN' : 'GROUND STACK'}
          </span>
          <span className={`px-2 py-1 rounded font-bold ${wall?.voltage_mode === '120v' ? 'bg-amber-100' : 'bg-blue-100'}`}>
            {voltage}V
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded">
            <strong>Strategy:</strong> {wall?.power_strategy?.replace(/_/g, ' ').toUpperCase() || 'EDISON 20A'}
          </span>
          <span className="px-2 py-1 bg-cyan-50 rounded">
            <strong>Processor:</strong> {dataCapacity.processorName}
          </span>
          <span className="px-2 py-1 bg-cyan-50 rounded">
            <strong>Data Mode:</strong> {colorDepthLabel} • {receivingCardLabel}
          </span>
          {wall?.rack_location && (
            <span className="px-2 py-1 bg-purple-50 rounded">
              <strong>Rack:</strong> {wall.rack_location === 'Custom' ? wall.custom_rack_location : wall.rack_location}
            </span>
          )}
        </div>
        {wall?.revision_notes && (
          <div className="mt-3 pt-3 border-t border-gray-300 text-xs">
            <strong>Revision Notes:</strong> {wall.revision_notes}
          </div>
        )}
        {wall?.rack_notes && (
          <div className="mt-2 text-xs text-gray-600">
            <strong>Rack Notes:</strong> {wall.rack_notes}
          </div>
        )}
      </div>

      {/* Summary Totals */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Dimensions */}
        <div className="border border-gray-300 p-3">
          <h3 className="font-bold text-sm border-b pb-1 mb-2">DIMENSIONS</h3>
          <p className="text-sm">
            <strong>Width:</strong> {mmToM(totals.widthMm)}m ({mmToFt(totals.widthMm)}')
          </p>
          <p className="text-sm">
            <strong>Height:</strong> {mmToM(totals.heightMm)}m ({mmToFt(totals.heightMm)}')
          </p>
        </div>

        {/* Resolution */}
        <div className="border border-gray-300 p-3">
          <h3 className="font-bold text-sm border-b pb-1 mb-2">RESOLUTION</h3>
          <p className="text-lg font-bold">{totals.pixelWidth} × {totals.pixelHeight}</p>
          <p className="text-xs text-gray-600">{(totals.pixelWidth * totals.pixelHeight).toLocaleString()} px</p>
        </div>

        {/* Cabinets */}
        <div className="border border-gray-300 p-3">
          <h3 className="font-bold text-sm border-b pb-1 mb-2">CABINETS</h3>
          <p className="text-lg font-bold">{totals.totalCabinets} panels</p>
          {Object.entries(totals.cabinetCounts).map(([k, v]) => (
            <p key={k} className="text-xs">{v}× {k}</p>
          ))}
        </div>

        {/* Weight */}
        <div className="border border-gray-300 p-3">
          <h3 className="font-bold text-sm border-b pb-1 mb-2">WEIGHT</h3>
          <p className="text-lg font-bold">{totals.totalWeight.toFixed(1)} kg</p>
          <p className="text-sm text-gray-600">{kgToLbs(totals.totalWeight)} lbs</p>
        </div>
      </div>

      {/* Power Totals Block */}
      <div className="border-2 border-black p-4 mb-6">
        <h3 className="font-bold text-sm mb-3">POWER TOTALS @ {voltage}V</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-left py-1">Level</th>
              <th className="text-right py-1">Watts</th>
              <th className="text-right py-1">Amps</th>
              <th className="text-right py-1">Est. Circuits (20A)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">Min (Dark)</td>
              <td className="text-right">{totals.powerMin} W</td>
              <td className="text-right">{ampsFromWatts(totals.powerMin)} A</td>
              <td className="text-right">{Math.ceil(totals.powerMin / voltage / 16)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-1 font-medium">Typical (Planning)</td>
              <td className="text-right font-medium">{totals.powerTypical} W</td>
              <td className="text-right font-medium">{ampsFromWatts(totals.powerTypical)} A</td>
              <td className="text-right font-medium">{Math.ceil(totals.powerTypical / voltage / 16)}</td>
            </tr>
            <tr>
              <td className="py-1">Max (Continuous)</td>
              <td className="text-right">{totals.powerMax} W</td>
              <td className="text-right">{ampsFromWatts(totals.powerMax)} A</td>
              <td className="text-right">{Math.ceil(totals.powerMax / voltage / 16)}</td>
            </tr>
            <tr className="bg-red-50 font-bold">
              <td className="py-1">Peak (Surge)</td>
              <td className="text-right">{Math.round(totals.powerPeak)} W</td>
              <td className="text-right">{ampsFromWatts(totals.powerPeak)} A</td>
              <td className="text-right">{Math.ceil(totals.powerPeak / voltage / 16)}</td>
            </tr>
          </tbody>
        </table>
        {wall?.power_strategy === 'socapex' && (
          <p className="mt-2 text-sm bg-blue-50 p-2 rounded">
            <strong>Socapex:</strong> {Math.ceil(powerPlan?.length / 6) || 0} tails × 6 circuits
          </p>
        )}
      </div>

      {/* Data Processing Totals */}
      <div className="border-2 border-black p-4 mb-6">
        <h3 className="font-bold text-sm mb-3">DATA PROCESSING</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="border border-gray-300 p-2">
            <p><strong>Processor:</strong> {dataCapacity.processorName}</p>
            <p><strong>Ports:</strong> {portsUsed} / {dataCapacity.ethernetPorts}</p>
          </div>
          <div className="border border-gray-300 p-2">
            <p><strong>Bit Depth:</strong> {colorDepthLabel}</p>
            <p><strong>Receiving:</strong> {receivingCardLabel}</p>
          </div>
          <div className="border border-gray-300 p-2">
            <p><strong>Per-Port Budget:</strong> {dataCapacity.perPortPixelBudget.toLocaleString()} px</p>
            <p><strong>Device Max:</strong> {dataCapacity.maxDevicePixels.toLocaleString()} px</p>
          </div>
        </div>
        <p className="mt-2 text-sm">
          <strong>Wall Pixel Load:</strong> {totalWallPixelsForData.toLocaleString()} px
        </p>
        {(wallPixelsOverLimit || dataPortsOverLimit || runsOverBudget > 0) && (
          <div className="mt-2 text-xs bg-red-50 border border-red-200 rounded p-2 space-y-1">
            {wallPixelsOverLimit && <p>Warning: Wall pixels exceed processor maximum.</p>}
            {dataPortsOverLimit && <p>Warning: Data runs require more ports than available.</p>}
            {runsOverBudget > 0 && <p>Warning: {runsOverBudget} run(s) exceed per-port pixel budget.</p>}
          </div>
        )}
      </div>

      <div style={pageBreakAfterStyle} />

      {/* Wall Diagram */}
      <div className="border border-gray-300 p-4 min-h-[9.7in] flex flex-col justify-start">
        <h3 className="font-bold text-sm mb-3">WALL DIAGRAM</h3>
        <div className="flex justify-center flex-1 items-start">
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            className="border border-gray-200"
          >
            {/* Dimension labels */}
            <text x={canvasWidth / 2 + diagramPadding} y={10} textAnchor="middle" fontSize="10" fill="#666">
              {mmToM(safeGridCols * baseGridWidth)}m ({mmToFt(safeGridCols * baseGridWidth)}')
            </text>
            <text x={11} y={canvasHeight / 2 + diagramPadding} textAnchor="middle" fontSize="10" fill="#666" 
                  transform={`rotate(-90, 11, ${canvasHeight / 2 + diagramPadding})`}>
              {mmToM(safeGridRows * baseGridHeight)}m ({mmToFt(safeGridRows * baseGridHeight)}')
            </text>
            
            <g transform={`translate(${diagramPadding}, ${diagramPadding})`}>
              {/* Grid */}
              {Array.from({ length: safeGridRows + 1 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * cellSize} x2={canvasWidth} y2={i * cellSize} 
                      stroke="#ddd" strokeWidth="0.5" />
              ))}
              {Array.from({ length: safeGridCols + 1 }).map((_, i) => (
                <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={canvasHeight} 
                      stroke="#ddd" strokeWidth="0.5" />
              ))}
              
              {/* Cabinets */}
              {layout.map(item => {
                const variant = cabinets.find(c => c.id === item.cabinet_id);
                if (!variant) return null;
                const spanCols = Math.ceil(variant.width_mm / baseGridWidth);
                const spanRows = Math.ceil(variant.height_mm / baseGridHeight);
                const x = item.col * cellSize;
                const y = item.row * cellSize;
                const w = spanCols * cellSize;
                const h = spanRows * cellSize;
                const powerCircuit = powerCircuitByCabinetId.get(item.id);
                
                return (
                  <g key={item.id}>
                    <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} 
                          fill={item.status === 'spare' ? '#fbbf24' : '#10b981'} 
                          stroke={powerCircuit ? powerCircuit.color.stroke : '#000'}
                          strokeWidth={powerCircuit ? "1.8" : "1"} />
                    <text x={x + w/2} y={y + h/2} textAnchor="middle" dominantBaseline="middle" 
                          fontSize={cabinetLabelFont} fontWeight="bold" fill="#fff">
                      {item.label}
                    </text>
                    {powerCircuit && (
                      <>
                        <rect
                          x={x + w - circuitTagWidth - 2}
                          y={y + 2}
                          width={circuitTagWidth}
                          height={circuitTagHeight}
                          rx="2"
                          fill={powerCircuit.color.fill}
                          stroke={POWER_PATH_OUTLINE}
                          strokeWidth="0.8"
                        />
                        <text
                          x={x + w - (circuitTagWidth / 2) - 2}
                          y={y + (circuitTagHeight / 2) + 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={circuitTagFont}
                          fontWeight="bold"
                          fill="#fff"
                        >
                          {powerCircuit.shortLabel}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Socapex trunk runs */}
              {socapexMode && socapexTailCount > 0 && Array.from({ length: socapexTailCount }).map((_, tailIndex) => {
                const busY = powerOriginSide === 'top'
                  ? -(socaBaseOffset + (tailIndex * socaSpacing))
                  : canvasHeight + socaBaseOffset + (tailIndex * socaSpacing);
                return (
                  <g key={`soca-tail-${tailIndex}`}>
                    <line
                      x1={0}
                      y1={busY}
                      x2={canvasWidth}
                      y2={busY}
                      stroke={POWER_PATH_OUTLINE}
                      strokeWidth={powerOutlineStroke + 0.7}
                      strokeLinecap="round"
                    />
                    <line
                      x1={0}
                      y1={busY}
                      x2={canvasWidth}
                      y2={busY}
                      stroke="#7c3aed"
                      strokeWidth={powerLineStroke + 0.6}
                      strokeLinecap="round"
                    />
                    <text
                      x={4}
                      y={busY - 2}
                      fontSize="6"
                      fill="#5b21b6"
                      fontWeight="bold"
                    >
                      SOCA {tailIndex + 1}
                    </text>
                  </g>
                );
              })}

              {/* Power routes */}
              {powerCircuitsForDrawing.map((circuit) => {
                const firstCabinet = cabinetGeometryById.get(circuit.cabinetIds[0]);
                if (!firstCabinet) return null;

                const anchorX = Math.max(6, Math.min(canvasWidth - 6, circuit.avgX));
                const busY = powerOriginSide === 'top'
                  ? -(socaBaseOffset + (circuit.tailIndex * socaSpacing))
                  : canvasHeight + socaBaseOffset + (circuit.tailIndex * socaSpacing);
                const firstEntryY = powerOriginSide === 'top' ? firstCabinet.entryTopY : firstCabinet.entryBottomY;
                const homeRunPoints = orthogonalPoints(anchorX, powerEntryY, firstCabinet.cx, firstEntryY);

                return (
                  <g key={`power-route-${circuit.id}`}>
                    {socapexMode && (
                      <>
                        <polyline
                          points={`${anchorX},${busY} ${anchorX},${powerEntryY}`}
                          fill="none"
                          stroke={POWER_PATH_OUTLINE}
                          strokeWidth={powerOutlineStroke}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points={`${anchorX},${busY} ${anchorX},${powerEntryY}`}
                          fill="none"
                          stroke={circuit.color.stroke}
                          strokeWidth={powerLineStroke}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    <polyline
                      points={homeRunPoints}
                      fill="none"
                      stroke={POWER_PATH_OUTLINE}
                      strokeWidth={powerOutlineStroke}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={homeRunPoints}
                      fill="none"
                      stroke={circuit.color.stroke}
                      strokeWidth={powerLineStroke}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd={`url(#${circuit.markerId})`}
                    />

                    {circuit.cabinetIds.map((cabinetId, index) => {
                      if (index === circuit.cabinetIds.length - 1) return null;
                      const current = cabinetGeometryById.get(circuit.cabinetIds[index]);
                      const next = cabinetGeometryById.get(circuit.cabinetIds[index + 1]);
                      if (!current || !next) return null;
                      const points = orthogonalPoints(current.cx, current.cy, next.cx, next.cy);
                      return (
                        <g key={`power-chain-${circuit.id}-${cabinetId}`}>
                          <polyline
                            points={points}
                            fill="none"
                            stroke={POWER_PATH_OUTLINE}
                            strokeWidth={Math.max(1.4, powerOutlineStroke - 0.4)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polyline
                            points={points}
                            fill="none"
                            stroke={circuit.color.stroke}
                            strokeWidth={Math.max(1.0, powerLineStroke - 0.25)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerEnd={`url(#${circuit.markerId})`}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              
              {/* Data arrows */}
              {dataRuns.map((run, runIdx) => {
                if (!run.path || run.path.length < 2) return null;
                return run.path.map((pointId, pIdx) => {
                  if (pIdx === run.path.length - 1) return null;
                  const item = layout.find(l => l.id === pointId);
                  const nextItem = layout.find(l => l.id === run.path[pIdx + 1]);
                  if (!item || !nextItem) return null;
                  
                  const variant = cabinets.find(c => c.id === item.cabinet_id);
                  const nextVariant = cabinets.find(c => c.id === nextItem.cabinet_id);
                  const spanCols = variant ? Math.ceil(variant.width_mm / baseGridWidth) : 1;
                  const spanRows = variant ? Math.ceil(variant.height_mm / baseGridHeight) : 1;
                  const nextSpanCols = nextVariant ? Math.ceil(nextVariant.width_mm / baseGridWidth) : 1;
                  const nextSpanRows = nextVariant ? Math.ceil(nextVariant.height_mm / baseGridHeight) : 1;
                  
                  const x1 = (item.col + spanCols/2) * cellSize;
                  const y1 = (item.row + spanRows/2) * cellSize;
                  const x2 = (nextItem.col + nextSpanCols/2) * cellSize;
                  const y2 = (nextItem.row + nextSpanRows/2) * cellSize;
                  const points =
                    x1 === x2 || y1 === y2
                      ? `${x1},${y1} ${x2},${y2}`
                      : `${x1},${y1} ${x2},${y1} ${x2},${y2}`;
                  
                  return (
                    <g key={`${runIdx}-${pIdx}`}>
                      <polyline
                        points={points}
                        fill="none"
                        stroke={DATA_PATH_OUTLINE}
                        strokeWidth={dataOutlineStroke}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke={DATA_PATH_COLOR}
                        strokeWidth={dataLineStroke}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        markerEnd="url(#arrow-data)"
                      />
                    </g>
                  );
                });
              })}
            </g>
            
            <defs>
              {powerCircuitsForDrawing.map((circuit) => (
                <marker
                  key={circuit.markerId}
                  id={circuit.markerId}
                  markerWidth={powerArrowWidth}
                  markerHeight={powerArrowHeight}
                  refX={powerArrowRefX}
                  refY={powerArrowRefY}
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon points={powerArrowPoints} fill={circuit.color.fill} stroke={POWER_PATH_OUTLINE} strokeWidth="0.65" />
                </marker>
              ))}
              <marker
                id="arrow-data"
                markerWidth={dataArrowWidth}
                markerHeight={dataArrowHeight}
                refX={dataArrowRefX}
                refY={dataArrowRefY}
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <polygon points={dataArrowPoints} fill={DATA_PATH_COLOR} stroke={DATA_PATH_OUTLINE} strokeWidth="0.75" />
              </marker>
            </defs>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex gap-6 justify-center mt-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500 border border-black"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 border border-black"></div>
            <span>Spare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded bg-amber-500 border border-gray-900"></div>
            <span>Data Path</span>
          </div>
          {powerCircuitsForDrawing.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded bg-red-500 border border-gray-900"></div>
              <span>Power ({powerOriginSide === 'top' ? 'Top Feed / Flown' : 'Bottom Feed / Ground'})</span>
            </div>
          )}
        </div>
        {powerCircuitsForDrawing.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
            {powerCircuitsForDrawing.map((circuit) => (
              <span
                key={`power-legend-${circuit.id}`}
                className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm border border-gray-900"
                  style={{ backgroundColor: circuit.color.fill }}
                />
                <span>{circuit.shortLabel}</span>
                <span className="text-gray-500">({circuit.cabinetIds.length})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={pageBreakAfterStyle} />

      {/* Loom Summary */}
      {loomBundles.length > 0 && (
        <div className="border border-gray-300 p-4 mb-6">
          <h3 className="font-bold text-sm mb-3">LOOM BUNDLES</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1">Loom</th>
                <th className="text-left py-1">Ports</th>
                <th className="text-left py-1">Origin</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loomBundles.map((loom, idx) => (
                <tr key={idx} className={idx % 2 ? 'bg-gray-50' : ''}>
                  <td className="py-1">{loom.name}</td>
                  <td>{loom.assignedPorts?.join(', ') || '-'}</td>
                  <td>{loom.origin}</td>
                  <td>{loom.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Runs Table */}
      {dataRuns.length > 0 && (
        <div className="border border-gray-300 p-4 mb-6">
          <h3 className="font-bold text-sm mb-3">DATA RUNS</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1">Run</th>
                <th className="text-left py-1">Port</th>
                {loomBundles.length > 0 && <th className="text-left py-1">Loom</th>}
                <th className="text-center py-1">Panels</th>
                <th className="text-right py-1">Pixels</th>
                <th className="text-center py-1">Jumpers</th>
                <th className="text-left py-1">Drop</th>
                <th className="text-left py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataRuns.map((run, idx) => {
                const metrics = metricsByRunId.get(run.id) || {
                  pixelLoad: 0,
                  overPortBudget: false,
                  overPortCount: false
                };
                const overLimit = metrics.overPortBudget || metrics.overPortCount;

                return (
                  <tr key={run.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                    <td className="py-1">{run.label}</td>
                    <td>{run.processor_port || '-'}</td>
                    {loomBundles.length > 0 && <td className="text-xs text-gray-600">{run.loom || '-'}</td>}
                    <td className="text-center">{run.path?.length || 0}</td>
                    <td className="text-right">{metrics.pixelLoad.toLocaleString()}</td>
                    <td className="text-center">{Math.max(0, (run.path?.length || 0) - 1)}</td>
                    <td>{run.home_run_location || '-'}</td>
                    <td className={overLimit ? 'text-red-600 font-semibold' : 'text-emerald-700'}>
                      {overLimit ? 'Over limit' : 'OK'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(hasLoomSection || hasDataRunsSection) && (hasPowerSection || hasCableSection || hasChecklistSection) && (
        <div style={pageBreakAfterStyle} />
      )}

      {/* Power Circuits Table */}
      {powerPlan.length > 0 && (
        <div className="border border-gray-300 p-4 mb-6">
          <h3 className="font-bold text-sm mb-3">POWER CIRCUITS</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1">Circuit</th>
                <th className="text-center py-1">Panels</th>
                <th className="text-right py-1">Typ W</th>
                <th className="text-right py-1">Typ A</th>
                <th className="text-right py-1">Max A</th>
                <th className="text-left py-1">Drop</th>
                <th className="text-left py-1">Distro</th>
              </tr>
            </thead>
            <tbody>
              {powerPlan.map((circuit, idx) => {
                let typW = 0, maxW = 0;
                (circuit.cabinet_ids || []).forEach(id => {
                  const item = layout.find(l => l.id === id);
                  if (!item) return;
                  const v = cabinets.find(c => c.id === item.cabinet_id);
                  if (v) {
                    typW += v.power_typical_w || 0;
                    maxW += v.power_max_w || 0;
                  }
                });
                return (
                  <tr key={circuit.id} className={idx % 2 ? 'bg-gray-50' : ''}>
                    <td className="py-1">{circuit.label}</td>
                    <td className="text-center">{circuit.cabinet_ids?.length || 0}</td>
                    <td className="text-right">{typW}</td>
                    <td className="text-right">{(typW/voltage).toFixed(1)}</td>
                    <td className="text-right">{(maxW/voltage).toFixed(1)}</td>
                    <td className="text-xs">{circuit.drop_location || '-'}</td>
                    <td className="text-xs">{circuit.distro_type || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasPowerSection && (hasCableSection || hasChecklistSection) && (
        <div style={pageBreakAfterStyle} />
      )}

      {/* Cable Pull List */}
      <div className="border border-gray-300 p-4 mb-6">
        <h3 className="font-bold text-sm mb-3">CABLE PULL LIST</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-left py-1">Cable Type</th>
              <th className="text-left py-1">Use</th>
              <th className="text-right py-1">Qty</th>
              <th className="text-left py-1">Est. Length</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">Data Jumpers (RJ45)</td>
              <td>Panel-to-panel</td>
              <td className="text-right">{dataJumpers}</td>
              <td>5ft</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-1">Data Home Runs</td>
              <td>Processor to wall</td>
              <td className="text-right">{dataHomeRuns}</td>
              <td>50-100ft</td>
            </tr>
            <tr>
              <td className="py-1">Power Jumpers</td>
              <td>Panel-to-panel</td>
              <td className="text-right">{powerJumpers}</td>
              <td>5ft</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-1">Power Feeds / Circuits</td>
              <td>Distro to wall</td>
              <td className="text-right">{powerHomeRuns}</td>
              <td>25-50ft</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <div className="border border-gray-300 p-2">
            <strong>Total Data Cables:</strong> {dataJumpers + dataHomeRuns}
          </div>
          <div className="border border-gray-300 p-2">
            <strong>Total Power Cables:</strong> {powerJumpers + powerHomeRuns}
          </div>
        </div>
      </div>

      {hasChecklistSection && <div style={pageBreakAfterStyle} />}

      {/* Crew Checklist */}
      <div className="border border-gray-300 p-4">
        <h3 className="font-bold text-sm mb-3">CREW CHECKLIST</h3>
        <div className="grid grid-cols-2 gap-2">
          {crewChecklist.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="font-mono">{item.checked ? '[x]' : '[ ]'}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 flex justify-between">
        <span>Generated: {new Date().toLocaleString()}</span>
        <span>LED Wall Deployment Designer</span>
      </div>
    </div>
  );
});

DeploymentSheet.displayName = 'DeploymentSheet';

export default DeploymentSheet;
