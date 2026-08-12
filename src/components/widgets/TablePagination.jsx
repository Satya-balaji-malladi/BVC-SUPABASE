import React from 'react';

export default function TablePagination({ 
  totalRows, 
  rowsPerPage, 
  setRowsPerPage, 
  currentPage, 
  setCurrentPage 
}) {
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  const handleRowsChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    setRowsPerPage(val);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        Rows per page: 
        <input 
          type="number" 
          className="input-field" 
          value={rowsPerPage} 
          onChange={handleRowsChange}
          style={{ padding: '0.25rem 0.5rem', height: 'auto', width: '70px', fontSize: '0.875rem' }}
          min="1"
        />
        <span>of {totalRows} records</span>
      </div>
      
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
        >
          Previous
        </button>
        
        <span style={{ margin: '0 0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          className="btn btn-secondary" 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
