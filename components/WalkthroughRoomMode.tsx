'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCopy, Plus } from 'lucide-react';

import { createLineItem } from '@/lib/estimate/calc';
import { queueRoomItems } from '@/lib/estimate/roomQueue';
import type { EstimateParameters, EstimateCategory, UnitType } from '@/lib/estimate/types';
import { generateId } from '@/lib/estimate/utils';
import { parseRoomDraft } from '@/lib/walkthrough/roomParser';
import type { RoomDraftCounts } from '@/lib/walkthrough/types';
import { normalizeUnitType } from '@/lib/estimate/unit';

type RoomDraft = {
  id: string;
  name: string;
  length?: number;
  width?: number;
  sqft?: number;
  notes: string;
  counts: RoomDraftCounts;
};

const EMPTY_COUNTS: RoomDraftCounts = {
  outlets: 0,
  switches: 0,
  cans: 0,
  lights: 0,
  smokes: 0
};

const DEVICE_LABELS: Array<{ key: keyof RoomDraftCounts; label: string }> = [
  { key: 'outlets', label: 'Outlets' },
  { key: 'switches', label: 'Switches' },
  { key: 'cans', label: 'Cans' },
  { key: 'lights', label: 'Lights' },
  { key: 'smokes', label: 'Smokes' }
];

const createRoom = (index: number): RoomDraft => ({
  id: `room-${index}-${Date.now()}`,
  name: `Room ${index}`,
  notes: '',
  counts: { ...EMPTY_COUNTS }
});

interface WalkthroughRoomModeProps {
  transcript: string;
  estimateParameters: EstimateParameters;
  initialRooms?: Array<{
    name: string;
    counts: RoomDraftCounts;
    notes?: string;
  }>;
}

type CatalogItem = {
  id: string;
  name: string;
  category?: string | null;
  unit_type?: string | null;
  material_cost?: number | string | null;
  labor_hours?: number | string | null;
};

type RoomLineItem = {
  key: keyof RoomDraftCounts;
  label: string;
  category: EstimateCategory;
  quantity: number;
  unitType: UnitType;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  pricingItemId?: string | null;
  totalCost: number;
};

const DEVICE_MAP: Record<
  keyof RoomDraftCounts,
  { label: string; category: EstimateCategory; query: string }
> = {
  outlets: { label: 'Outlets', category: 'POWER_RECEPTACLES', query: 'duplex receptacle' },
  switches: { label: 'Switches', category: 'POWER_RECEPTACLES', query: 'switch' },
  cans: { label: 'Cans', category: 'INTERIOR_LIGHTING', query: 'recessed can light' },
  lights: { label: 'Lights', category: 'INTERIOR_LIGHTING', query: 'light fixture' },
  smokes: { label: 'Smokes', category: 'FIRE_ALARM', query: 'smoke detector' }
};

