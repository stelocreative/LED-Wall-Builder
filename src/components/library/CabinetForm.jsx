import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from 'lucide-react';

export default function CabinetForm({ families, variant, family, onSave, onCancel }) {
  const [selectedFamilyId, setSelectedFamilyId] = useState(family?.id || '');
  const [formData, setFormData] = useState({
    variant_name: '',
    width_mm: 500,
    height_mm: 500,
    depth_mm: 100,
    pixel_width: 128,
    pixel_height: 128,
    weight_kg: 8,
    power_connector: 'PowerCON TRUE1',
    data_connector: 'RJ45',
    power_min_w: 20,
    power_typical_w: 120,
    power_max_w: 200,
    power_peak_w: 240,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 14,
    cabinets_per_soco_120v: 6,
    cabinets_per_soco_208v: 10,
    ...variant
  });

  useEffect(() => {
    if (variant) {
      setFormData(prev => ({ ...prev, ...variant }));
      setSelectedFamilyId(variant.panel_family_id || '');
    }
  }, [variant]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const labelClass = "mb-1.5 block text-slate-200";
  const controlClass = "bg-slate-700 border-slate-500 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-400/70";
  const compactControlClass = "bg-slate-600 border-slate-500 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-400/70";
  const tabTriggerClass = "text-slate-300 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-sm";
  const selectContentClass = "border-slate-600 bg-slate-800 text-slate-100";

  const handleSubmit = () => {
    onSave({
      ...formData,
      panel_family_id: selectedFamilyId,
      width_mm: Number(formData.width_mm),
      height_mm: Number(formData.height_mm),
      depth_mm: Number(formData.depth_mm),
      pixel_width: Number(formData.pixel_width),
      pixel_height: Number(formData.pixel_height),
      weight_kg: Number(formData.weight_kg),
      power_min_w: Number(formData.power_min_w),
      power_typical_w: Number(formData.power_typical_w),
      power_max_w: Number(formData.power_max_w),
      power_peak_w: Number(formData.power_peak_w),
      peak_factor: Number(formData.peak_factor),
      cabinets_per_20a_120v: Number(formData.cabinets_per_20a_120v),
      cabinets_per_20a_208v: Number(formData.cabinets_per_20a_208v),
      cabinets_per_soco_120v: Number(formData.cabinets_per_soco_120v),
      cabinets_per_soco_208v: Number(formData.cabinets_per_soco_208v),
    });
  };

  return (
    <Card className="bg-slate-800/95 border-slate-700 shadow-xl shadow-black/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center justify-between">
          {variant?.id ? 'Edit Cabinet Variant' : 'Add Cabinet Variant'}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid h-11 grid-cols-3 mb-4 border border-slate-600 bg-slate-700/70 p-1">
            <TabsTrigger value="basic" className={tabTriggerClass}>Basic</TabsTrigger>
            <TabsTrigger value="power" className={tabTriggerClass}>Power</TabsTrigger>
            <TabsTrigger value="planning" className={tabTriggerClass}>Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-1">
            <div>
              <Label className={labelClass}>Panel Family</Label>
              <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                <SelectTrigger className={controlClass}>
                  <SelectValue placeholder="Select family" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {families.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.manufacturer} - {f.family_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={labelClass}>Variant Name</Label>
              <Input 
                value={formData.variant_name}
                onChange={(e) => handleChange('variant_name', e.target.value)}
                placeholder="e.g., 500x500"
                className={controlClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>Width (mm)</Label>
                <Input 
                  type="number"
                  value={formData.width_mm}
                  onChange={(e) => handleChange('width_mm', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Height (mm)</Label>
                <Input 
                  type="number"
                  value={formData.height_mm}
                  onChange={(e) => handleChange('height_mm', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Depth (mm)</Label>
                <Input 
                  type="number"
                  value={formData.depth_mm}
                  onChange={(e) => handleChange('depth_mm', e.target.value)}
                  className={controlClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Pixel Width</Label>
                <Input 
                  type="number"
                  value={formData.pixel_width}
                  onChange={(e) => handleChange('pixel_width', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Pixel Height</Label>
                <Input 
                  type="number"
                  value={formData.pixel_height}
                  onChange={(e) => handleChange('pixel_height', e.target.value)}
                  className={controlClass}
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Weight (kg)</Label>
              <Input 
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
                className={controlClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Power Connector</Label>
                <Input 
                  value={formData.power_connector}
                  onChange={(e) => handleChange('power_connector', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Data Connector</Label>
                <Input 
                  value={formData.data_connector}
                  onChange={(e) => handleChange('data_connector', e.target.value)}
                  className={controlClass}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="power" className="space-y-4 pt-1">
            <p className="text-sm text-slate-400 mb-4">Power draw values in Watts</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Min (Idle/Dark)</Label>
                <Input 
                  type="number"
                  value={formData.power_min_w}
                  onChange={(e) => handleChange('power_min_w', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Typical (Touring)</Label>
                <Input 
                  type="number"
                  value={formData.power_typical_w}
                  onChange={(e) => handleChange('power_typical_w', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Max (Continuous)</Label>
                <Input 
                  type="number"
                  value={formData.power_max_w}
                  onChange={(e) => handleChange('power_max_w', e.target.value)}
                  className={controlClass}
                />
              </div>
              <div>
                <Label className={labelClass}>Peak (Surge)</Label>
                <Input 
                  type="number"
                  value={formData.power_peak_w}
                  onChange={(e) => handleChange('power_peak_w', e.target.value)}
                  className={controlClass}
                />
              </div>
            </div>
            <div>
              <Label className={labelClass}>Peak Factor (if peak not specified)</Label>
              <Input 
                type="number"
                step="0.1"
                value={formData.peak_factor}
                onChange={(e) => handleChange('peak_factor', e.target.value)}
                className={controlClass}
              />
            </div>
          </TabsContent>

          <TabsContent value="planning" className="space-y-4 pt-1">
            <p className="text-sm text-slate-400 mb-4">Recommended cabinets per circuit for planning</p>
            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-3">20A Edison Circuits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={`${labelClass} text-xs`}>@ 120V</Label>
                    <Input 
                      type="number"
                      value={formData.cabinets_per_20a_120v}
                      onChange={(e) => handleChange('cabinets_per_20a_120v', e.target.value)}
                      className={compactControlClass}
                    />
                  </div>
                  <div>
                    <Label className={`${labelClass} text-xs`}>@ 208V</Label>
                    <Input 
                      type="number"
                      value={formData.cabinets_per_20a_208v}
                      onChange={(e) => handleChange('cabinets_per_20a_208v', e.target.value)}
                      className={compactControlClass}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-3">Socapex Circuits</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={`${labelClass} text-xs`}>@ 120V</Label>
                    <Input 
                      type="number"
                      value={formData.cabinets_per_soco_120v}
                      onChange={(e) => handleChange('cabinets_per_soco_120v', e.target.value)}
                      className={compactControlClass}
                    />
                  </div>
                  <div>
                    <Label className={`${labelClass} text-xs`}>@ 208V</Label>
                    <Input 
                      type="number"
                      value={formData.cabinets_per_soco_208v}
                      onChange={(e) => handleChange('cabinets_per_soco_208v', e.target.value)}
                      className={compactControlClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 mt-6">
          <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Cabinet
          </Button>
          <Button
            variant="outline"
            className="border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
