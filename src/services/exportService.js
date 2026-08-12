import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format date string for filenames
 */
export const getFormattedDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Sanitize filename to remove special characters
 */
export const sanitizeFilename = (filename) => {
  return String(filename || 'export').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
};

/**
 * Reusable CSV Export function
 * Handles commas, quotes, telugu/unicode characters via UTF-8 BOM
 */
export const exportToCSV = ({ data, filename, columns }) => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return false;
  }

  const headers = columns ? columns.map(c => c.header) : Object.keys(data[0]);
  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);

  const csvRows = [];
  
  // Header row
  csvRows.push(headers.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const item of data) {
    const values = keys.map(key => {
      let val = item;
      if (typeof key === 'function') {
        try { val = key(item); } catch (e) { val = ''; }
      } else if (typeof key === 'string' && key.includes('.')) {
        const parts = key.split('.');
        for (const p of parts) {
          val = val ? val[p] : '';
        }
      } else {
        val = item[key];
      }

      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  // Prepend UTF-8 BOM so Excel opens Telugu/Unicode correctly
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const sanitizedName = sanitizeFilename(filename || `export_${getFormattedDate()}`);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizedName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};

/**
 * Reusable PDF Export function using jsPDF and jspdf-autotable
 */
export const exportToPDF = ({
  data,
  filename,
  title,
  subtitle,
  columns,
  appliedFilters = [],
  summaryStats = [],
  orientation = 'portrait',
}) => {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return false;
  }

  try {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header Banner
    doc.setFillColor(30, 58, 95); // Deep Blue #1e3a5f
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('BVC EVENT ATTENDANCE MANAGEMENT SYSTEM', 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(212, 160, 23); // Gold #d4a017
    doc.text(String(title || 'Data Export Report'), 14, 18);

    // Generated info
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    const genDate = `Generated: ${new Date().toLocaleString()}`;
    doc.text(genDate, pageWidth - 14 - doc.getTextWidth(genDate), 18);

    let currentY = 30;

    // Subtitle / Scope
    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(String(subtitle), 14, currentY);
      currentY += 6;
    }

    // Applied Filters Banner
    if (appliedFilters && appliedFilters.length > 0) {
      const filterText = `Applied Filters: ${appliedFilters.filter(Boolean).join(' | ')}`;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY, pageWidth - 28, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(filterText, 17, currentY + 4.8);
      currentY += 10;
    }

    // Summary Statistics Cards
    if (summaryStats && summaryStats.length > 0) {
      const cardWidth = (pageWidth - 28 - (summaryStats.length - 1) * 4) / summaryStats.length;
      summaryStats.forEach((stat, idx) => {
        const x = 14 + idx * (cardWidth + 4);
        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, currentY, cardWidth, 12, 1, 1, 'FD');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(String(stat.label || '').toUpperCase(), x + 3, currentY + 4);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(String(stat.value ?? ''), x + 3, currentY + 10);
      });
      currentY += 16;
    }

    // Prepare table data
    const headers = columns ? columns.map(c => String(c.header || '')) : Object.keys(data[0]);
    const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);

    const body = data.map(item => {
      return keys.map(key => {
        let val = item;
        if (typeof key === 'function') {
          try { val = key(item); } catch (e) { val = ''; }
        } else if (typeof key === 'string' && key.includes('.')) {
          const parts = key.split('.');
          for (const p of parts) {
            val = val ? val[p] : '';
          }
        } else {
          val = item[key];
        }
        return val === null || val === undefined ? '--' : String(val);
      });
    });

    const autoTableOptions = {
      startY: currentY,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [33, 37, 41],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 14, right: 14, top: 28, bottom: 15 },
      didDrawPage: (pageData) => {
        const totalPages = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        
        const footerLeft = 'BVC Educational Institutions — Confidential Attendance Record';
        const footerRight = `Page ${pageData.pageNumber} of ${totalPages}`;
        
        doc.text(footerLeft, 14, pageHeight - 8);
        doc.text(footerRight, pageWidth - 14 - doc.getTextWidth(footerRight), pageHeight - 8);
      },
    };

    // Render AutoTable using direct module function if doc.autoTable isn't attached
    if (typeof autoTable === 'function') {
      autoTable(doc, autoTableOptions);
    } else if (typeof doc.autoTable === 'function') {
      doc.autoTable(autoTableOptions);
    } else {
      throw new Error('autoTable function is unavailable.');
    }

    const sanitizedName = sanitizeFilename(filename || `report_${getFormattedDate()}`);
    doc.save(`${sanitizedName}.pdf`);
    return true;
  } catch (error) {
    console.error('exportToPDF error stack:', error);
    throw error;
  }
};
