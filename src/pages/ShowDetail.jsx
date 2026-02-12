import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  ArrowLeft,
  Monitor,
  Zap,
  Weight,
  Ruler,
  Edit2,
  Trash2,
  ChevronRight,
  ArrowUpFromLine,
  ArrowDownToLine,
  Calendar,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { mergeFamiliesWithPopular, mergeVariantsWithPopular } from '@/lib/popular-catalog';

function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const asString = String(value).trim();
  if (!asString) return null;

  const direct = new Date(asString);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const usMatch = asString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]) - 1;
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    const fromUs = new Date(year, month, day);
    return Number.isNaN(fromUs.getTime()) ? null : fromUs;
  }

  return null;
}

function formatDateSafe(value) {
  const parsed = parseDateSafe(value);
  if (parsed) {
    return format(parsed, 'MMM d, yyyy');
  }
  return String(value || '');
}

function parseLayoutDataSafe(layoutData) {
  if (!layoutData) return [];
  if (Array.isArray(layoutData)) return layoutData;
  if (typeof layoutData === 'object') return [];
  try {
    const parsed = JSON.parse(layoutData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ShowDetail() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('id');

  const [showWallDialog, setShowWallDialog] = useState(false);
  const [editingWall, setEditingWall] = useState(null);
  const [wallForm, setWallForm] = useState({
    name: '',
    deployment_type: 'ground_stack',
    voltage_mode: '208v',
    power_strategy: 'edison_20a',
    base_grid_width_mm: 500,
    base_grid_height_mm: 500,
    grid_columns: 8,
    grid_rows: 4
  });

  const { data: show, isLoading: isLoadingShow, isError: isShowError } = useQuery({
    queryKey: ['show', showId],
    queryFn: async () => {
      const shows = await base44.entities.Show.filter({ id: showId });
      return shows[0];
    },
    enabled: !!showId
  });

  const { data: walls = [] } = useQuery({
    queryKey: ['walls', showId],
    queryFn: () => base44.entities.Wall.filter({ show_id: showId }),
    enabled: !!showId
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

  const createWall = useMutation({
    mutationFn: (data) => base44.entities.Wall.create({ ...data, show_id: showId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['walls', showId]);
      setShowWallDialog(false);
      resetWallForm();
    }
  });

  const updateWall = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Wall.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['walls', showId]);
      setShowWallDialog(false);
      resetWallForm();
    }
  });

  const deleteWall = useMutation({
    mutationFn: (id) => base44.entities.Wall.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['walls', showId])
  });

  const resetWallForm = () => {
    setWallForm({
      name: '',
      deployment_type: 'ground_stack',
      voltage_mode: '208v',
      power_strategy: 'edison_20a',
      base_grid_width_mm: 500,
      base_grid_height_mm: 500,
      grid_columns: 8,
      grid_rows: 4
    });
    setEditingWall(null);
  };

  const openEditWallDialog = (wall) => {
    setEditingWall(wall);
    setWallForm({
      name: wall.name || '',
      deployment_type: wall.deployment_type || 'ground_stack',
      voltage_mode: wall.voltage_mode || '208v',
      power_strategy: wall.power_strategy || 'edison_20a',
      base_grid_width_mm: wall.base_grid_width_mm || 500,
      base_grid_height_mm: wall.base_grid_height_mm || 500,
      grid_columns: wall.grid_columns || 8,
      grid_rows: wall.grid_rows || 4
    });
    setShowWallDialog(true);
  };

  const handleSubmitWall = () => {
    const data = {
      ...wallForm,
      base_grid_width_mm: Number(wallForm.base_grid_width_mm),
      base_grid_height_mm: Number(wallForm.base_grid_height_mm),
      grid_columns: Number(wallForm.grid_columns),
      grid_rows: Number(wallForm.grid_rows)
    };
    if (editingWall) {
      updateWall.mutate({ id: editingWall.id, data });
    } else {
      createWall.mutate(data);
    }
  };

  const getWallStats = (wall) => {
    const layout = parseLayoutDataSafe(wall.layout_data);
    let weight = 0, powerTyp = 0, pixelW = 0, pixelH = 0;
    
    layout.forEach(item => {
      const variant = cabinets.find(c => c.id === item.cabinet_id);
      if (variant) {
        weight += variant.weight_kg || 0;
        powerTyp += variant.power_typical_w || 0;
      }
    });

    const widthM = ((wall.grid_columns || 0) * (wall.base_grid_width_mm || 500) / 1000).toFixed(1);
    const heightM = ((wall.grid_rows || 0) * (wall.base_grid_height_mm || 500) / 1000).toFixed(1);

    return { panels: layout.length, weight, powerTyp, widthM, heightM };
  };

  if (isLoadingShow) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading show...</p>
      </div>
    );
  }

  if (isShowError || !show) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 text-lg font-medium">Show not found</p>
          <p className="text-slate-500 mt-1">The show link may be invalid or the record no longer exists.</p>
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl('Shows')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{show.name}</h1>
            <div className="flex items-center gap-4 text-slate-400 mt-1">
              {show.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateSafe(show.date)}
                </span>
              )}
              {show.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {show.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-slate-700 mb-6" />

        {/* Walls Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Walls</h2>
          <Dialog open={showWallDialog} onOpenChange={(open) => { setShowWallDialog(open); if (!open) resetWallForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Wall
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingWall ? 'Edit Wall' : 'Create New Wall'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Wall Name</Label>
                  <Input 
                    value={wallForm.name}
                    onChange={(e) => setWallForm({ ...wallForm, name: e.target.value })}
                    placeholder="e.g., Upstage, IMAG Left"
                    className="bg-slate-700 border-slate-600 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Deployment Type</Label>
                    <Select 
                      value={wallForm.deployment_type} 
                      onValueChange={(v) => setWallForm({ ...wallForm, deployment_type: v })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ground_stack">Ground Stack</SelectItem>
                        <SelectItem value="flown">Flown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Voltage Mode</Label>
                    <Select 
                      value={wallForm.voltage_mode} 
                      onValueChange={(v) => setWallForm({ ...wallForm, voltage_mode: v })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="120v">120V (North America Edison)</SelectItem>
                        <SelectItem value="208v">208V (3-Phase / L21-30)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Power Strategy</Label>
                  <Select 
                    value={wallForm.power_strategy} 
                    onValueChange={(v) => setWallForm({ ...wallForm, power_strategy: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edison_20a">20A Edison Circuits</SelectItem>
                      <SelectItem value="l21_30">L21-30 30A Circuits</SelectItem>
                      <SelectItem value="socapex">Socapex 6-Circuit</SelectItem>
                      <SelectItem value="camlock">Camlock Distro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-slate-700" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Base Grid Width (mm)</Label>
                    <Input 
                      type="number"
                      value={wallForm.base_grid_width_mm}
                      onChange={(e) => setWallForm({ ...wallForm, base_grid_width_mm: e.target.value })}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Base Grid Height (mm)</Label>
                    <Input 
                      type="number"
                      value={wallForm.base_grid_height_mm}
                      onChange={(e) => setWallForm({ ...wallForm, base_grid_height_mm: e.target.value })}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Columns</Label>
                    <Input 
                      type="number"
                      value={wallForm.grid_columns}
                      onChange={(e) => setWallForm({ ...wallForm, grid_columns: e.target.value })}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Rows</Label>
                    <Input 
                      type="number"
                      value={wallForm.grid_rows}
                      onChange={(e) => setWallForm({ ...wallForm, grid_rows: e.target.value })}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleSubmitWall} className="w-full bg-blue-600 hover:bg-blue-700">
                  {editingWall ? 'Update Wall' : 'Create Wall'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {walls.map(wall => {
            const stats = getWallStats(wall);
            return (
              <Card key={wall.id} className="bg-slate-800 border-slate-700 group hover:border-slate-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {wall.deployment_type === 'flown' ? (
                          <ArrowUpFromLine className="w-4 h-4 text-purple-400" />
                        ) : (
                          <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                        )}
                        <Badge className={wall.voltage_mode === '120v' ? 'bg-amber-600' : 'bg-blue-600'}>
                          {wall.voltage_mode === '120v' ? '120V' : '208V'}
                        </Badge>
                      </div>
                      <CardTitle className="text-white">{wall.name}</CardTitle>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => openEditWallDialog(wall)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-red-400"
                        onClick={() => deleteWall.mutate(wall.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Ruler className="w-4 h-4 text-purple-400" />
                      <span>{stats.widthM} × {stats.heightM}m</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span>{stats.panels} panels</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Weight className="w-4 h-4 text-orange-400" />
                      <span>{stats.weight.toFixed(0)}kg</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>{stats.powerTyp}W</span>
                    </div>
                  </div>
                  
                  <Link to={createPageUrl(`WallDesigner?id=${wall.id}`)}>
                    <Button variant="outline" className="w-full group-hover:bg-slate-700">
                      Open Designer
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {walls.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg">
            <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No walls created yet. Add your first wall to start designing.</p>
            <Button 
              onClick={() => setShowWallDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Wall
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
