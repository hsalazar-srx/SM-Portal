// src/utils/exportToExcel.ts
import * as XLSX from 'xlsx';
import type { InvoiceSummary } from '@/services/invoiceService';

/**
 * Export the full invoice list (all loaded rows, not just the current page) to an
 * Excel workbook and trigger a browser download.
 *
 * Amounts are stored as numbers so Excel SUM/pivot formulas work out of the box.
 * Filename includes the date range for traceability, e.g.:
 *   invoice-extract-2026-01-01-2026-03-31.xlsx
 */
export function exportInvoicesToExcel(
  invoices: InvoiceSummary[],
  fromDate: string,
  toDate: string
): void {
  const rows = invoices.map(inv => ({
    'Invoice No':      inv.invoiceNo,
    'Date':            inv.date,
    'Type':            inv.type,
    'Company':         inv.companyCode,
    'Party Name':      inv.partyName,
    'Currency':        inv.currency,
    'Excl. Tax':       inv.amountExclTax,      // stored as number
    'Tax':             inv.taxAmount,           // stored as number
    'Total Incl. Tax': inv.totalInclTax,        // stored as number
  }));

  const worksheet  = XLSX.utils.json_to_sheet(rows);
  const workbook   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Extract');
  XLSX.writeFile(workbook, `invoice-extract-${fromDate}-${toDate}.xlsx`);
}
