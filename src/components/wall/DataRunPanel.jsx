import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import {
  Cable,
  Plus,
  Trash2,
  Wand2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import {
  PROCESSOR_LIBRARY,
  RECEIVING_CARD_LIBRARY,
  COLOR_DEPTH_OPTIONS,
  getDataCapacity,
  getLayoutItemPixelLoad,
  getRunPixelLoad,
  getWallPixelLoad,
  parsePortIndex
} from '@/lib/processor-catalog';

function parseLoomBundlesSafe(value) {
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

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

export default function DataRunPanel({
  layout,
  cabinets,
  dataRuns = [],
  onDataRunsChange,
  wall,
  onWallUpdate,
  activeRunId = null,
  onActiveRunChange
}) {
  const processorModel = wall?.processor_model || 'mx30';
  const receivingCard = wall?.receiving_card || 'a8s';
  const colorDepth = wall?.color_depth || '10bit';

  const dataCapacity = getDataCapacity({
    processorModel,
    receivingCard,
    colorDepth
  });
  const snakeBlockColumns = parsePositiveInteger(wall?.data_snake_block_columns, 3);

  const totalWallPixels = getWallPixelLoad(layout, cabinets);
  const wallExceedsProcessorLimit = totalWallPixels > dataCapacity.maxDevicePixels;
  const portPixelBudget = dataCapacity.perPortPixelBudget;

  const variantUsageMap = layout.reduce((accumulator, item) => {
    const variant = cabinets.find((cabinet) => cabinet.id === item.cabinet_id);
    if (!variant) {
      return accumulator;
    }

    if (!accumulator[item.cabinet_id]) {
      accumulator[item.cabinet_id] = {
        cabinetId: item.cabinet_id,
        variant,
        count: 0
      };
    }

    accumulator[item.cabinet_id].count += 1;
    return accumulator;
  }, {});

  const panelsPerPortByVariant = Object.values(variantUsageMap)
    .map((entry) => {
      const panelPixels = Math.max(
        0,
        Number(entry.variant?.pixel_width || 0) * Number(entry.variant?.pixel_height || 0)
      );
      const panelsPerPort = panelPixels > 0 ? Math.floor(portPixelBudget / panelPixels) : 0;
      const portsNeededForVariant = panelsPerPort > 0 ? Math.ceil(entry.count / panelsPerPort) : entry.count;

      return {
        ...entry,
        panelPixels,
        panelsPerPort,
        portsNeededForVariant
      };
    })
    .sort((a, b) => b.count - a.count);

  const portsNeededByPixelBudget = totalWallPixels > 0 ? Math.ceil(totalWallPixels / portPixelBudget) : 0;
  const blendedPanelsPerPort = portsNeededByPixelBudget > 0 ? (layout.length / portsNeededByPixelBudget) : 0;

  const runMetrics = dataRuns.map((run) => {
    const pixelLoad = run.pixel_load ?? getRunPixelLoad(run, layout, cabinets);
    const portIndex = run.processor_port_index || parsePortIndex(run.processor_port);
    const overPortBudget = pixelLoad > dataCapacity.perPortPixelBudget;
    const overPortCount = portIndex ? portIndex > dataCapacity.ethernetPorts : false;
    return {
      runId: run.id,
      pixelLoad,
      portIndex,
      overPortBudget,
      overPortCount
    };
  });

  const metricsByRunId = new Map(runMetrics.map((metric) => [metric.runId, metric]));
  const maxPortIndex = runMetrics.reduce((max, metric) => Math.max(max, metric.portIndex || 0), 0);
  const portsUsed = maxPortIndex || dataRuns.length;
  const portsOverLimit = portsUsed > dataCapacity.ethernetPorts;
  const runsOverBudget = runMetrics.filter((metric) => metric.overPortBudget).length;

  const getPreferredStartEdge = () => {
    const rackLocation = wall?.rack_location || 'SL';
    const deploymentType = wall?.deployment_type || 'ground_stack';
    const fohHandoff = wall?.foh_handoff_location || 'SL';

    if (rackLocation === 'FOH') {
      if (deploymentType === 'flown') {
        return fohHandoff === 'SL' ? 'SL top' : fohHandoff === 'SR' ? 'SR top' : 'Top center';
      }
      return fohHandoff === 'SL' ? 'SL bottom' : fohHandoff === 'SR' ? 'SR bottom' : 'Bottom center';
    }

    if (rackLocation === 'USC') {
      return deploymentType === 'flown' ? 'Top center' : 'Bottom center';
    }

    const side = rackLocation === 'SR' ? 'SR' : 'SL';
    return deploymentType === 'flown' ? `${side} top` : `${side} bottom`;
  };

  const buildRunsFromGroups = (groups, modeLabel, options = {}) => {
    if (!layout.length) {
      return [];
    }

    const splitOnBudget = options.splitOnBudget !== false;
    const preferredEdge = getPreferredStartEdge();
    const loomBundles = parseLoomBundlesSafe(wall?.loom_bundles);
    const budget = dataCapacity.perPortPixelBudget;
    const runs = [];
    const now = Date.now();

    const pushRun = (pathIds, pixelLoad, notes) => {
      if (!pathIds.length) {
        return;
      }

      const portNumber = runs.length + 1;
      const loom = loomBundles.length ? loomBundles[(portNumber - 1) % loomBundles.length]?.name || '' : '';
      runs.push({
        id: `run-${now}-${portNumber}`,
        label: `Run ${portNumber}`,
        path: pathIds,
        processor_port: `Port ${portNumber}`,
        processor_port_index: portNumber,
        loom,
        home_run_location: preferredEdge,
        notes,
        pixel_load: pixelLoad,
        pixel_budget: budget,
        over_capacity: pixelLoad > budget,
        port_overflow: portNumber > dataCapacity.ethernetPorts
      });
    };

    groups.forEach((group, groupIndex) => {
      const items = group.items || [];
      const groupLabel = group.label || `Group ${groupIndex + 1}`;

      if (!splitOnBudget) {
        const pixelLoad = items.reduce((sum, item) => sum + getLayoutItemPixelLoad(item, cabinets), 0);
        pushRun(items.map((item) => item.id), pixelLoad, `${modeLabel} • ${groupLabel}`);
        return;
      }

      let currentPath = [];
      let currentPixels = 0;

      items.forEach((item) => {
        const itemPixels = getLayoutItemPixelLoad(item, cabinets);
        const exceedsIfAdded = currentPath.length > 0 && currentPixels + itemPixels > budget;

        if (exceedsIfAdded) {
          pushRun(currentPath, currentPixels, `${modeLabel} • ${groupLabel}`);
          currentPath = [];
          currentPixels = 0;
        }

        currentPath.push(item.id);
        currentPixels += itemPixels;
      });

      pushRun(currentPath, currentPixels, `${modeLabel} • ${groupLabel}`);
    });

    return runs;
  };

  const reportAutoRouteResult = (runs) => {
    const overflowRuns = runs.filter((run) => run.over_capacity || run.port_overflow).length;
    const notices = [];

    if (totalWallPixels > dataCapacity.maxDevicePixels) {
      notices.push("wall exceeds processor max pixels");
    }
    if (runs.length > dataCapacity.ethernetPorts) {
      notices.push("more ports required than available");
    }
    if (overflowRuns > 0) {
      notices.push("one or more runs exceed per-port budget");
    }

    if (notices.length > 0) {
      toast({
        title: "Auto route completed with warnings",
        description: notices.join(" • ")
      });
      return;
    }

    toast({
      title: "Auto route complete",
      description: `Created ${runs.length} runs within ${dataCapacity.processorName} port limits.`
    });
  };

  const autoSnake = () => {
    if (!layout.length) {
      return;
    }

    const orderedRows = Array.from(new Set(layout.map((item) => item.row))).sort((a, b) => a - b);
    const minCol = Math.min(...layout.map((item) => item.col));
    const maxCol = Math.max(...layout.map((item) => item.col));
    const allColumns = Array.from({ length: maxCol - minCol + 1 }, (_, idx) => minCol + idx);
    const budget = dataCapacity.perPortPixelBudget;

    const columnPixelLoad = (column) =>
      layout
        .filter((item) => item.col === column)
        .reduce((sum, item) => sum + getLayoutItemPixelLoad(item, cabinets), 0);

    const splitColumnsForBudget = (columns) => {
      const groups = [];
      let current = [];
      let currentPixels = 0;

      columns.forEach((column) => {
        const colPixels = columnPixelLoad(column);
        if (colPixels <= 0) {
          return;
        }

        if (current.length > 0 && currentPixels + colPixels > budget) {
          groups.push(current);
          current = [column];
          currentPixels = colPixels;
          return;
        }

        current.push(column);
        currentPixels += colPixels;
      });

      if (current.length) {
        groups.push(current);
      }

      return groups;
    };

    const snakeGroups = [];

    for (let start = 0; start < allColumns.length; start += snakeBlockColumns) {
      const blockColumns = allColumns.slice(start, start + snakeBlockColumns);
      const subGroups = splitColumnsForBudget(blockColumns);

      subGroups.forEach((colGroup) => {
        const orderedItems = [];
        let snakeRowIndex = 0;

        orderedRows.forEach((rowValue) => {
          const rowItems = layout
            .filter((item) => item.row === rowValue && colGroup.includes(item.col))
            .sort((a, b) => a.col - b.col);
          if (!rowItems.length) {
            return;
          }

          const rowSequence = snakeRowIndex % 2 === 0 ? rowItems : [...rowItems].reverse();
          orderedItems.push(...rowSequence);
          snakeRowIndex += 1;
        });

        if (!orderedItems.length) {
          return;
        }

        const startCol = Math.min(...colGroup) + 1;
        const endCol = Math.max(...colGroup) + 1;
        snakeGroups.push({
          label: `Cols ${startCol}-${endCol} x ${orderedRows.length} rows`,
          items: orderedItems
        });
      });
    }

    const runs = buildRunsFromGroups(snakeGroups, "Auto Snake Blocks", { splitOnBudget: false });

    onDataRunsChange(runs);
    reportAutoRouteResult(runs);
  };

  const autoColumn = () => {
    if (!layout.length) {
      return;
    }

    const columns = {};
    layout.forEach((item) => {
      if (!columns[item.col]) {
        columns[item.col] = [];
      }
      columns[item.col].push(item);
    });

    const groups = Object.entries(columns)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([col, items]) => ({
        label: `Column ${Number(col) + 1}`,
        items: items.sort((a, b) => a.row - b.row)
      }));

    const runs = buildRunsFromGroups(groups, "Auto Columns");
    onDataRunsChange(runs);
    reportAutoRouteResult(runs);
  };

  const addRun = () => {
    const portNumber = dataRuns.length + 1;
    const newRun = {
      id: `run-${Date.now()}`,
      label: `Run ${portNumber}`,
      path: [],
      processor_port: `Port ${portNumber}`,
      processor_port_index: portNumber,
      home_run_location: getPreferredStartEdge(),
      notes: '',
      pixel_load: 0,
      pixel_budget: dataCapacity.perPortPixelBudget
    };
    onDataRunsChange([...dataRuns, newRun]);
    onActiveRunChange?.(newRun.id);
  };

  const removeRun = (id) => {
    onDataRunsChange(dataRuns.filter((run) => run.id !== id));
    if (activeRunId === id) {
      onActiveRunChange?.(null);
    }
  };

  const clearAllRuns = () => {
    if (!dataRuns.length) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Clear all data runs? This removes all manual and auto-routed paths.');
      if (!confirmed) return;
    }
    onDataRunsChange([]);
    onActiveRunChange?.(null);
    toast({
      title: "Data runs cleared",
      description: "All data routes were removed."
    });
  };

  const totalJumpers = dataRuns.reduce((acc, run) => {
    return acc + Math.max(0, (run.path?.length || 0) - 1);
  }, 0);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Cable className="w-5 h-5 text-blue-400" />
          Data Runs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <div>
            <Label className="text-slate-400 text-xs">Processor</Label>
            <Select
              value={processorModel}
              onValueChange={(value) => onWallUpdate?.({ processor_model: value })}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROCESSOR_LIBRARY).map((processor) => (
                  <SelectItem key={processor.id} value={processor.id}>
                    {processor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-slate-400 text-xs">Color Depth</Label>
              <Select
                value={colorDepth}
                onValueChange={(value) => onWallUpdate?.({ color_depth: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(COLOR_DEPTH_OPTIONS).map((depth) => (
                    <SelectItem key={depth.id} value={depth.id}>
                      {depth.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Receiving Card</Label>
              <Select
                value={receivingCard}
                onValueChange={(value) => onWallUpdate?.({ receiving_card: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RECEIVING_CARD_LIBRARY).map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
            Per-port budget @60Hz: {dataCapacity.perPortPixelBudget.toLocaleString()} px. Processor max: {dataCapacity.maxDevicePixels.toLocaleString()} px across {dataCapacity.ethernetPorts} ports.
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-1">Estimated Panels Per Port</p>
            {panelsPerPortByVariant.length === 0 ? (
              <p className="text-slate-400">Place cabinets on the wall to calculate per-port panel counts.</p>
            ) : (
              <div className="space-y-1.5">
                {panelsPerPortByVariant.slice(0, 4).map((entry) => (
                  <div key={entry.cabinetId} className="rounded border border-slate-700/70 bg-slate-800/40 px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-200 truncate">{entry.variant.variant_name}</span>
                      <span className={`font-semibold whitespace-nowrap ${entry.panelsPerPort > 0 ? 'text-cyan-300' : 'text-red-300'}`}>
                        {entry.panelsPerPort > 0 ? `${entry.panelsPerPort} / port` : 'Over budget'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {entry.count} in wall • {entry.panelPixels.toLocaleString()} px each • ~{entry.portsNeededForVariant} port{entry.portsNeededForVariant === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
                {panelsPerPortByVariant.length > 4 && (
                  <p className="text-[11px] text-slate-400">
                    +{panelsPerPortByVariant.length - 4} more variant{panelsPerPortByVariant.length - 4 === 1 ? '' : 's'}
                  </p>
                )}
                <div className="pt-1 text-[11px] text-slate-300">
                  Current wall mix: ~{blendedPanelsPerPort.toFixed(1)} panels/port ({portsNeededByPixelBudget} port{portsNeededByPixelBudget === 1 ? '' : 's'} by pixel budget).
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-slate-400 text-xs">Snake Block Columns</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={snakeBlockColumns}
                onChange={(e) =>
                  onWallUpdate?.({
                    data_snake_block_columns: parsePositiveInteger(e.target.value, 3)
                  })
                }
                className="bg-slate-700 border-slate-600 mt-1 text-white"
              />
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-[11px] text-slate-300 self-end">
              Snake starts from top row of each block. Ground-stack looms stay bottom-origin; flown looms stay top-origin.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-slate-700/50 rounded">
            <p className="text-xs text-slate-400">Runs</p>
            <p className="text-lg font-bold text-white">{dataRuns.length}</p>
          </div>
          <div className={`p-2 rounded ${portsOverLimit ? 'bg-red-900/40 border border-red-700/50' : 'bg-slate-700/50'}`}>
            <p className="text-xs text-slate-400">Ports Used</p>
            <p className="text-lg font-bold text-white">{portsUsed}/{dataCapacity.ethernetPorts}</p>
          </div>
          <div className="p-2 bg-slate-700/50 rounded">
            <p className="text-xs text-slate-400">Jumpers</p>
            <p className="text-lg font-bold text-white">{totalJumpers}</p>
          </div>
          <div className={`p-2 rounded ${wallExceedsProcessorLimit ? 'bg-red-900/40 border border-red-700/50' : 'bg-slate-700/50'}`}>
            <p className="text-xs text-slate-400">Wall Pixels</p>
            <p className="text-lg font-bold text-white">{totalWallPixels.toLocaleString()}</p>
          </div>
        </div>

        {(wallExceedsProcessorLimit || portsOverLimit || runsOverBudget > 0) && (
          <div className="space-y-1 rounded-md border border-red-700/40 bg-red-900/20 p-2 text-xs text-red-200">
            {wallExceedsProcessorLimit && (
              <p className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Wall pixel load exceeds processor max device capacity.
              </p>
            )}
            {portsOverLimit && (
              <p className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Runs require more ports than this processor has.
              </p>
            )}
            {runsOverBudget > 0 && (
              <p className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {runsOverBudget} run(s) exceed per-port pixel budget.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button size="sm" onClick={addRun} className="w-full bg-slate-700 hover:bg-slate-600">
              <Plus className="w-4 h-4 mr-1" /> Add Run
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={clearAllRuns}
              disabled={!dataRuns.length}
              title="Clear all runs"
              className="border-red-700/70 text-red-300 hover:bg-red-900/30 hover:text-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={autoSnake} variant="outline" className="w-full gap-1">
              <Wand2 className="w-4 h-4" /> Snake
            </Button>
            <Button size="sm" onClick={autoColumn} variant="outline" className="w-full gap-1">
              <Wand2 className="w-4 h-4" /> Columns
            </Button>
          </div>
        </div>

        <div className={`rounded-md border px-3 py-2 text-xs ${activeRunId ? 'border-blue-500/60 bg-blue-900/20 text-blue-100' : 'border-slate-700 bg-slate-900/30 text-slate-300'}`}>
          {activeRunId
            ? 'Routing mode active: click cabinets on the canvas to build this run path.'
            : 'Tip: click Add Run, then click cabinets on the canvas to route manually.'}
        </div>

        <Separator className="bg-slate-700" />

        <div className="space-y-2">
          {dataRuns.map((run, index) => {
            const metrics = metricsByRunId.get(run.id) || {
              pixelLoad: getRunPixelLoad(run, layout, cabinets),
              overPortBudget: false,
              overPortCount: false
            };
            const overLimit = metrics.overPortBudget || metrics.overPortCount;

            const isActive = activeRunId === run.id;

            return (
              <div
                key={run.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${isActive ? 'ring-1 ring-blue-400 bg-blue-900/20' : overLimit ? 'bg-red-900/20 border border-red-700/40' : 'bg-slate-700/30 hover:bg-slate-700/50'}`}
                onClick={() => onActiveRunChange?.(isActive ? null : run.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-white">{run.label}</span>
                    {isActive && (
                      <Badge className="bg-blue-600 text-[10px]">Routing</Badge>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeRun(run.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {run.path?.length || 0} panels
                  </Badge>
                  <ArrowRight className="w-3 h-3" />
                  <span>{run.processor_port || 'Unassigned'}</span>
                  {run.loom && (
                    <>
                      <span>•</span>
                      <span>Loom: {run.loom}</span>
                    </>
                  )}
                  {run.home_run_location && (
                    <>
                      <span>•</span>
                      <span>Drop: {run.home_run_location}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>
                    Pixels: <span className={overLimit ? 'text-red-300 font-semibold' : 'text-slate-200'}>{metrics.pixelLoad.toLocaleString()}</span>
                  </span>
                  <span>Budget: {dataCapacity.perPortPixelBudget.toLocaleString()}</span>
                  {overLimit && <span className="text-red-300 font-semibold">Over limit</span>}
                </div>
              </div>
            );
          })}

          {dataRuns.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-4">
              No data runs defined. Use Snake or Columns for processor-aware auto-routing.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
