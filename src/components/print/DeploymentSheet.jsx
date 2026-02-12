import React, { forwardRef } from 'react';
import {
  getDataCapacity,
  getRunPixelLoad,
  getWallPixelLoad,
  parsePortIndex
} from '@/lib/processor-catalog';

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

  const cellSize = 40;
  const canvasWidth = gridCols * cellSize;
  const canvasHeight = gridRows * cellSize;

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

      {/* Wall Diagram */}
      <div className="border border-gray-300 p-4 mb-6">
        <h3 className="font-bold text-sm mb-3">WALL DIAGRAM</h3>
        <div className="flex justify-center">
          <svg 
            width={canvasWidth + 60} 
            height={canvasHeight + 60} 
            className="border border-gray-200"
          >
            {/* Dimension labels */}
            <text x={canvasWidth/2 + 30} y={15} textAnchor="middle" fontSize="10" fill="#666">
              {mmToM(gridCols * baseGridWidth)}m ({mmToFt(gridCols * baseGridWidth)}')
            </text>
            <text x={15} y={canvasHeight/2 + 30} textAnchor="middle" fontSize="10" fill="#666" 
                  transform={`rotate(-90, 15, ${canvasHeight/2 + 30})`}>
              {mmToM(gridRows * baseGridHeight)}m ({mmToFt(gridRows * baseGridHeight)}')
            </text>
            
            <g transform="translate(30, 30)">
              {/* Grid */}
              {Array.from({ length: gridRows + 1 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * cellSize} x2={canvasWidth} y2={i * cellSize} 
                      stroke="#ddd" strokeWidth="0.5" />
              ))}
              {Array.from({ length: gridCols + 1 }).map((_, i) => (
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
                
                return (
                  <g key={item.id}>
                    <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} 
                          fill={item.status === 'spare' ? '#fbbf24' : '#10b981'} 
                          stroke="#000" strokeWidth="1" />
                    <text x={x + w/2} y={y + h/2} textAnchor="middle" dominantBaseline="middle" 
                          fontSize="8" fontWeight="bold" fill="#fff">
                      {item.label}
                    </text>
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
                  
                  return (
                    <line key={`${runIdx}-${pIdx}`} x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
                  );
                });
              })}
            </g>
            
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex gap-6 justify-center mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500 border border-black"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 border border-black"></div>
            <span>Spare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <span>Data Path</span>
          </div>
        </div>
      </div>

      {/* Loom Summary */}
      {wall?.loom_bundles && JSON.parse(wall.loom_bundles).length > 0 && (
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
              {JSON.parse(wall.loom_bundles).map((loom, idx) => (
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
                {wall?.loom_bundles && <th className="text-left py-1">Loom</th>}
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
                    {wall?.loom_bundles && <td className="text-xs text-gray-600">{run.loom || '-'}</td>}
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

      {/* Crew Checklist */}
      {wall?.crew_checklist && JSON.parse(wall.crew_checklist).length > 0 && (
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-sm mb-3">CREW CHECKLIST</h3>
          <div className="grid grid-cols-2 gap-2">
            {JSON.parse(wall.crew_checklist).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <input type="checkbox" className="mt-0.5" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
