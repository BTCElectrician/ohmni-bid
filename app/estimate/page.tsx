'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AuthCard } from '@/components/AuthCard';
import { EstimateAssistant, type DraftLineItem } from '@/components/EstimateAssistant';
import { EstimateChat } from '@/components/EstimateChat';
import { EstimateGrid } from '@/components/EstimateGrid';
import { EstimateHeader } from '@/components/EstimateHeader';
import { ProjectDetails } from '@/components/ProjectDetails';
import { EstimateSummary } from '@/components/EstimateSummary';
import {
  calculateEstimateTotals,
  calculateLineItemTotal,
  createLineItem
} from '@/lib/estimate/calc';
import { consumeCatalogQueue } from '@/lib/estimate/catalogQueue';
import { DEFAULT_PARAMETERS } from '@/lib/estimate/defaults';
import { normalizeLineItems } from '@/lib/estimate/normalize';
import { consumeRoomQueue } from '@/lib/estimate/roomQueue';
import { EMPTY_LINE_ITEM_TEMPLATE, EMPTY_PROJECT } from '@/lib/estimate/templates';
import type { EstimateParameters, LineItem, ProjectInfo } from '@/lib/estimate/types';
import { generateId } from '@/lib/estimate/utils';
import { useWorkspaceAuth } from '@/lib/hooks/useWorkspace';

