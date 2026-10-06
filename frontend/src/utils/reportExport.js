import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Clean string formatting for cell values
 */
function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Format column header name into readable title
 */
function humanizeHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Export table report data to .xlsx (Excel)
 */
export function exportReportToExcel(reportData, filenamePrefix = 'management_report') {
  if (!reportData || !reportData.data || !reportData.data.length) {
    alert('No report records to export.');
    return;
  }

  const columns = reportData.columns || Object.keys(reportData.data[0]);
  const formattedRows = reportData.data.map(row => {
    const formattedObj = {};
    columns.forEach(col => {
      const headerTitle = humanizeHeader(col);
      formattedObj[headerTitle] = formatCellValue(row[col]);
    });
    return formattedObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);
  const workbook = XLSX.utils.book_new();
  const sheetName = (reportData.report_id || 'Report').substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanTitle = (reportData.title || filenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export table report data to .pdf (Audit-grade PDF report)
 */
export function exportReportToPdf(reportData, filenamePrefix = 'management_report') {
  if (!reportData || !reportData.data || !reportData.data.length) {
    alert('No report records to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const title = reportData.title || 'Management Governance Report';
  const reportId = reportData.report_id || 'RPT-GEN';
  const persona = reportData.persona || 'GOVERNANCE_ROLE';
  const scope = reportData.scope || 'Enterprise-wide';
  const generatedAt = reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : new Date().toLocaleString();
  const count = reportData.count || reportData.data.length;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 842, 65, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DELEGATION OF AUTHORITY (DOA) PLATFORM', 40, 28);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(153, 246, 228); // teal-200
  doc.text(`Pre-Set Management Report: [${reportId}] ${title}`, 40, 48);

  // Subheader Metadata Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(40, 75, 762, 38, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(40, 75, 762, 38, 'S');

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Scope: `, 50, 92);
  doc.setFont('helvetica', 'normal');
  doc.text(`${scope}`, 90, 92);

  doc.setFont('helvetica', 'bold');
  doc.text(`Persona: `, 320, 92);
  doc.setFont('helvetica', 'normal');
  doc.text(`${persona}`, 370, 92);

  doc.setFont('helvetica', 'bold');
  doc.text(`Generated: `, 560, 92);
  doc.setFont('helvetica', 'normal');
  doc.text(`${generatedAt}`, 620, 92);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Records: `, 50, 106);
  doc.setFont('helvetica', 'normal');
  doc.text(`${count}`, 125, 106);

  // Table Preparation
  const rawCols = reportData.columns || Object.keys(reportData.data[0]);
  const tableHeaders = rawCols.map(c => humanizeHeader(c));
  const tableRows = reportData.data.map(row => rawCols.map(col => formatCellValue(row[col])));

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: 125,
    margin: { left: 40, right: 40, bottom: 40 },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [15, 118, 110], // teal-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: data => {
      // Footer page numbering
      const str = `Page ${doc.internal.getNumberOfPages()} • Confidential Governance Audit Record`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 40, doc.internal.pageSize.height - 20);
    }
  });

  const cleanTitle = (reportData.title || filenamePrefix).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
