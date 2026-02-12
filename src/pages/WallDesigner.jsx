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

  const baseGridWidth = wall.base_grid_width_mm || 500;
  const baseGridHeight = wall.base_grid_height_mm || 500;
  const gridCols = wall.grid_columns || 8;
  const gridRows = wall.grid_rows || 4;

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
                    baseGridWidth={baseGridWidth}
                    baseGridHeight={baseGridHeight}
                  />
                </TabsContent>

                <TabsContent value="data" className="mt-0">
                  <DataRunPanel
                    layout={layout}
                    cabinets={cabinets}
                    dataRuns={dataRuns}
                    onDataRunsChange={setDataRuns}
                    gridCols={gridCols}
                    gridRows={gridRows}
                    wall={wall}
                  />
                </TabsContent>

                <TabsContent value="power" className="mt-0">
                  <PowerPlanPanel
                    wall={wall}
                    layout={layout}
                    cabinets={cabinets}
                    powerPlan={powerPlan}
                    onPowerPlanChange={setPowerPlan}
                    onStrategyChange={handleStrategyChange}
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
                        <Label className="text-xs text-slate-400">Columns</Label>
                        <Input 
                          type="number"
                          value={gridCols}
                          onChange={(e) => updateWall.mutate({ grid_columns: Number(e.target.value) })}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Rows</Label>
                        <Input 
                          type="number"
                          value={gridRows}
                          onChange={(e) => updateWall.mutate({ grid_rows: Number(e.target.value) })}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-slate-400">Grid Width (mm)</Label>
                        <Input 
                          type="number"
                          value={baseGridWidth}
                          onChange={(e) => updateWall.mutate({ base_grid_width_mm: Number(e.target.value) })}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Grid Height (mm)</Label>
                        <Input 
                          type="number"
                          value={baseGridHeight}
                          onChange={(e) => updateWall.mutate({ base_grid_height_mm: Number(e.target.value) })}
                          className="bg-slate-700 border-slate-600 mt-1 text-white"
                        />
                      </div>
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
