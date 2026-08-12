import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../services/exportService';

export default function ExportDropdown({
  data = [],
  columns = [],
  filename = 'export',
  title = 'Data Export',
  subtitle = '',
  appliedFilters = [],
  summaryStats = [],
  orientation = 'portrait',
  buttonLabel = 'Export',
  disabled = false,
  onExportAllCSV,
  onExportAllPDF,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCSV = async () => {
    setIsOpen(false);
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }
    setExporting(true);
    setStatusMsg('Preparing CSV...');
    try {
      if (onExportAllCSV) {
        await onExportAllCSV();
      } else {
        exportToCSV({ data, filename, columns });
      }
    } catch (err) {
      console.error('CSV Export Failed', err);
      alert('Unable to export CSV. Please try again.');
    } finally {
      setExporting(false);
      setStatusMsg('');
    }
  };

  const handlePDF = async () => {
    setIsOpen(false);
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }
    setExporting(true);
    setStatusMsg('Generating PDF...');
    try {
      if (onExportAllPDF) {
        await onExportAllPDF();
      } else {
        exportToPDF({
          data,
          filename,
          title,
          subtitle,
          columns,
          appliedFilters,
          summaryStats,
          orientation,
        });
      }
    } catch (err) {
      console.error('PDF Export Failed', err);
      const errMsg = err?.message ? `Unable to generate PDF: ${err.message}` : 'Unable to generate PDF. Please try again.';
      alert(errMsg);
    } finally {
      setExporting(false);
      setStatusMsg('');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          height: '40px',
          fontWeight: '500',
        }}
      >
        {exporting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        <span>{exporting ? statusMsg : buttonLabel}</span>
        <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: '180px',
            padding: '0.35rem',
            borderRadius: '8px',
            zIndex: 100,
            background: 'var(--bg-secondary)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <button
            onClick={handleCSV}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            className="export-opt-btn"
          >
            <FileSpreadsheet size={16} color="#10b981" /> Export CSV
          </button>
          <button
            onClick={handlePDF}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
              marginTop: '0.2rem',
            }}
            className="export-opt-btn"
          >
            <FileText size={16} color="#ef4444" /> Export PDF
          </button>
        </div>
      )}

      <style>{`
        .export-opt-btn:hover {
          background: var(--bg-tertiary) !important;
        }
      `}</style>
    </div>
  );
}