export default function EstimatePage() {
  const {
    user,
    orgId,
    supabase,
    loading,
    error: authError,
    signInWithEmail,
    signOut
  } = useWorkspaceAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [project, setProject] = useState<ProjectInfo>(EMPTY_PROJECT);
  const [parameters, setParameters] = useState<EstimateParameters>({
    ...DEFAULT_PARAMETERS
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [estimateMetadata, setEstimateMetadata] = useState<Record<string, unknown>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLineItems(items =>
      items.map(item => ({
        ...item,
        totalCost: calculateLineItemTotal(
          item.materialExtension,
          item.laborExtension,
          parameters
        )
      }))
    );
  }, [parameters]);

  const totals = useMemo(
    () => calculateEstimateTotals(lineItems, parameters, project.squareFootage),
    [lineItems, parameters, project.squareFootage]
  );

  const applyQueuedCatalogItems = useCallback(
    (queuedItems: ReturnType<typeof consumeCatalogQueue>) => {
      if (queuedItems.length === 0) return;
      const newItems = queuedItems.map(item =>
        createLineItem(
          {
            category: item.category,
            name: item.name,
            materialUnitCost: item.materialUnitCost,
            unitType: item.unitType,
            laborHoursPerUnit: item.laborHoursPerUnit,
            pricingItemId: item.pricingItemId ?? item.id ?? null
          },
          item.quantity ?? 1,
          parameters,
          generateId()
        )
      );
      setLineItems(items => [...items, ...newItems]);
    },
    [parameters]
  );

  const applyQueuedRoomItems = useCallback(
    (queuedItems: ReturnType<typeof consumeRoomQueue>) => {
      if (queuedItems.length === 0) return;
      const newItems = queuedItems.map(item =>
        createLineItem(
          {
            category: item.category,
            name: item.name,
            materialUnitCost: item.materialUnitCost,
            unitType: item.unitType,
            laborHoursPerUnit: item.laborHoursPerUnit,
            pricingItemId: item.pricingItemId ?? null
          },
          item.quantity || 1,
          parameters,
          generateId()
        )
      );
      setLineItems(items => [...items, ...newItems]);
    },
    [parameters]
  );

  useEffect(() => {
    if (!user || !orgId || hasLoaded) return;

    let active = true;
    setEstimateLoading(true);
    setLoadError(null);

    const loadEstimate = async () => {
      const { data: estimateRow, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (estimateError) {
        setLoadError(estimateError.message);
        setEstimateLoading(false);
        setHasLoaded(true);
        return;
      }

      if (!estimateRow) {
        setEstimateId(null);
        setProject(EMPTY_PROJECT);
        setParameters({ ...DEFAULT_PARAMETERS });
        setLineItems([]);
        setEstimateMetadata({});
        setEstimateLoading(false);
        setHasLoaded(true);
        return;
      }

      const metadata =
        estimateRow.estimate_metadata &&
        typeof estimateRow.estimate_metadata === 'object'
          ? estimateRow.estimate_metadata
          : {};

      setEstimateMetadata(metadata as Record<string, unknown>);

      setEstimateId(estimateRow.id);
      setProject({
        projectName: estimateRow.project_name || 'Untitled Estimate',
        projectNumber: estimateRow.project_number || undefined,
        location: estimateRow.project_location || undefined,
        gcName: estimateRow.gc_name || undefined,
        squareFootage: estimateRow.square_footage || undefined,
        preparedBy:
          typeof (metadata as Record<string, unknown>).prepared_by === 'string'
            ? ((metadata as Record<string, unknown>).prepared_by as string)
            : undefined,
        date:
          typeof (metadata as Record<string, unknown>).bid_date === 'string'
            ? ((metadata as Record<string, unknown>).bid_date as string)
            : undefined
      });
      setParameters({
        laborRate: Number(estimateRow.labor_rate || DEFAULT_PARAMETERS.laborRate),
        materialTaxRate: Number(
          estimateRow.material_tax_rate || DEFAULT_PARAMETERS.materialTaxRate
        ),
        overheadProfitRate: Number(
          estimateRow.overhead_profit_rate ||
            DEFAULT_PARAMETERS.overheadProfitRate
        )
      });

      const { data: lineRows, error: lineError } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateRow.id)
        .order('sort_order', { ascending: true });

      if (!active) return;

      if (lineError) {
        setLoadError(lineError.message);
        setEstimateLoading(false);
        setHasLoaded(true);
        return;
      }

      const mapped = (lineRows || []).map((item: any) => ({
        id: item.id,
        pricingItemId: item.pricing_item_id || null,
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity),
        unitType: item.unit_type,
        materialUnitCost: Number(item.material_unit_cost),
        laborHoursPerUnit: Number(item.labor_hours_per_unit),
        materialExtension: Number(item.material_extension),
        laborExtension: Number(item.labor_extension),
        totalCost: Number(item.total_cost)
      }));

      setLineItems(mapped);
      setEstimateLoading(false);
      setHasLoaded(true);
    };

    loadEstimate();

    return () => {
      active = false;
    };
  }, [user, orgId, hasLoaded, supabase]);

  useEffect(() => {
    if (!hasLoaded) return;
    const queuedItems = consumeCatalogQueue();
    applyQueuedCatalogItems(queuedItems);
    const queuedRoomItems = consumeRoomQueue();
    applyQueuedRoomItems(queuedRoomItems);
  }, [hasLoaded, applyQueuedCatalogItems]);

  useEffect(() => {
    if (!hasLoaded) return;
    const handleQueueCheck = () => {
      const queuedItems = consumeCatalogQueue();
      applyQueuedCatalogItems(queuedItems);
      const queuedRoomItems = consumeRoomQueue();
      applyQueuedRoomItems(queuedRoomItems);
    };
    window.addEventListener('focus', handleQueueCheck);
    window.addEventListener('storage', handleQueueCheck);
    return () => {
      window.removeEventListener('focus', handleQueueCheck);
      window.removeEventListener('storage', handleQueueCheck);
    };
  }, [hasLoaded, applyQueuedCatalogItems, applyQueuedRoomItems]);

  const addRow = () => {
    const lineItem = createLineItem(
      EMPTY_LINE_ITEM_TEMPLATE,
      1,
      parameters,
      generateId()
    );
    setLineItems(items => [...items, lineItem]);
  };

  const handleApplyDrafts = (drafts: DraftLineItem[]) => {
    const newItems = drafts.map(draft => {
      const materialUnitCost =
        draft.suggestedItem?.material_cost ?? draft.materialUnitCost ?? 0;
      const laborHoursPerUnit =
        draft.suggestedItem?.labor_hours ?? draft.laborHoursPerUnit ?? 0;
      const template = {
        category: draft.category,
        name: draft.description,
        materialUnitCost,
        unitType: draft.unitType,
        laborHoursPerUnit,
        pricingItemId: draft.suggestedItem?.id || null
      };
      return createLineItem(template, draft.quantity || 1, parameters, generateId());
    });

    setLineItems(items => [...items, ...newItems]);
  };

  const handleSave = async () => {
    if (!user || !orgId) return;

    setSaveStatus('saving');
    setSaveError(null);

    const normalizedItems = normalizeLineItems(lineItems, parameters);
    setLineItems(normalizedItems);

    const totalsSnapshot = calculateEstimateTotals(
      normalizedItems,
      parameters,
      project.squareFootage
    );

    const metadataPayload = {
      ...estimateMetadata,
      prepared_by: project.preparedBy || null,
      bid_date: project.date || null
    };

    const payload = {
      org_id: orgId,
      user_id: user.id,
      project_name: project.projectName,
      project_number: project.projectNumber || null,
      project_location: project.location || null,
      project_type: null,
      square_footage: project.squareFootage || null,
      gc_name: project.gcName || null,
      contact_name: project.contactName || null,
      contact_email: null,
      contact_phone: null,
      labor_rate: parameters.laborRate,
      material_tax_rate: parameters.materialTaxRate,
      overhead_profit_rate: parameters.overheadProfitRate,
      total_material: totalsSnapshot.totalMaterial,
      total_material_with_tax: totalsSnapshot.totalMaterialWithTax,
      total_labor_hours: totalsSnapshot.totalLaborHours,
      total_labor_cost: totalsSnapshot.totalLaborCost,
      subtotal: totalsSnapshot.subtotal,
      overhead_profit: totalsSnapshot.overheadProfit,
      final_bid: totalsSnapshot.finalBid,
      price_per_sqft: totalsSnapshot.pricePerSqFt || null,
      status: 'draft',
      estimate_metadata: metadataPayload,
      updated_at: new Date().toISOString()
    };

    let persistedEstimateId = estimateId;

    if (estimateId) {
      const { error: updateError } = await supabase
        .from('estimates')
        .update(payload)
        .eq('id', estimateId);

      if (updateError) {
        setSaveStatus('error');
        setSaveError(updateError.message);
        return;
      }
    } else {
      const { data: insertRow, error: insertError } = await supabase
        .from('estimates')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select('id')
        .single();

      if (insertError || !insertRow) {
        setSaveStatus('error');
        setSaveError(insertError?.message || 'Estimate insert failed');
        return;
      }

      persistedEstimateId = insertRow.id;
      setEstimateId(insertRow.id);
    }

    const { error: deleteError } = await supabase
      .from('estimate_line_items')
      .delete()
      .eq('estimate_id', persistedEstimateId);

    if (deleteError) {
      setSaveStatus('error');
      setSaveError(deleteError.message);
      return;
    }

    const linePayload = normalizedItems.map((item, index) => ({
      estimate_id: persistedEstimateId,
      pricing_item_id: item.pricingItemId || null,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit_type: item.unitType,
      material_unit_cost: item.materialUnitCost,
      labor_hours_per_unit: item.laborHoursPerUnit,
      material_extension: item.materialExtension,
      labor_extension: item.laborExtension,
      total_cost: item.totalCost,
      source: 'manual',
      ai_confidence: null,
      ai_notes: null,
      sort_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (linePayload.length > 0) {
      const { error: lineError } = await supabase
        .from('estimate_line_items')
        .insert(linePayload);

      if (lineError) {
        setSaveStatus('error');
        setSaveError(lineError.message);
        return;
      }
    }

    setSaveStatus('saved');
  };

  const handleExport = async () => {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, parameters, items: lineItems })
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimate-${Date.now()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEmailSignIn = async () => {
    if (!authEmail) return;
    const ok = await signInWithEmail(authEmail);
    if (ok) {
      setAuthMessage('Check your email for the sign-in link.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-safe safe-area">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="glass-panel rounded-3xl p-10">
            <h1 className="text-xl font-semibold text-slate-100">Loading workspace</h1>
            <p className="mt-2 text-sm text-slate-300">
              Preparing your estimating session.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-safe safe-area">
        <div className="mx-auto max-w-md px-6 py-16">
          <AuthCard
            email={authEmail}
            onEmailChange={setAuthEmail}
            onSubmit={handleEmailSignIn}
            message={authMessage}
            error={authError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-safe overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-32 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-[120px] animate-float sm:h-80 sm:w-80 sm:blur-[140px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[-80px] h-[300px] w-[300px] rounded-full bg-[var(--accent-2)]/25 blur-[140px] animate-float sm:h-96 sm:w-96 sm:blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/4 h-[320px] w-[320px] rounded-full bg-[var(--accent-3)]/25 blur-[160px] animate-float sm:h-96 sm:w-96 sm:blur-[180px]" />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 animate-rise">
            <EstimateHeader
              projectName={project.projectName}
              onProjectNameChange={value =>
                setProject(current => ({ ...current, projectName: value }))
              }
              userEmail={user.email}
              onAddRow={addRow}
              onSave={handleSave}
              onExport={handleExport}
              onSignOut={signOut}
              saveStatus={saveStatus}
              saveError={saveError}
              loadError={loadError}
              estimateLoading={estimateLoading}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Labor Rate ($/hr)</label>
                <input
                  type="number"
                  value={parameters.laborRate}
                  onChange={event =>
                    setParameters(current => ({
                      ...current,
                      laborRate: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Material Tax Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={parameters.materialTaxRate}
                  onChange={event =>
                    setParameters(current => ({
                      ...current,
                      materialTaxRate: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Overhead & Profit</label>
                <input
                  type="number"
                  step="0.0001"
                  value={parameters.overheadProfitRate}
                  onChange={event =>
                    setParameters(current => ({
                      ...current,
                      overheadProfitRate: Number(event.target.value)
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="animate-rise-delayed">
            <ProjectDetails project={project} onChange={setProject} />
          </div>

          <div className="glass-panel rounded-3xl p-6 animate-rise-delayed">
            <EstimateGrid
              rowData={lineItems}
              parameters={parameters}
              onRowDataChange={setLineItems}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <EstimateAssistant
              project={project}
              parameters={parameters}
              lineItems={lineItems}
              onApplyDrafts={handleApplyDrafts}
            />
            <EstimateChat
              project={project}
              parameters={parameters}
              lineItems={lineItems}
              totals={totals}
            />
          </div>

          <EstimateSummary totals={totals} />
        </div>
      </div>
    </main>
  );
}