export function WalkthroughRoomMode({
  transcript,
  estimateParameters,
  initialRooms
}: WalkthroughRoomModeProps) {
  const [rooms, setRooms] = useState<RoomDraft[]>(() => [createRoom(1)]);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [pricingCache, setPricingCache] = useState<
    Partial<Record<keyof RoomDraftCounts, CatalogItem>>
  >({});
  const [pricingStatus, setPricingStatus] = useState<string | null>(null);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    if (!activeRoomId && rooms[0]) {
      setActiveRoomId(rooms[0].id);
    }
  }, [activeRoomId, rooms]);

  useEffect(() => {
    if (!initialRooms || initialRooms.length === 0) return;
    setRooms(
      initialRooms.map((room, index) => ({
        id: `room-${index + 1}-${Date.now()}`,
        name: room.name,
        notes: room.notes || '',
        counts: { ...room.counts }
      }))
    );
  }, [initialRooms]);

  const activeRoom = useMemo(
    () => rooms.find(room => room.id === activeRoomId) || rooms[0],
    [rooms, activeRoomId]
  );

  const updateRoom = (id: string, patch: Partial<RoomDraft>) => {
    setRooms(current =>
      current.map(room => (room.id === id ? { ...room, ...patch } : room))
    );
  };

  const updateRoomCounts = (id: string, key: keyof RoomDraftCounts, delta: number) => {
    setRooms(current =>
      current.map(room =>
        room.id === id
          ? {
              ...room,
              counts: {
                ...room.counts,
                [key]: Math.max(0, room.counts[key] + delta)
              }
            }
          : room
      )
    );
  };

  const addRoom = () => {
    setRooms(current => [...current, createRoom(current.length + 1)]);
  };

  const applyTranscriptToRoom = (roomId: string, text: string) => {
    const parsed = parseRoomDraft(text);
    setRooms(current =>
      current.map(room => {
        if (room.id !== roomId) return room;
        const nextCounts = { ...room.counts };
        (Object.keys(parsed.counts) as Array<keyof RoomDraftCounts>).forEach(key => {
          nextCounts[key] += parsed.counts[key];
        });
        return {
          ...room,
          notes: parsed.notes || room.notes,
          length: parsed.dimensions?.length ?? room.length,
          width: parsed.dimensions?.width ?? room.width,
          sqft: parsed.dimensions?.sqft ?? room.sqft,
          counts: nextCounts
        };
      })
    );
  };

  useEffect(() => {
    if (!transcript.trim() || !activeRoom) return;
    if (lastTranscriptRef.current === transcript) return;
    lastTranscriptRef.current = transcript;
    applyTranscriptToRoom(activeRoom.id, transcript);
  }, [transcript, activeRoom]);

  const totalSqft = useMemo(
    () => rooms.reduce((sum, room) => sum + (room.sqft || 0), 0),
    [rooms]
  );

  const roomLineItems = useMemo<RoomLineItem[]>(() => {
    if (!activeRoom) return [];
    return (Object.keys(DEVICE_MAP) as Array<keyof RoomDraftCounts>)
      .map(key => {
        const quantity = activeRoom.counts[key] || 0;
        if (!quantity) return null;
        const cached = pricingCache[key];
        const unitType = normalizeUnitType(cached?.unit_type);
        const materialUnitCost = Number(cached?.material_cost || 0);
        const laborHoursPerUnit = Number(cached?.labor_hours || 0);
        const item = createLineItem(
          {
            category: DEVICE_MAP[key].category,
            name: `${DEVICE_MAP[key].label}`,
            materialUnitCost,
            unitType,
            laborHoursPerUnit,
            pricingItemId: cached?.id ?? null
          },
          quantity,
          estimateParameters,
          generateId()
        );
        return {
          key,
          label: DEVICE_MAP[key].label,
          category: DEVICE_MAP[key].category,
          quantity,
          unitType,
          materialUnitCost,
          laborHoursPerUnit,
          pricingItemId: cached?.id ?? null,
          totalCost: item.totalCost
        };
      })
      .filter(Boolean) as RoomLineItem[];
  }, [activeRoom, estimateParameters, pricingCache]);

  const roomSubtotal = useMemo(
    () => roomLineItems.reduce((sum, item) => sum + item.totalCost, 0),
    [roomLineItems]
  );

  const missingPricing = useMemo(() => {
    if (!activeRoom) return false;
    return (Object.keys(DEVICE_MAP) as Array<keyof RoomDraftCounts>).some(key => {
      return activeRoom.counts[key] > 0 && !pricingCache[key];
    });
  }, [activeRoom, pricingCache]);

  const loadPricing = async (key: keyof RoomDraftCounts) => {
    if (pricingCache[key]) return;
    setPricingStatus('Loading pricing...');
    try {
      const response = await fetch('/api/catalog-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: DEVICE_MAP[key].query,
          category: DEVICE_MAP[key].category
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Pricing lookup failed');
      }
      const match = (payload?.items || [])[0];
      if (match) {
        setPricingCache(current => ({ ...current, [key]: match }));
        setPricingStatus(null);
      } else {
        setPricingStatus(`No pricing match for ${DEVICE_MAP[key].label}.`);
      }
    } catch (error) {
      setPricingStatus(
        error instanceof Error ? error.message : 'Pricing lookup failed'
      );
    }
  };

  useEffect(() => {
    if (!activeRoom) return;
    (Object.keys(DEVICE_MAP) as Array<keyof RoomDraftCounts>).forEach(key => {
      if (activeRoom.counts[key] > 0 && !pricingCache[key]) {
        void loadPricing(key);
      }
    });
  }, [activeRoom, pricingCache]);

  const buildRoomSummary = (room: RoomDraft) => {
    const parts = [
      room.name,
      room.sqft ? `${room.sqft} sqft` : null,
      `Outlets ${room.counts.outlets}`,
      `Switches ${room.counts.switches}`,
      `Cans ${room.counts.cans}`,
      `Lights ${room.counts.lights}`,
      `Smokes ${room.counts.smokes}`
    ].filter(Boolean);

    const lines = [parts.join(' • ')];
    if (room.notes) {
      lines.push(room.notes);
    }
    return lines.join('\n');
  };

  const handleCopyRoom = async () => {
    if (!activeRoom) return;
    try {
      await navigator.clipboard.writeText(buildRoomSummary(activeRoom));
      setCopyError(null);
    } catch {
      setCopyError('Copy failed. Try again.');
    }
  };

  const handleQueueRoom = () => {
    if (!activeRoom) return;
    if (missingPricing) {
      setPricingStatus('Pricing still loading. Give it a moment.');
      return;
    }
    const queuedCount = queueRoomItems(
      roomLineItems.map(item => ({
        name: `${activeRoom.name}: ${item.label}`,
        category: item.category,
        quantity: item.quantity,
        unitType: item.unitType,
        materialUnitCost: item.materialUnitCost,
        laborHoursPerUnit: item.laborHoursPerUnit,
        pricingItemId: item.pricingItemId ?? null
      }))
    );
    setPricingStatus(`Queued ${queuedCount} items for the estimate.`);
  };

  if (!activeRoom) return null;

  return (
    <section className="glass-panel rounded-3xl p-6 animate-rise-delayed">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="badge">Room Mode</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-100">
            Walk room-by-room and speak your takeoff.
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Say the dimensions, then device counts. We’ll track square footage
            and a clean draft summary.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="pill">Total {totalSqft.toFixed(0)} sqft</span>
          <span className="pill">
            Room subtotal {roomSubtotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </span>
          <button
            onClick={addRoom}
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            <Plus className="h-4 w-4" />
            Add room
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          {rooms.map(room => {
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  isActive
                    ? 'border-white/20 bg-white/10 text-slate-100'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <div className="font-semibold">{room.name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {room.sqft ? `${room.sqft.toFixed(0)} sqft` : 'Add dimensions'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Room name
              </label>
              <input
                value={activeRoom.name}
                onChange={event => updateRoom(activeRoom.id, { name: event.target.value })}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="pill">
                {activeRoom.sqft ? `${activeRoom.sqft.toFixed(0)} sqft` : 'Sqft --'}
              </span>
              <button
                onClick={handleCopyRoom}
                className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy summary
              </button>
              <button
                onClick={handleQueueRoom}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900"
                disabled={missingPricing || roomLineItems.length === 0}
              >
                Send to estimate
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Length (ft)
              </label>
              <input
                type="number"
                value={activeRoom.length ?? ''}
                onChange={event => {
                  const nextLength = event.target.value
                    ? Number(event.target.value)
                    : undefined;
                  const width = activeRoom.width;
                  updateRoom(activeRoom.id, {
                    length: nextLength,
                    width,
                    sqft:
                      nextLength && width
                        ? Number((nextLength * width).toFixed(2))
                        : undefined
                  });
                }}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Width (ft)
              </label>
              <input
                type="number"
                value={activeRoom.width ?? ''}
                onChange={event => {
                  const nextWidth = event.target.value
                    ? Number(event.target.value)
                    : undefined;
                  const length = activeRoom.length;
                  updateRoom(activeRoom.id, {
                    length,
                    width: nextWidth,
                    sqft:
                      length && nextWidth
                        ? Number((length * nextWidth).toFixed(2))
                        : undefined
                  });
                }}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Device counts
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DEVICE_LABELS.map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRoomCounts(activeRoom.id, item.key, -1)}
                      className="btn-ghost px-2 py-1 text-xs font-semibold text-slate-200"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-slate-100">
                      {activeRoom.counts[item.key]}
                    </span>
                    <button
                      onClick={() => updateRoomCounts(activeRoom.id, item.key, 1)}
                      className="btn-primary px-2 py-1 text-xs font-semibold text-slate-900"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Room estimate preview
            </label>
            <div className="mt-3 space-y-3">
              {roomLineItems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  Add device counts to build a room estimate preview.
                </div>
              ) : (
                roomLineItems.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    <span>
                      {item.quantity} × {item.label}
                    </span>
                    <span className="text-sm text-slate-100">
                      {item.totalCost.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'USD'
                      })}
                    </span>
                  </div>
                ))
              )}
              {pricingStatus ? (
                <p className="text-xs text-slate-400">{pricingStatus}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Room notes
            </label>
            <textarea
              value={activeRoom.notes}
              onChange={event => updateRoom(activeRoom.id, { notes: event.target.value })}
              rows={3}
              placeholder="Say: Basement 28 by 20. Three outlets, one switch, smoke detector."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {copyError ? <p className="mt-3 text-xs text-rose-300">{copyError}</p> : null}
        </div>
      </div>
    </section>
  );
}
