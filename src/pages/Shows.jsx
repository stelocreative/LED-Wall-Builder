import React, { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  Edit2, 
  Trash2, 
  ChevronRight,
  Monitor,
  Clapperboard
} from 'lucide-react';
import { format } from 'date-fns';

const VALID_STATUSES = ['draft', 'confirmed', 'deployed', 'wrapped'];

function normalizeStatus(value) {
  const normalized = String(value || '').toLowerCase();
  return VALID_STATUSES.includes(normalized) ? normalized : 'draft';
}

function normalizeDateForApi(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateForInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function parseMutationError(error) {
  if (!error) return 'Unknown error.';
  if (typeof error === 'string') return error;
  const details =
    error?.data?.message ||
    error?.data?.error ||
    error?.response?.data?.message ||
    error?.message;
  if (typeof details === 'string') return details;
  if (typeof details === 'number') return String(details);
  if (details && typeof details === 'object') {
    if (typeof details.message === 'string') return details.message;
    if (typeof details.code === 'string') return details.code;
    try {
      return JSON.stringify(details);
    } catch {
      return 'Request failed. Please try again.';
    }
  }
  return 'Request failed. Please try again.';
}

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

function includesIgnoreCase(value, needle) {
  return String(value ?? '').toLowerCase().includes(needle);
}

export default function Shows() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    venue: '',
    client: '',
    notes: '',
    status: 'draft'
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['shows'],
    queryFn: () => base44.entities.Show.list('-created_date')
  });

  const { data: walls = [] } = useQuery({
    queryKey: ['walls'],
    queryFn: () => base44.entities.Wall.list()
  });

  const createShow = useMutation({
    mutationFn: (data) => base44.entities.Show.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      setShowDialog(false);
      resetForm();
      toast({
        title: 'Show created',
        description: 'Your show has been added successfully.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not create show',
        description: parseMutationError(error)
      });
    }
  });

  const updateShow = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Show.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      setShowDialog(false);
      resetForm();
      toast({
        title: 'Show updated',
        description: 'Show details have been saved.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not update show',
        description: parseMutationError(error)
      });
    }
  });

  const deleteShow = useMutation({
    mutationFn: (id) => base44.entities.Show.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      toast({
        title: 'Show deleted',
        description: 'The show was removed.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not delete show',
        description: parseMutationError(error)
      });
    }
  });

  const resetForm = () => {
    setFormData({ name: '', date: '', venue: '', client: '', notes: '', status: 'draft' });
    setEditingShow(null);
  };

  const formatStatusLabel = (status) => {
    const normalized = normalizeStatus(status);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const buildShowPayload = (raw) => ({
    name: (raw.name || '').trim(),
    date: normalizeDateForApi(raw.date) || null,
    venue: (raw.venue || '').trim(),
    client: (raw.client || '').trim(),
    notes: (raw.notes || '').trim(),
    status: normalizeStatus(raw.status)
  });

  const handleSubmit = () => {
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      toast({
        variant: 'destructive',
        title: 'Show name is required',
        description: 'Enter a show name before creating the show.'
      });
      return;
    }

    const payload = buildShowPayload(formData);
    if (editingShow) {
      updateShow.mutate({ id: editingShow.id, data: payload });
    } else {
      createShow.mutate(payload);
    }
  };

  const openEditDialog = (show) => {
    setEditingShow(show);
    setFormData({
      name: show.name || '',
      date: normalizeDateForInput(show.date),
      venue: show.venue || '',
      client: show.client || '',
      notes: show.notes || '',
      status: normalizeStatus(show.status)
    });
    setShowDialog(true);
  };

  const safeShows = Array.isArray(shows) ? shows.filter((item) => item && typeof item === 'object') : [];
  const safeWalls = Array.isArray(walls) ? walls.filter((item) => item && typeof item === 'object') : [];
  const searchNeedle = searchTerm.toLowerCase();
  const filteredShows = safeShows.filter(s => 
    includesIgnoreCase(s?.name, searchNeedle) ||
    includesIgnoreCase(s?.venue, searchNeedle) ||
    includesIgnoreCase(s?.client, searchNeedle)
  );

  const statusColors = {
    draft: 'bg-slate-600',
    confirmed: 'bg-blue-600',
    deployed: 'bg-emerald-600',
    wrapped: 'bg-purple-600'
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shows & Events</h1>
            <p className="text-slate-400 mt-1">Manage your LED wall deployments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search shows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 w-64"
              />
            </div>
            <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Show
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingShow ? 'Edit Show' : 'Create New Show'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Show Name</Label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Summer Tour 2024"
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="bg-slate-700 border-slate-600 mt-1"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(v) => setFormData({ ...formData, status: v })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="deployed">Deployed</SelectItem>
                          <SelectItem value="wrapped">Wrapped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Venue</Label>
                    <Input 
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="e.g., Madison Square Garden"
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Input 
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      placeholder="e.g., Production Company"
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-slate-700 border-slate-600 mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={createShow.isPending || updateShow.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createShow.isPending || updateShow.isPending
                      ? (editingShow ? 'Updating Show...' : 'Creating Show...')
                      : (editingShow ? 'Update Show' : 'Create Show')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShows.map((show, index) => {
            const persistedShowId = show?.id ?? show?._id ?? null;
            const showId = persistedShowId ?? `row-${index}`;
            const showWalls = safeWalls.filter(w => w?.show_id === persistedShowId);
            return (
              <Card key={showId} className="bg-slate-800 border-slate-700 group hover:border-slate-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={statusColors[normalizeStatus(show?.status)] || statusColors.draft}>
                          {formatStatusLabel(show.status)}
                        </Badge>
                        {Number(show?.revision) > 1 && (
                          <Badge variant="outline" className="text-xs">Rev {show.revision}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-white text-lg">{show?.name || 'Untitled Show'}</CardTitle>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        disabled={!persistedShowId}
                        onClick={(e) => { e.preventDefault(); if (persistedShowId) openEditDialog(show); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        disabled={!persistedShowId}
                        onClick={(e) => { e.preventDefault(); if (persistedShowId) deleteShow.mutate(persistedShowId); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-400 mb-4">
                    {show.date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDateSafe(show.date)}
                      </div>
                    )}
                    {show.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {show.venue}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      {showWalls.length} wall{showWalls.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {persistedShowId ? (
                    <Link to={createPageUrl(`ShowDetail?id=${showId}`)}>
                      <Button variant="outline" className="w-full group-hover:bg-slate-700">
                        Open Show
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Missing Show ID
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredShows.length === 0 && (
          <div className="text-center py-16">
            <Clapperboard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No Shows Yet</h2>
            <p className="text-slate-400 mb-6">Create your first show to start designing LED walls</p>
            <Button 
              onClick={() => setShowDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Show
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
