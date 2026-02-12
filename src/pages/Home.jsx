import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Monitor, 
  Package, 
  Clapperboard, 
  ChevronRight,
  Plus,
  Zap,
  Weight,
  Grid3X3
} from 'lucide-react';
import { mergeFamiliesWithPopular, mergeVariantsWithPopular } from '@/lib/popular-catalog';

export default function Home() {
  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list('-created_date', 5)
  });

  const { data: walls = [] } = useQuery({
    queryKey: ['walls'],
    queryFn: () => base44.entities.Wall.list()
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <div className="text-center py-12 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full text-blue-400 text-sm mb-4">
            <Monitor className="w-4 h-4" />
            LED Wall Deployment Designer
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Design. Plan. Deploy.
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Professional LED wall deployment planning tool for touring video engineers. 
            Mixed cabinet sizes, voltage-aware power planning, and crew-ready printouts.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to={createPageUrl('Shows')}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 mr-2" />
                New Show
              </Button>
            </Link>
            <Link to={createPageUrl('CabinetLibrary')}>
              <Button size="lg" variant="outline">
                <Package className="w-5 h-5 mr-2" />
                Cabinet Library
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <Clapperboard className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{shows.length}</p>
              <p className="text-sm text-slate-400">Shows</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <Monitor className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{walls.length}</p>
              <p className="text-sm text-slate-400">Walls</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <Grid3X3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{families.length}</p>
              <p className="text-sm text-slate-400">Panel Families</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <Package className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{cabinets.length}</p>
              <p className="text-sm text-slate-400">Cabinet Variants</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Shows */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Recent Shows</CardTitle>
              <Link to={createPageUrl('Shows')}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {shows.length > 0 ? (
                <div className="space-y-3">
                  {shows.slice(0, 5).map(show => {
                    const showWalls = walls.filter(w => w.show_id === show.id);
                    return (
                      <Link 
                        key={show.id} 
                        to={createPageUrl(`ShowDetail?id=${show.id}`)}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{show.name}</p>
                          <p className="text-sm text-slate-400">{show.venue || 'No venue'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{showWalls.length} walls</Badge>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clapperboard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">No shows yet</p>
                  <Link to={createPageUrl('Shows')}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" /> Create Show
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Overview */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Mixed Cabinet Sizes</h4>
                    <p className="text-sm text-slate-400">Combine 500×500 and 500×1000 panels in one wall</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Voltage-Aware Power</h4>
                    <p className="text-sm text-slate-400">120V/208V calculations with min/typ/max/peak</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                    <Weight className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Crew-Ready Printouts</h4>
                    <p className="text-sm text-slate-400">Professional deployment sheets with all specs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
