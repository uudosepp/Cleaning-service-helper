import { useState } from 'react';
import { Plus, Trash2, MapPin, Building2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingScreen } from '../../components/shared/LoadingScreen';
import { useLocations } from '../../hooks/useLocations';
import { useProperties } from '../../hooks/useProperties';
import { locationsService } from '../../services/locations.service';
import { propertiesService } from '../../services/properties.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import type { Room } from '../../types';

export function AdminLocations() {
  const { locations, loading: locLoading, refetch: refetchLocs } = useLocations();
  const { properties, loading: propLoading, refetch: refetchProps } = useProperties();
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [openLoc, setOpenLoc] = useState(false);
  const [openProp, setOpenProp] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedLocId, setSelectedLocId] = useState('');

  // Location form
  const [locForm, setLocForm] = useState({ name: '', address: '', notes: '' });
  const [creatingLoc, setCreatingLoc] = useState(false);

  // Property form
  const [propForm, setPropForm] = useState({
    name: '', size_m2: '', floor: '', notes: '', roomInput: '',
  });
  const [propRooms, setPropRooms] = useState<Room[]>([]);
  const [creatingProp, setCreatingProp] = useState(false);

  const loading = locLoading || propLoading;

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setCreatingLoc(true);
    try {
      await locationsService.create({ ...locForm, tenant_id: profile.tenant_id });
      setOpenLoc(false);
      setLocForm({ name: '', address: '', notes: '' });
      refetchLocs();
      toast.success(t('loc_added'));
    } catch (err: any) { toast.error(err.message); }
    finally { setCreatingLoc(false); }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !selectedLocId) return;
    setCreatingProp(true);
    try {
      await propertiesService.create({
        tenant_id: profile.tenant_id,
        location_id: selectedLocId,
        name: propForm.name,
        size_m2: propForm.size_m2 ? Number(propForm.size_m2) : undefined,
        floor: propForm.floor || undefined,
        rooms: propRooms,
        notes: propForm.notes || undefined,
      });
      setOpenProp(false);
      setPropForm({ name: '', size_m2: '', floor: '', notes: '', roomInput: '' });
      setPropRooms([]);
      refetchProps();
      toast.success(t('prop_added'));
    } catch (err: any) { toast.error(err.message); }
    finally { setCreatingProp(false); }
  };

  const addRoom = () => {
    const name = propForm.roomInput.trim();
    if (!name) return;
    if (propRooms.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t('prop_room_exists'));
      return;
    }
    setPropRooms(prev => [...prev, { name }]);
    setPropForm(f => ({ ...f, roomInput: '' }));
  };

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDesc, setConfirmDesc] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const handleDeleteLocation = (id: string, name: string) => {
    setConfirmTitle(t('loc_delete_title'));
    setConfirmDesc(t('loc_delete_desc', { name }));
    setConfirmAction(() => async () => {
      try {
        await locationsService.remove(id);
        refetchLocs();
        refetchProps();
        toast.success(t('loc_deleted'));
      } catch (err: any) { toast.error(err.message); }
    });
    setConfirmOpen(true);
  };

  const handleDeleteProperty = (id: string, name: string) => {
    setConfirmTitle(t('prop_delete_title'));
    setConfirmDesc(t('prop_delete_desc', { name }));
    setConfirmAction(() => async () => {
      try {
        await propertiesService.remove(id);
        refetchProps();
        toast.success(t('loc_deleted'));
      } catch (err: any) { toast.error(err.message); }
    });
    setConfirmOpen(true);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <PageHeader
        title={t('nav_locations')}
        description={`${locations.length} ${t('loc_count')}, ${properties.length} ${t('loc_properties_count')}`}
        actions={
          <Dialog open={openLoc} onOpenChange={setOpenLoc}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />{t('loc_add')}</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">{t('loc_new')}</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateLocation} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('name')}</Label>
                  <Input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="Hoone A" required className="mt-1 bg-input-background border-input" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('address')}</Label>
                  <Input value={locForm.address} onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))} placeholder="Pärnu mnt 15, Tallinn" className="mt-1 bg-input-background border-input" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('notes')}</Label>
                  <Textarea value={locForm.notes} onChange={e => setLocForm(f => ({ ...f, notes: e.target.value }))} placeholder="Lisainfo..." rows={2} className="mt-1 bg-input-background border-input" />
                </div>
                <Button type="submit" className="w-full" disabled={creatingLoc}>{creatingLoc ? t('creating') : t('loc_add')}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title={t('loc_none')} description={t('loc_none_desc')} />
      ) : (
        <div className="space-y-3">
          {locations.map(loc => {
            const locProps = properties.filter(p => p.location_id === loc.id);
            const isExpanded = expanded.has(loc.id);
            return (
              <Card key={loc.id} className="bg-card border-border">
                <CardContent className="p-0">
                  {/* Location header */}
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggle(loc.id)}>
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <MapPin className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{loc.name}</div>
                      {loc.address && <div className="text-xs text-muted-foreground truncate">{loc.address}</div>}
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0">{locProps.length} {t('loc_properties_count')}</span>
                    <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-red-400 shrink-0" onClick={e => { e.stopPropagation(); handleDeleteLocation(loc.id, loc.name); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Properties */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4">
                      {locProps.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 py-3">{t('prop_none')}</p>
                      ) : (
                        <div className="space-y-2 mt-3">
                          {locProps.map(prop => (
                            <div key={prop.id} className="bg-muted border border-input rounded p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                    <span className="text-sm font-medium text-foreground">{prop.name}</span>
                                    {prop.size_m2 && <span className="text-xs text-muted-foreground">{prop.size_m2} m²</span>}
                                    {prop.floor && <span className="text-xs text-muted-foreground/60">{prop.floor}. korrus</span>}
                                  </div>
                                  {prop.rooms && prop.rooms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {prop.rooms.map((r: Room, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-card border border-input rounded text-[11px] text-muted-foreground">
                                          {r.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {prop.notes && <p className="text-xs text-muted-foreground/60 mt-1">{prop.notes}</p>}
                                </div>
                                <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-red-400 shrink-0" onClick={() => handleDeleteProperty(prop.id, prop.name)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="outline" size="sm" className="mt-3 text-xs"
                        onClick={() => { setSelectedLocId(loc.id); setOpenProp(true); }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {t('prop_add')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add property dialog */}
      <Dialog open={openProp} onOpenChange={setOpenProp}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">{t('prop_add')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateProperty} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('name')}</Label>
              <Input value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} placeholder="Korter 4A" required className="mt-1 bg-input-background border-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('prop_size')}</Label>
                <Input type="number" value={propForm.size_m2} onChange={e => setPropForm(f => ({ ...f, size_m2: e.target.value }))} placeholder="65" className="mt-1 bg-input-background border-input" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('floor')}</Label>
                <Input value={propForm.floor} onChange={e => setPropForm(f => ({ ...f, floor: e.target.value }))} placeholder="2" className="mt-1 bg-input-background border-input" />
              </div>
            </div>

            {/* Rooms */}
            <div>
              <Label className="text-xs text-muted-foreground">{t('prop_rooms')}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={propForm.roomInput}
                  onChange={e => setPropForm(f => ({ ...f, roomInput: e.target.value }))}
                  placeholder={t('prop_room_hint')}
                  className="bg-input-background border-input"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRoom(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addRoom}>{t('add')}</Button>
              </div>
              {propRooms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {propRooms.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-input rounded text-xs text-foreground">
                      {r.name}
                      <button type="button" onClick={() => setPropRooms(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground/60 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('notes')}</Label>
              <Textarea value={propForm.notes} onChange={e => setPropForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('prop_access_info')} rows={2} className="mt-1 bg-input-background border-input" />
            </div>
            <Button type="submit" className="w-full" disabled={creatingProp}>{creatingProp ? t('creating') : t('prop_add')}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        onConfirm={confirmAction}
      />
    </div>
  );
}
