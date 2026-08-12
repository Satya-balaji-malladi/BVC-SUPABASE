import React, { useState, useEffect } from 'react';
import { Loader2, Search, UserCheck, ShieldCheck, AlertCircle, X, Check } from 'lucide-react';
import EventAdminService from '../../services/EventAdminService';

export default function InlineCoordinatorModal({ isOpen, onClose, eventId, onCoordinatorCreated }) {
  const [type, setType] = useState('STUDENT'); // 'STUDENT' | 'GUEST' | 'FACULTY'
  
  // Student / Guest Form State (ONLY Name, Roll No/ID, Email, Role)
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    email: '',
  });

  // Faculty Search State
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyResults, setFacultyResults] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [searchingFaculty, setSearchingFaculty] = useState(false);

  // Status State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType('STUDENT');
      setForm({ name: '', identifier: '', email: '' });
      setFacultySearch('');
      setFacultyResults([]);
      setSelectedFaculty(null);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Initial faculty load when Faculty tab is clicked
  useEffect(() => {
    if (isOpen && type === 'FACULTY') {
      handleSearchFaculty('');
    }
  }, [type, isOpen]);

  const handleSearchFaculty = async (query) => {
    setSearchingFaculty(true);
    setError('');
    try {
      const results = await EventAdminService.searchFaculty(query);
      setFacultyResults(results);
    } catch (err) {
      setError(err.message || 'Failed to fetch faculty list');
    } finally {
      setSearchingFaculty(false);
    }
  };

  const handleCreateStudentOrGuest = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.identifier.trim()) return setError('Roll No / ID is required.');
    if (!form.email.trim()) return setError('Email is required.');

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await EventAdminService.createInlineCoordinator({
        coordinatorType: type,
        name: form.name.trim(),
        identifier: form.identifier.trim(),
        email: form.email.trim(),
        eventId: eventId || null
      });

      setSuccess(`${type === 'STUDENT' ? 'Student' : 'Guest'} Coordinator created successfully!`);
      setTimeout(() => {
        onCoordinatorCreated?.(result);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to create coordinator');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFaculty = async () => {
    if (!selectedFaculty) return setError('Please select a faculty member first.');

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await EventAdminService.createInlineCoordinator({
        coordinatorType: 'FACULTY',
        facultyUserId: selectedFaculty.user_id,
        eventId: eventId || null
      });

      setSuccess(`Faculty Coordinator (${selectedFaculty.faculty_name}) assigned successfully!`);
      setTimeout(() => {
        onCoordinatorCreated?.({ ...result, ...selectedFaculty });
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to assign faculty coordinator');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={(e) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) onClose();
    }}>
      
      <div style={{
        background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '580px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem', background: '#1e293b', color: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Inline Coordinator Setup</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Assign or create event coordinators
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
            padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Coordinator Type Selector */}
        <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
            Coordinator Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem',
            background: '#f1f5f9', padding: '4px', borderRadius: '8px'
          }}>
            {[
              { id: 'STUDENT', label: 'Student' },
              { id: 'GUEST', label: 'Guest' },
              { id: 'FACULTY', label: 'Faculty' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setType(t.id); setError(''); setSuccess(''); }}
                style={{
                  padding: '0.6rem 0.75rem', border: 'none', borderRadius: '6px',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: type === t.id ? '#2563eb' : 'transparent',
                  color: type === t.id ? '#ffffff' : '#64748b',
                  boxShadow: type === t.id ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Banners */}
        <div style={{ padding: '0 1.5rem' }}>
          {error && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#fef2f2',
              border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}
          {success && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#f0fdf4',
              border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <Check size={18} style={{ flexShrink: 0 }} />
              <div>{success}</div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
          
          {(type === 'STUDENT' || type === 'GUEST') && (
            <form onSubmit={handleCreateStudentOrGuest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Full Name of ${type === 'STUDENT' ? 'Student' : 'Guest'}...`}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '0.9rem', color: '#1e293b', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Roll No / ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={type === 'STUDENT' ? 'e.g. 21B91A0501' : 'e.g. GST-9081'}
                    value={form.identifier}
                    onChange={e => setForm({ ...form, identifier: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '0.9rem', color: '#1e293b', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="coordinator@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '0.9rem', color: '#1e293b', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value={type}
                    disabled
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #e2e8f0',
                      borderRadius: '6px', fontSize: '0.9rem', color: '#64748b', background: '#f8fafc',
                      fontWeight: 700, letterSpacing: '0.5px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '0.6rem 1.25rem', border: '1px solid #cbd5e1', background: '#ffffff',
                      color: '#475569', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '0.6rem 1.5rem', background: '#2563eb', color: '#ffffff', border: 'none',
                      borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                    Create Coordinator
                  </button>
                </div>
              </div>
            </form>
          )}

          {type === 'FACULTY' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Search Faculty
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search existing faculty by Name, ID, Department, Email..."
                    value={facultySearch}
                    onChange={(e) => {
                      setFacultySearch(e.target.value);
                      handleSearchFaculty(e.target.value);
                    }}
                    style={{
                      width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.5rem', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '0.9rem', color: '#1e293b', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              {/* Faculty Search List */}
              {searchingFaculty ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  Searching faculty records...
                </div>
              ) : facultyResults.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  No matching faculty members found.
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  {facultyResults.map(f => {
                    const isSelected = selectedFaculty?.user_id === f.user_id;
                    return (
                      <div
                        key={f.faculty_id || f.user_id}
                        onClick={() => setSelectedFaculty(f)}
                        style={{
                          padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          cursor: 'pointer', transition: 'background 0.15s',
                          background: isSelected ? '#eff6ff' : '#ffffff'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                            {f.faculty_name} <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>({f.employee_id})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            Dept: <strong>{f.department}</strong> | {f.email}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFaculty(f);
                          }}
                          style={{
                            padding: '0.35rem 0.85rem', border: 'none', borderRadius: '6px',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#475569'
                          }}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.6rem 1.25rem', border: '1px solid #cbd5e1', background: '#ffffff',
                    color: '#475569', borderRadius: '6px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFaculty || saving}
                  onClick={handleAssignFaculty}
                  style={{
                    padding: '0.6rem 1.5rem', background: selectedFaculty ? '#2563eb' : '#94a3b8',
                    color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600,
                    fontSize: '0.875rem', cursor: selectedFaculty && !saving ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Select Faculty Coordinator
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
