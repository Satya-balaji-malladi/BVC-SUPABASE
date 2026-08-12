import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../../supabaseClient';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function BulkImporter({ tableName, expectedColumns, onImportSuccess, transformRow }) {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Review/Import, 4: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0) {
            setHeaders(Object.keys(results.data[0]));
            setCsvData(results.data);
            
            // Auto-map matching columns
            const initialMapping = {};
            expectedColumns.forEach(col => {
              const match = Object.keys(results.data[0]).find(h => h.toLowerCase() === col.toLowerCase());
              if (match) initialMapping[col] = match;
            });
            setMapping(initialMapping);
            setStep(2);
          } else {
            setError('The uploaded CSV file is empty.');
          }
        },
        error: (err) => setError(err.message)
      });
    }
  };

  const handleMappingChange = (expectedCol, csvHeader) => {
    setMapping(prev => ({
      ...prev,
      [expectedCol]: csvHeader
    }));
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      // Transform data based on mapping
      let mappedData = csvData.map(row => {
        const newRow = {};
        expectedColumns.forEach(col => {
          if (mapping[col]) {
            newRow[col] = row[mapping[col]];
          }
        });
        return newRow;
      });

      if (transformRow) {
        mappedData = mappedData.map(row => transformRow(row));
      }

      // Bulk insert via Supabase
      const { error: insertError } = await supabase.from(tableName).insert(mappedData);
      if (insertError) throw insertError;

      setStep(4);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setError(err.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 1.5rem 0' }}>Bulk Import Data into {tableName}</h3>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div style={{ border: '2px dashed var(--glass-border)', padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <UploadCloud size={48} color="var(--accent-blue)" style={{ marginBottom: '1rem' }} />
          <h4 style={{ marginBottom: '0.5rem' }}>Upload CSV File</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Upload your file to bulk import records.</p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            id="csv-upload" 
          />
          <label htmlFor="csv-upload" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Select File
          </label>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Map your CSV columns to the required database fields.</p>
          
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {expectedColumns.map(col => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ flex: 1, fontWeight: '500' }}>{col} <span style={{ color: 'var(--error)' }}>*</span></div>
                <ArrowRight size={16} color="var(--text-muted)" />
                <select 
                  className="input-field" 
                  style={{ flex: 1, margin: 0 }}
                  value={mapping[col] || ''}
                  onChange={(e) => handleMappingChange(col, e.target.value)}
                >
                  <option value="">-- Ignore --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Continue to Review</button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Review Import</h4>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>You are about to insert <strong>{csvData.length}</strong> records into the <strong>{tableName}</strong> table.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={loading}>Back to Mapping</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm & Import'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Import Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Successfully imported {csvData.length} records.</p>
          <button className="btn btn-secondary" onClick={() => { setStep(1); setFile(null); setCsvData([]); }}>
            Import Another File
          </button>
        </div>
      )}

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
