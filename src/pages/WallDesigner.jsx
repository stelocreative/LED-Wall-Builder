import React, { useState, useRef, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Settings,
  Monitor,
  Cable,
  Zap,
  LayoutGrid
} from 'lucide-react';
import WallCanvas from '../components/wall/WallCanvas';
import WallToolbar from '../components/wall/WallToolbar';
import WallSummary from '../components/wall/WallSummary';
import CabinetPalette from '../components/wall/CabinetPalette';
import PowerPlanPanel from '../components/wall/PowerPlanPanel';
import DataRunPanel from '../components/wall/DataRunPanel';
import DeploymentSheet from '../components/print/DeploymentSheet';
import RackLocationPanel from '../components/wall/RackLocationPanel';
import LoomBundlePanel from '../components/wall/LoomBundlePanel';
import PowerEntryPanel from '../components/wall/PowerEntryPanel';
import CrewChecklistPanel from '../components/wall/CrewChecklistPanel';
import RevisionPanel from '../components/wall/RevisionPanel';
import LabelGenerator from '../components/wall/LabelGenerator';
import CablePullList from '../components/wall/CablePullList';
import { mergeFamiliesWithPopular, mergeVariantsWithPopular } from '@/lib/popular-catalog';
import { toast } from "@/components/ui/use-toast";
import { getLayoutItemPixelLoad } from '@/lib/processor-catalog';

const BASE_GRID_MM = 500;
const GRID_UNIT_M = BASE_GRID_MM / 1000;

