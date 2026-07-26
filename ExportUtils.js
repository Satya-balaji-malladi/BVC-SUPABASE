/**
 * ExportUtils.js
 * Enterprise PDF Report Generator & CSV Exporter.
 */
const ExportUtils = {

  /**
   * Builds a print-ready HTML document for PDF generation with BVC College Header & Footer.
   */
  generatePrintablePdfHtml: function(title, filters, columns, dataRows, summary) {
    title = title || 'BVC System Report';
    filters = filters || {};
    columns = columns || [];
    dataRows = dataRows || [];
    summary = summary || {};

    const nowStr = new Date().toLocaleString();

    let columnsHtml = columns.map(c => `<th style="padding: 10px; border-bottom: 2px solid #333; text-align: left; background: #f8f9fa;">${c}</th>`).join('');

    let rowsHtml = dataRows.map(row => {
      let cells = columns.map(col => `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${row[col] !== undefined ? row[col] : '--'}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    let summaryHtml = '';
    if (Object.keys(summary).length > 0) {
      summaryHtml = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f1f5f9; border-radius: 6px; display: flex; gap: 20px;">
          ${Object.keys(summary).map(k => `<div><strong style="font-size: 11px; text-transform: uppercase; color: #64748b;">${k}</strong><div style="font-size: 18px; font-weight: bold; color: #0f172a;">${summary[k]}</div></div>`).join('')}
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
    .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
    .college-name { font-size: 22px; font-weight: bold; color: #1e3a8a; margin: 0; }
    .sub-header { font-size: 14px; color: #475569; margin-top: 4px; }
    .report-title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 15px; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="college-name">BVC ENGINEERING COLLEGE</div>
    <div class="sub-header">Event Attendance & Management System v2.0</div>
    <div class="report-title">${title}</div>
  </div>

  <div class="meta-bar">
    <div><strong>Generated:</strong> ${nowStr}</div>
    <div><strong>Applied Scope:</strong> ${filters.scope || 'All Records'}</div>
  </div>

  ${summaryHtml}

  <table>
    <thead><tr>${columnsHtml}</tr></thead>
    <tbody>${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="' + columns.length + '" style="text-align:center; padding: 20px;">No records found</td></tr>'}</tbody>
  </table>

  <div class="footer">
    BVC Event Attendance System &copy; 2026 | Confidential Official Report
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
  },

  /**
   * Formats structured objects into a CSV string.
   */
  /**
   * Formats structured objects into a CSV string.
   */
  exportToCsv: function(columns, dataRows) {
    if (!Array.isArray(columns) || !Array.isArray(dataRows)) return '';
    let headerRow = columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    let bodyRows = dataRows.map(row => {
      return columns.map(col => {
        let val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    return headerRow + '\n' + bodyRows;
  },

  /**
   * Generates CSV for user-selected columns or predefined templates (Roll only, Name only, Roll+Name, etc).
   */
  exportCustomCsv: function(selectedColumns, dataRows, templateName) {
    if (!Array.isArray(dataRows)) return '';
    
    let cols = selectedColumns;
    if (templateName === 'ROLL_ONLY') {
      cols = ['Roll Number'];
    } else if (templateName === 'NAME_ONLY') {
      cols = ['Student Name'];
    } else if (templateName === 'ROLL_NAME') {
      cols = ['Roll Number', 'Student Name'];
    } else if (templateName === 'NAME_TIME') {
      cols = ['Student Name', 'Attendance Time'];
    } else if (templateName === 'ROLL_TIME') {
      cols = ['Roll Number', 'Attendance Time'];
    } else if (templateName === 'TIME_ONLY') {
      cols = ['Attendance Time'];
    }

    if (!Array.isArray(cols) || cols.length === 0) {
      cols = ['Roll Number', 'Student Name', 'Department ID', 'Year', 'Section', 'Attendance Status', 'Timestamp'];
    }

    return this.exportToCsv(cols, dataRows);
  }
};
