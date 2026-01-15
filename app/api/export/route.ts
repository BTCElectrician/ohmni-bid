import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { calculateEstimateFromItems } from '@/lib/tools';
import { DEFAULT_PARAMETERS } from '@/lib/estimate/defaults';

export async function POST(req: Request) {
  const { project, parameters, items } = await req.json();
  const params = { ...DEFAULT_PARAMETERS, ...parameters };
  const calculation = calculateEstimateFromItems(items, params);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Estimate');

  sheet.addRow(['Project', project?.projectName || 'Untitled']);
  sheet.addRow(['Location', project?.location || '']);
  sheet.addRow(['Prepared By', project?.preparedBy || '']);
  sheet.addRow(['Date', project?.date || new Date().toISOString().slice(0, 10)]);
  sheet.addRow([]);

  sheet.addRow([
    'Category',
    'Description',
    'Quantity',
    'Unit',
    'Material Unit Cost',
    'Labor Hours/Unit',
    'Material Extension',
    'Labor Extension',
    'Total Cost'
  ]);

  calculation.lineItems.forEach((item: any) => {
    sheet.addRow([
      item.category,
      item.description,
      item.quantity,
      item.unitType,
      item.materialUnitCost,
      item.laborHoursPerUnit,
      item.materialExtension,
      item.laborExtension,
      item.totalCost
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(['Total Material', calculation.totals.totalMaterial]);
  sheet.addRow(['Total Labor Hours', calculation.totals.totalLaborHours]);
  sheet.addRow(['Subtotal', calculation.totals.subtotal]);
  sheet.addRow(['Overhead & Profit', calculation.totals.overheadProfit]);
  sheet.addRow(['Final Bid', calculation.totals.finalBid]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `estimate-${Date.now()}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