function parseArrayField(value) {
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

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getVariantSpan(variant, baseGridWidth, baseGridHeight) {
  if (!variant) {
    return { cols: 1, rows: 1 };
  }

  return {
    cols: Math.max(1, Math.round((variant.width_mm || baseGridWidth) / baseGridWidth)),
    rows: Math.max(1, Math.round((variant.height_mm || baseGridHeight) / baseGridHeight))
  };
}

export default function WallDesigner() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const wallId = urlParams.get('id');
  const printRef = useRef();

  const [tool, setTool] = useState('select');
  const [selectedCabinet, setSelectedCabinet] = useState(null);
  const [showDataPaths, setShowDataPaths] = useState(true);
  const [showPowerPaths, setShowPowerPaths] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [activePanel, setActivePanel] = useState('cabinets');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [activeDataRunId, setActiveDataRunId] = useState(null);
  const [activePowerCircuitId, setActivePowerCircuitId] = useState(null);

  const { data: wall, isLoading: wallLoading, isError: wallError } = useQuery({
    queryKey: ['wall', wallId],
    queryFn: async () => {
      const walls = await base44.entities.Wall.filter({ id: wallId });
      return walls[0];
    },
    enabled: !!wallId
  });

  const { data: show } = useQuery({
    queryKey: ['show', wall?.show_id],
    queryFn: async () => {
      const shows = await base44.entities.Show.filter({ id: wall.show_id });
      return shows[0];
    },
    enabled: !!wall?.show_id
  });

  const { data: remoteCabinets = [] } = useQuery({
    queryKey: ['cabinetVariants'],
    queryFn: () => base44.entities.CabinetVariant.list()
  });

  const { data: remoteFamilies = [] } = useQuery({
    queryKey: ['panelFamilies'],
    queryFn: () => base44.entities.PanelFamily.list()
  });

  const families = useMemo(() => mergeFamiliesWithPopular(remoteFamilies), [remoteFamilies]);
  const cabinets = useMemo(() => mergeVariantsWithPopular(remoteCabinets, families), [remoteCabinets, families]);

  const [layout, setLayout] = useState([]);
  const [dataRuns, setDataRuns] = useState([]);
  const [powerPlan, setPowerPlan] = useState([]);

  useEffect(() => {
    if (wall) {
      setLayout(parseArrayField(wall.layout_data));
      setDataRuns(parseArrayField(wall.data_runs));
      setPowerPlan(parseArrayField(wall.power_plan));
      setActiveDataRunId(null);
      setActivePowerCircuitId(null);
    }
  }, [wall]);

  const updateWall = useMutation({
    mutationFn: (data) => base44.entities.Wall.update(wallId, data),
    onSuccess: () => queryClient.invalidateQueries(['wall', wallId])
  });

  const handleSave = () => {
    updateWall.mutate({
      layout_data: JSON.stringify(layout),
      data_runs: JSON.stringify(dataRuns),
      power_plan: JSON.stringify(powerPlan)
    });
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  const activateDataRun = (runId) => {
    setActiveDataRunId(runId);
    if (runId) {
      setActivePowerCircuitId(null);
    }
  };

  const activatePowerCircuit = (circuitId) => {
    setActivePowerCircuitId(circuitId);
    if (circuitId) {
      setActiveDataRunId(null);
    }
  };

  const handleDataRunsChange = (nextRuns) => {
    setDataRuns(nextRuns);
    if (activeDataRunId && !nextRuns.some((run) => run.id === activeDataRunId)) {
      setActiveDataRunId(null);
    }
  };

  const handlePowerPlanChange = (nextPlan) => {
    setPowerPlan(nextPlan);
    if (activePowerCircuitId && !nextPlan.some((circuit) => circuit.id === activePowerCircuitId)) {
      setActivePowerCircuitId(null);
    }
  };

  const computeRunPixelLoad = (pathIds) => {
    return pathIds.reduce((sum, layoutId) => {
      const item = layout.find((layoutItem) => layoutItem.id === layoutId);
      if (!item) {
        return sum;
      }
      return sum + getLayoutItemPixelLoad(item, cabinets);
    }, 0);
  };

  const handleDataRunCabinetClick = (runId, layoutId) => {
    setDataRuns((previousRuns) =>
      previousRuns.map((run) => {
        if (run.id !== runId) {
          return run;
        }

        const currentPath = Array.isArray(run.path) ? run.path : [];
        let nextPath = currentPath;
        const existingIndex = currentPath.indexOf(layoutId);

        if (existingIndex === -1) {
          nextPath = [...currentPath, layoutId];
        } else {
          nextPath = currentPath.slice(0, existingIndex + 1);
        }

        return {
          ...run,
          path: nextPath,
          pixel_load: computeRunPixelLoad(nextPath)
        };
      })
    );
  };

  const handlePowerCircuitCabinetClick = (circuitId, layoutId) => {
    setPowerPlan((previousPlan) => {
      const sanitized = previousPlan.map((circuit) => {
        const ids = Array.isArray(circuit.cabinet_ids) ? circuit.cabinet_ids : [];
        if (circuit.id === circuitId) {
          return {
            ...circuit,
            cabinet_ids: ids
          };
        }
        return {
          ...circuit,
          cabinet_ids: ids.filter((id) => id !== layoutId)
        };
      });

      return sanitized.map((circuit) => {
        if (circuit.id !== circuitId) {
          return circuit;
        }

        const hasCabinet = circuit.cabinet_ids.includes(layoutId);
        return {
          ...circuit,
          cabinet_ids: hasCabinet
            ? circuit.cabinet_ids.filter((id) => id !== layoutId)
            : [...circuit.cabinet_ids, layoutId]
        };
      });
    });
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleStrategyChange = (strategy) => {
    updateWall.mutate({ power_strategy: strategy });
  };

  const handleWallUpdate = (data) => {
    updateWall.mutate(data);
  };

  if (!wallId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 text-lg font-medium">Wall link is missing</p>
          <p className="text-slate-500 mt-1">Open a wall from a show card to launch the designer.</p>
          <Link to={createPageUrl('Shows')}>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shows
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (wallLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading wall...</p>
      </div>
    );
  }

  if (wallError || !wall) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 text-lg font-medium">Wall not found</p>
          <p className="text-slate-500 mt-1">The designer link may be invalid or the wall no longer exists.</p>
          <Link to={createPageUrl('Shows')}>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shows
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const baseGridWidth = BASE_GRID_MM;
  const baseGridHeight = BASE_GRID_MM;
  const gridCols = wall.grid_columns || 8;
  const gridRows = wall.grid_rows || 4;
  const widthMeters = (gridCols * GRID_UNIT_M).toFixed(1);
  const heightMeters = (gridRows * GRID_UNIT_M).toFixed(1);

  const autoPlaceSelectedCabinet = () => {
    if (!selectedCabinet) {
      toast({
        title: "Select a cabinet first",
        description: "Pick a cabinet variant, then click Auto Place."
      });
      return;
    }

    const variant = cabinets.find((cab) => cab.id === selectedCabinet);
    if (!variant) {
      toast({
        title: "Cabinet not found",
        description: "The selected cabinet is missing from the library."
      });
      return;
    }

    const { cols: spanCols, rows: spanRows } = getVariantSpan(variant, baseGridWidth, baseGridHeight);
    const occupancy = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));

    layout.forEach((item) => {
      const itemVariant = cabinets.find((cab) => cab.id === item.cabinet_id);
      const { cols: itemCols, rows: itemRows } = getVariantSpan(itemVariant, baseGridWidth, baseGridHeight);
      for (let row = item.row; row < item.row + itemRows && row < gridRows; row += 1) {
        for (let col = item.col; col < item.col + itemCols && col < gridCols; col += 1) {
          occupancy[row][col] = true;
        }
      }
    });

    const canPlaceAt = (startCol, startRow) => {
      if (startCol + spanCols > gridCols || startRow + spanRows > gridRows) {
        return false;
      }

      for (let row = startRow; row < startRow + spanRows; row += 1) {
        for (let col = startCol; col < startCol + spanCols; col += 1) {
          if (occupancy[row][col]) {
            return false;
          }
        }
      }
      return true;
    };

    const markOccupied = (startCol, startRow) => {
      for (let row = startRow; row < startRow + spanRows; row += 1) {
        for (let col = startCol; col < startCol + spanCols; col += 1) {
          occupancy[row][col] = true;
        }
      }
    };

    const placedItems = [];
    let labelCounter = layout.length + 1;
    const now = Date.now();

    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        if (!canPlaceAt(col, row)) {
          continue;
        }

        markOccupied(col, row);
        placedItems.push({
          id: `cell-${now}-${row}-${col}-${placedItems.length}`,
          col,
          row,
          cabinet_id: selectedCabinet,
          label: `P${labelCounter}`,
          status: 'active'
        });
        labelCounter += 1;
      }
    }

    if (placedItems.length === 0) {
      toast({
        title: "No room for this cabinet size",
        description: `No ${variant.variant_name} positions fit in the remaining open grid.`
      });
      return;
    }

    handleLayoutChange([...layout, ...placedItems]);
    toast({
      title: "Auto Place complete",
      description: `Placed ${placedItems.length} ${variant.variant_name} cabinets.`
    });
  };

  return (
    <>
      <div className={`min-h-screen bg-slate-900 text-white ${showPrintPreview ? 'print:hidden' : ''}`}>
        {/* Header */}
        <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl(`ShowDetail?id=${wall.show_id}`)}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">{wall.name}</h1>
              <p className="text-xs text-slate-400">{show?.name}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge className={wall.deployment_type === 'flown' ? 'bg-purple-600' : 'bg-emerald-600'}>
                {wall.deployment_type === 'flown' ? 'Flown' : 'Ground Stack'}
              </Badge>
              <Badge className={wall.voltage_mode === '120v' ? 'bg-amber-600' : 'bg-blue-600'}>
                {wall.voltage_mode === '120v' ? '120V' : '208V'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={updateWall.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateWall.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Left Sidebar */}
          <div className="w-72 bg-slate-800/50 border-r border-slate-700 flex flex-col">
            <Tabs value={activePanel} onValueChange={setActivePanel} className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-5 m-2">
                <TabsTrigger value="cabinets" className="text-xs px-1">
                  <LayoutGrid className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs px-1">
                  <Cable className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="power" className="text-xs px-1">
                  <Zap className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs px-1">
                  <Monitor className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs px-1">
                  <Settings className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-2">
                <TabsContent value="cabinets" className="mt-0 space-y-4">
                  <WallToolbar
                    tool={tool}
                    onToolChange={setTool}
                    showDataPaths={showDataPaths}
                    showPowerPaths={showPowerPaths}
                    showLabels={showLabels}
                    showMeasurements={showMeasurements}
                    onToggleDataPaths={() => setShowDataPaths(!showDataPaths)}
                    onTogglePowerPaths={() => setShowPowerPaths(!showPowerPaths)}
                    onToggleLabels={() => setShowLabels(!showLabels)}
                    onToggleMeasurements={() => setShowMeasurements(!showMeasurements)}
                  />
                  <CabinetPalette
                    cabinets={cabinets}
                    families={families}
                    selectedCabinet={selectedCabinet}
                    onSelectCabinet={(id) => {
                      setSelectedCabinet(id);
                      if (id) setTool('place');
                    }}
                    onAutoPlace={autoPlaceSelectedCabinet}
                    baseGridWidth={baseGridWidth}
                    baseGridHeight={baseGridHeight}
                  />
                </TabsContent>

                <TabsContent value="data" className="mt-0">
                  <DataRunPanel
                    layout={layout}
                    cabinets={cabinets}
                    dataRuns={dataRuns}
                    onDataRunsChange={handleDataRunsChange}
                    gridCols={gridCols}
                    gridRows={gridRows}
                    wall={wall}
                    onWallUpdate={handleWallUpdate}
                    activeRunId={activeDataRunId}
                    onActiveRunChange={activateDataRun}
                  />
                </TabsContent>

                <TabsContent value="power" className="mt-0">
                  <PowerPlanPanel
                    wall={wall}
                    layout={layout}
                    cabinets={cabinets}
                    powerPlan={powerPlan}
                    onPowerPlanChange={handlePowerPlanChange}
                    onStrategyChange={handleStrategyChange}
                    activeCircuitId={activePowerCircuitId}
                    onActiveCircuitChange={activatePowerCircuit}
                  />
                </TabsContent>

                <TabsContent value="plan" className="mt-0 space-y-4">
                  <RackLocationPanel wall={wall} onWallUpdate={handleWallUpdate} />
                  <LoomBundlePanel wall={wall} onWallUpdate={handleWallUpdate} />
                  <PowerEntryPanel wall={wall} onWallUpdate={handleWallUpdate} />
                  <CrewChecklistPanel wall={wall} onWallUpdate={handleWallUpdate} />
                  <RevisionPanel wall={wall} onWallUpdate={handleWallUpdate} />
                  <LabelGenerator layout={layout} dataRuns={dataRuns} powerPlan={powerPlan} />
                  <CablePullList layout={layout} dataRuns={dataRuns} powerPlan={powerPlan} cabinets={cabinets} />
                </TabsContent>

                <TabsContent value="settings" className="mt-0 space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
                    <h3 className="font-medium text-white">Wall Settings</h3>
                    <div>
                      <Label className="text-xs text-slate-400">Voltage Mode</Label>
                      <Select 
                        value={wall.voltage_mode || '208v'} 
                        onValueChange={(v) => updateWall.mutate({ voltage_mode: v })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="120v">120V (Edison)</SelectItem>
                          <SelectItem value="208v">208V (3-Phase)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Deployment Type</Label>
                      <Select 
                        value={wall.deployment_type || 'ground_stack'} 
                        onValueChange={(v) => updateWall.mutate({ deployment_type: v })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 mt-1 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ground_stack">Ground Stack</SelectItem>
                          <SelectItem value="flown">Flown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator className="bg-slate-700" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-slate-400">Wall Width (m)</Label>
                        <Input 
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={widthMeters}
                          onChange={(e) => {
                            const meters = parsePositiveNumber(e.target.value, gridCols * GRID_UNIT_M);
                            updateWall.mutate({
                              grid_columns: Math.max(1, Math.round(meters / GRID_UNIT_M)),
                              base_grid_width_mm: BASE_GRID_MM
                            });
                          }}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Wall Height (m)</Label>
                        <Input 
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={heightMeters}
                          onChange={(e) => {
                            const meters = parsePositiveNumber(e.target.value, gridRows * GRID_UNIT_M);
                            updateWall.mutate({
                              grid_rows: Math.max(1, Math.round(meters / GRID_UNIT_M)),
                              base_grid_height_mm: BASE_GRID_MM
                            });
                          }}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
                      Base grid is fixed at 500x500mm ({gridCols} columns x {gridRows} rows).
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <WallCanvas
              gridCols={gridCols}
              gridRows={gridRows}
              baseGridWidth={baseGridWidth}
              baseGridHeight={baseGridHeight}
              layout={layout}
              selectedCabinet={selectedCabinet}
              cabinets={cabinets}
              families={families}
              onLayoutChange={handleLayoutChange}
              dataRuns={dataRuns}
              powerPlan={powerPlan}
              showDataPaths={showDataPaths}
              showPowerPaths={showPowerPaths}
              showLabels={showLabels}
              showMeasurements={showMeasurements}
              tool={tool}
              activeDataRunId={activeDataRunId}
              activePowerCircuitId={activePowerCircuitId}
              onDataRunCabinetClick={handleDataRunCabinetClick}
              onPowerCircuitCabinetClick={handlePowerCircuitCabinetClick}
            />
          </div>

          {/* Right Sidebar - Summary */}
          <div className="w-80 bg-slate-800/50 border-l border-slate-700 overflow-y-auto p-4">
            <WallSummary
              wall={wall}
              layout={layout}
              cabinets={cabinets}
              families={families}
              baseGridWidth={baseGridWidth}
              baseGridHeight={baseGridHeight}
              gridCols={gridCols}
              gridRows={gridRows}
            />
          </div>
        </div>
      </div>

      {/* Print View */}
      <div className="hidden print:block">
        <DeploymentSheet
          ref={printRef}
          show={show}
          wall={wall}
          layout={layout}
          cabinets={cabinets}
          families={families}
          dataRuns={dataRuns}
          powerPlan={powerPlan}
          baseGridWidth={baseGridWidth}
          baseGridHeight={baseGridHeight}
          gridCols={gridCols}
          gridRows={gridRows}
        />
      </div>
    </>
  );
}
