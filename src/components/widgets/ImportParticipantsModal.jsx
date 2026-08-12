import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Upload, Loader2, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';

export default function ImportParticipantsModal({ isOpen, onClose, selectedEventId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success/Error
  const [stats, setStats] = useState({ success: 0, errors: 0 });
  const [errorDetails, setErrorDetails] = useState([]);
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected);
      parseCSV(selected);
    } else {
      alert("Please upload a valid CSV file.");
    }
  };

  const parseCSV = (csvFile) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        const rows = results.data;
        if (rows.length === 0) {
          alert("The CSV file is empty.");
          return;
        }
        
        const hasRoll = Object.keys(rows[0]).some(k => k.includes('roll'));
        if (!hasRoll) {
          alert("The CSV must contain a 'Roll Number' column.");
          return;
        }
        
        const mapped = rows.map(r => {
          const keyRoll = Object.keys(r).find(k => k.includes('roll'));
          const keyName = Object.keys(r).find(k => k.includes('name'));
          const keyDept = Object.keys(r).find(k => k.includes('dept') || k.includes('department'));
          const keyYear = Object.keys(r).find(k => k === 'year');
          const keySec = Object.keys(r).find(k => k.includes('sec'));
          
          return {
            roll_number: (r[keyRoll] || '').trim().toUpperCase(),
            student_name: (r[keyName] || '').trim(),
            department_id: `DEPT_${(r[keyDept] || 'AIML').trim().toUpperCase().replace('DEPT_', '')}`,
            year: parseInt(r[keyYear]) || 1,
            section: (r[keySec] || 'A').trim().toUpperCase(),
          };
        }).filter(r => r.roll_number); 

        setParsedData(mapped);
        setStep(2);
      },
      error: (err) => {
        console.error(err);
        alert("Failed to parse CSV file.");
      }
    });
  };

  const handleImport = async () => {
    if (!selectedEventId) {
      alert("No event selected. Please select an event before importing.");
      return;
    }
    
    setImporting(true);
    let successCount = 0;
    let errCount = 0;
    let errMsgs = [];
    
    try {
      // 1. Bulk Upsert Students
      const studentPayloads = parsedData.map(p => ({
        student_id: `STU-${p.roll_number}`,
        roll_number: p.roll_number,
        student_name: p.student_name || 'Unknown',
        department_id: p.department_id,
        year: p.year,
        section: p.section,
        created_at: new Date().toISOString()
      }));

      const batchSize = 500;
      for (let i = 0; i < studentPayloads.length; i += batchSize) {
        const batch = studentPayloads.slice(i, i + batchSize);
        const { error: studentErr } = await supabase
          .from('students')
          .upsert(batch, { onConflict: 'roll_number', ignoreDuplicates: true }); 
          
        if (studentErr) console.warn("Student Upsert Error:", studentErr);
      }

      // 2. Fetch existing participants
      const { data: existing } = await supabase
        .from('event_participants')
        .select('roll_number')
        .eq('event_id', selectedEventId);
        
      const existingRolls = new Set((existing || []).map(p => p.roll_number));
      
      // 3. Filter out existing
      const newParticipants = parsedData.filter(p => !existingRolls.has(p.roll_number));
      
      if (newParticipants.length === 0) {
        setStats({ success: 0, errors: parsedData.length });
        setErrorDetails([{ row: 'All', error: 'All participants are already registered.' }]);
        setStep(3);
        setImporting(false);
        return;
      }

      const participantPayloads = newParticipants.map(p => ({
        participant_id: `P-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        event_id: selectedEventId,
        roll_number: p.roll_number,
        registration_status: 'Registered',
        attendance_status: 'Pending',
        registration_timestamp: new Date().toISOString()
      }));

      // 4. Bulk Insert Participants
      for (let i = 0; i < participantPayloads.length; i += batchSize) {
        const batch = participantPayloads.slice(i, i + batchSize);
        const { error: partErr } = await supabase
          .from('event_participants')
          .insert(batch);
          
        if (partErr) {
          errCount += batch.length;
          errMsgs.push({ row: `Batch ${i/batchSize + 1}`, error: partErr.message });
        } else {
          successCount += batch.length;
        }
      }
      
      errCount += (parsedData.length - newParticipants.length); 
      if (parsedData.length - newParticipants.length > 0) {
        errMsgs.push({ row: 'N/A', error: `${parsedData.length - newParticipants.length} students were already registered and skipped.` });
      }
      
      setStats({ success: successCount, errors: errCount });
      setErrorDetails(errMsgs);
      setStep(3);
      if (successCount > 0) onSuccess?.();
      
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData(null);
    setStep(1);
    setStats({ success: 0, errors: 0 });
    setErrorDetails([]);
  };

  const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
  const dialogStyle = { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', overflow: 'hidden' };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialogStyle}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={20} className="text-primary" />
              Import Participants
            </h4>
            <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>For Event ID: {selectedEventId || 'No Event Selected'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div 
                style={{ border: '2px dashed #dee2e6', borderRadius: '12px', padding: '3rem 2rem', background: '#f8f9fa', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange({ target: { files: [e.dataTransfer.files[0]] } });
                  }
                }}
              >
                <Upload size={48} color="#adb5bd" style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Click or drag CSV file to upload</h5>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '0.875rem' }}>File should contain a <strong>Roll Number</strong> column.</p>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
              
              <div style={{ marginTop: '1.5rem', background: '#e9ecef', padding: '1rem', borderRadius: '8px', textAlign: 'left', fontSize: '0.875rem' }}>
                <strong>Expected CSV Format:</strong>
                <p style={{ margin: '0.5rem 0 0 0', color: '#495057' }}>
                  Roll Number (Required)<br/>
                  Name (Optional)<br/>
                  Department (Optional)<br/>
                  Year (Optional)<br/>
                  Section (Optional)
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ background: '#e8f4fd', border: '1px solid #b6d4fe', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <CheckCircle color="#0d6efd" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h6 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#084298' }}>Successfully parsed {parsedData.length} records</h6>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#052c65' }}>Please review a sample of the data before importing into the database.</p>
                </div>
              </div>

              <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Roll Number</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Dept</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Year/Sec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>{row.roll_number}</td>
                        <td style={{ padding: '0.75rem' }}>{row.student_name || '--'}</td>
                        <td style={{ padding: '0.75rem' }}>{row.department_id}</td>
                        <td style={{ padding: '0.75rem' }}>{row.year}-{row.section}</td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '0.75rem', textAlign: 'center', color: '#6c757d', fontStyle: 'italic', background: '#f8f9fa' }}>
                          ...and {parsedData.length - 5} more records
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              {stats.success > 0 ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <CheckCircle size={56} color="#198754" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#198754', fontWeight: 700 }}>Import Completed</h4>
                  <p style={{ margin: 0, color: '#6c757d' }}>Successfully imported {stats.success} participants.</p>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <AlertTriangle size={56} color="#dc3545" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc3545', fontWeight: 700 }}>Import Failed / Skipped</h4>
                  <p style={{ margin: 0, color: '#6c757d' }}>No new participants were imported.</p>
                </div>
              )}

              {stats.errors > 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #ffecb5', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginTop: '1rem' }}>
                  <h6 style={{ margin: '0 0 0.5rem 0', color: '#664d03', fontWeight: 700 }}>Skipped / Errors ({stats.errors})</h6>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#664d03', fontSize: '0.85rem' }}>
                    {errorDetails.slice(0, 5).map((e, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{e.error}</li>
                    ))}
                    {errorDetails.length > 5 && <li>...and more.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #dee2e6', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {step === 1 && <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', background: '#e9ecef', color: '#495057', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
          
          {step === 2 && (
            <>
              <button onClick={reset} disabled={importing} style={{ padding: '0.6rem 1.5rem', background: '#e9ecef', color: '#495057', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Back</button>
              <button onClick={handleImport} disabled={importing} style={{ padding: '0.6rem 1.5rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {importing ? <><Loader2 size={16} className="spinner" /> Importing...</> : 'Confirm Import'}
              </button>
            </>
          )}

          {step === 3 && (
            <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
