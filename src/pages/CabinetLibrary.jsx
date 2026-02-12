import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, Package, Layers } from 'lucide-react';
import CabinetCard from '../components/library/CabinetCard';
import CabinetForm from '../components/library/CabinetForm';
import FamilyForm from '../components/library/FamilyForm';

export default function CabinetLibrary() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showCabinetForm, setShowCabinetForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [editingCabinet, setEditingCabinet] = useState(null);

  const { data: families = [] } = useQuery({
    queryKey: ['panelFamilies'],
    queryFn: () => base44.entities.PanelFamily.list()
  });

  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinetVariants'],
    queryFn: () => base44.entities.CabinetVariant.list()
  });

  const createFamily = useMutation({
    mutationFn: (data) => base44.entities.PanelFamily.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['panelFamilies']);
      setShowFamilyForm(false);
      setEditingFamily(null);
    }
  });

  const updateFamily = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PanelFamily.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['panelFamilies']);
      setShowFamilyForm(false);
      setEditingFamily(null);
    }
  });

  const deleteFamily = useMutation({
    mutationFn: (id) => base44.entities.PanelFamily.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['panelFamilies'])
  });

  const createCabinet = useMutation({
    mutationFn: (data) => base44.entities.CabinetVariant.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['cabinetVariants']);
      setShowCabinetForm(false);
      setEditingCabinet(null);
    }
  });

  const updateCabinet = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CabinetVariant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['cabinetVariants']);
      setShowCabinetForm(false);
      setEditingCabinet(null);
    }
  });

  const deleteCabinet = useMutation({
    mutationFn: (id) => base44.entities.CabinetVariant.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cabinetVariants'])
  });

  const handleSaveFamily = (data) => {
    if (editingFamily?.id) {
      updateFamily.mutate({ id: editingFamily.id, data });
    } else {
      createFamily.mutate(data);
    }
  };

  const handleSaveCabinet = (data) => {
    if (editingCabinet?.id) {
      updateCabinet.mutate({ id: editingCabinet.id, data });
    } else {
      createCabinet.mutate(data);
    }
  };

  const filteredFamilies = families.filter(f => 
    f.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.family_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCabinets = cabinets.filter(c => {
    const family = families.find(f => f.id === c.panel_family_id);
    return c.variant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           family?.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           family?.family_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cabinet Library</h1>
            <p className="text-slate-400 mt-1">Manage LED panel families and cabinet variants</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 w-64"
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="cabinets" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="cabinets" className="gap-2">
              <Package className="w-4 h-4" />
              Cabinet Variants
            </TabsTrigger>
            <TabsTrigger value="families" className="gap-2">
              <Layers className="w-4 h-4" />
              Panel Families
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cabinets" className="space-y-6">
            <div className="flex justify-end">
              <Button 
                onClick={() => { setEditingCabinet(null); setShowCabinetForm(true); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Cabinet
              </Button>
            </div>

            {showCabinetForm && (
              <CabinetForm 
                families={families}
                variant={editingCabinet}
                family={editingCabinet ? families.find(f => f.id === editingCabinet.panel_family_id) : null}
                onSave={handleSaveCabinet}
                onCancel={() => { setShowCabinetForm(false); setEditingCabinet(null); }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCabinets.map(cabinet => {
                const family = families.find(f => f.id === cabinet.panel_family_id);
                return (
                  <div key={cabinet.id} className="relative group">
                    <CabinetCard variant={cabinet} family={family} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8"
                        onClick={() => { setEditingCabinet(cabinet); setShowCabinetForm(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="h-8 w-8"
                        onClick={() => deleteCabinet.mutate(cabinet.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredCabinets.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No cabinets found. Add your first cabinet variant.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="families" className="space-y-6">
            <div className="flex justify-end">
              <Button 
                onClick={() => { setEditingFamily(null); setShowFamilyForm(true); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Family
              </Button>
            </div>

            {showFamilyForm && (
              <FamilyForm 
                family={editingFamily}
                onSave={handleSaveFamily}
                onCancel={() => { setShowFamilyForm(false); setEditingFamily(null); }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFamilies.map(family => {
                const variantCount = cabinets.filter(c => c.panel_family_id === family.id).length;
                return (
                  <Card key={family.id} className="bg-slate-800 border-slate-700 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white">{family.manufacturer}</CardTitle>
                          <p className="text-slate-300">{family.family_name}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8"
                            onClick={() => { setEditingFamily(family); setShowFamilyForm(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="destructive" 
                            className="h-8 w-8"
                            onClick={() => deleteFamily.mutate(family.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-emerald-600">{family.pixel_pitch}mm</Badge>
                        <Badge variant="outline">{variantCount} variants</Badge>
                        {family.outdoor_rated && (
                          <Badge className="bg-blue-600">Outdoor</Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {family.service_access} access
                        </Badge>
                      </div>
                      {family.rigging_notes && (
                        <p className="text-xs text-slate-400 mt-3">{family.rigging_notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredFamilies.length === 0 && (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No panel families found. Add your first family.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}