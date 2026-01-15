'use client';

import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import type { EstimateParameters, LineItem } from '@/lib/estimate/types';
import {
  calculateLaborExtension,
  calculateLineItemTotal,
  calculateMaterialExtension
} from '@/lib/estimate/calc';
import { formatCurrency } from '@/lib/estimate/utils';

interface EstimateGridProps {
  rowData: LineItem[];
  parameters: EstimateParameters;
  onRowDataChange: (items: LineItem[]) => void;
}

export function EstimateGrid({
  rowData,
  parameters,
  onRowDataChange
}: EstimateGridProps) {
  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'category', headerName: 'Category', editable: true, minWidth: 160 },
      { field: 'description', headerName: 'Description', editable: true, flex: 1 },
      { field: 'quantity', headerName: 'Qty', editable: true, width: 90 },
      { field: 'unitType', headerName: 'Unit', editable: true, width: 90 },
      {
        field: 'materialUnitCost',
        headerName: 'Mat Unit',
        editable: true,
        width: 120,
        valueFormatter: params => formatCurrency(params.value || 0)
      },
      {
        field: 'laborHoursPerUnit',
        headerName: 'Labor Hrs',
        editable: true,
        width: 110
      },
      {
        field: 'materialExtension',
        headerName: 'Mat Ext',
        width: 120,
        valueFormatter: params => formatCurrency(params.value || 0)
      },
      {
        field: 'laborExtension',
        headerName: 'Labor Ext',
        width: 110
      },
      {
        field: 'totalCost',
        headerName: 'Total',
        width: 120,
        valueFormatter: params => formatCurrency(params.value || 0)
      }
    ],
    []
  );

  const onCellValueChanged = (event: CellValueChangedEvent<LineItem>) => {
    const updated = rowData.map(item => {
      if (item.id !== event.data.id) return item;
      const materialExtension = calculateMaterialExtension(
        Number(event.data.quantity || 0),
        Number(event.data.materialUnitCost || 0),
        event.data.unitType
      );
      const laborExtension = calculateLaborExtension(
        Number(event.data.quantity || 0),
        Number(event.data.laborHoursPerUnit || 0),
        event.data.unitType
      );
      const totalCost = calculateLineItemTotal(
        materialExtension,
        laborExtension,
        parameters
      );
      return {
        ...event.data,
        materialExtension,
        laborExtension,
        totalCost
      };
    });

    onRowDataChange(updated);
  };

  return (
    <div
      className="ag-theme-quartz glass-panel overflow-hidden rounded-2xl"
      style={{ width: '100%', height: 520 }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true
        }}
        getRowId={params => params.data.id}
        onCellValueChanged={onCellValueChanged}
        domLayout="autoHeight"
      />
    </div>
  );
}
