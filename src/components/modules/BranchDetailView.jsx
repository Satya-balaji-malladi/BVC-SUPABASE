import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Users, UserCheck, UserX, UserMinus, FileText, ArrowLeft, MoreVertical, Edit, Search, Layers, Calendar, Loader2, Award } from 'lucide-react';
import TablePagination from '../widgets/TablePagination';
import EditStudentModal from '../widgets/EditStudentModal';

export default function BranchDetailView({ branch, effectiveDepartment, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Hierarchy state
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [editStudent, setEditStudent] = useState(null);
  
  // Drawer state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentEvents, setStudentEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    fetchBranchStudents();
  }, [branch]);

  const fetchBranchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*');
      
      if (branch.branch_id) {
        query = query.eq('branch_id', branch.branch_id);
      } else {
        // Fallback for legacy data without branch_id
        const rawDept = (branch.department_id || effectiveDepartment || '').replace('DEPT_', '');
        query = query.ilike('department_id', `%${rawDept}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data || [];
      if (!branch.branch_id) {
        filtered = filtered.filter(s => {
          const sb = (s.department_id || s.department || '').toLowerCase().replace('dept_', '');
          const bc = (branch.branch_code || '').toLowerCase();
          const dId = (branch.department_id || '').toLowerCase().replace('dept_', '');
          return sb === bc || sb.includes(bc) || sb === dId;
        });
      }
      
      setStudents(filtered);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentEvents = async (rollNumber) => {
    setLoadingEvents(true);
    try {
      // Join event_participants and events
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          registration_status,
          attendance_status,
          registration_timestamp,
          events (
            event_name,
            start_date,
            end_date
          )
        `)
        .eq('roll_number', rollNumber);
        
      if (error) throw error;
      setStudentEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    fetchStudentEvents(student.roll_number);
  };

  // Compute analytics
  const activeStudents = students.filter(s => s.student_status === 'Active').length;
  const inactiveStudents = students.filter(s => s.student_status !== 'Active').length;
  
  const yearDistribution = students.reduce((acc, curr) => {
    const year = curr.year || 'Unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const availableYears = Object.keys(yearDistribution).sort();

  // Compute section distribution for selected year (or all years)
  const sectionDistribution = students
    .filter(s => selectedYear === 'All' || s.year?.toString() === selectedYear.toString())
    .reduce((acc, curr) => {
      const sec = curr.section || 'Unassigned';
      acc[sec] = (acc[sec] || 0) + 1;
      return acc;
    }, {});
    
  const availableSections = Object.keys(sectionDistribution).sort();

  // Filter students for table
  const filteredStudents = students.filter(s => {
    const matchYear = selectedYear === 'All' || s.year?.toString() === selectedYear.toString();
    const matchSection = selectedSection === 'All' || (s.section || 'Unassigned') === selectedSection;
    const matchStatus = statusFilter === 'All' || s.student_status === statusFilter;
    
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q || 
      (s.roll_number || '').toLowerCase().includes(q) ||
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.email_address || '').toLowerCase().includes(q);
      
    return matchYear && matchSection && matchStatus && matchSearch;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ padding: '0.5rem', height: '40px', width: '40px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            {branch.branch_name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Branch Code: {branch.branch_code}</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Department: {effectiveDepartment || 'HOD'}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '50%' }}><Users size={24} color="#3b82f6" /></div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block' }}>TOTAL STUDENTS</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>{students.length}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '50%' }}><UserCheck size={24} color="#22c55e" /></div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block' }}>ACTIVE STUDENTS</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>{activeStudents}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '50%' }}><UserMinus size={24} color="#ef4444" /></div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block' }}>INACTIVE STUDENTS</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>{inactiveStudents}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Left Sidebar - Hierarchy */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#64748b" />
              Year Distribution
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => { setSelectedYear('All'); setSelectedSection('All'); setCurrentPage(1); }}
                style={{
                  padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: selectedYear === 'All' ? '#eff6ff' : 'transparent',
                  color: selectedYear === 'All' ? '#1d4ed8' : '#475569',
                  fontWeight: selectedYear === 'All' ? '600' : '500'
                }}>
                All Years
                <span style={{ background: selectedYear === 'All' ? '#bfdbfe' : '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>
                  {students.length}
                </span>
              </button>
              
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setSelectedSection('All'); setCurrentPage(1); }}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: selectedYear === year ? '#eff6ff' : 'transparent',
                    color: selectedYear === year ? '#1d4ed8' : '#475569',
                    fontWeight: selectedYear === year ? '600' : '500'
                  }}>
                  Year {year}
                  <span style={{ background: selectedYear === year ? '#bfdbfe' : '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>
                    {yearDistribution[year]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#64748b" />
              Section Distribution
            </h3>
            {availableSections.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No sections found.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  onClick={() => { setSelectedSection('All'); setCurrentPage(1); }}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '999px', border: '1px solid', cursor: 'pointer', fontSize: '0.85rem',
                    background: selectedSection === 'All' ? '#1e3a8a' : '#fff',
                    color: selectedSection === 'All' ? '#fff' : '#64748b',
                    borderColor: selectedSection === 'All' ? '#1e3a8a' : '#cbd5e1',
                  }}>
                  All ({students.filter(s => selectedYear === 'All' || s.year?.toString() === selectedYear.toString()).length})
                </button>
                {availableSections.map(sec => (
                  <button
                    key={sec}
                    onClick={() => { setSelectedSection(sec); setCurrentPage(1); }}
                    style={{
                      padding: '0.4rem 0.75rem', borderRadius: '999px', border: '1px solid', cursor: 'pointer', fontSize: '0.85rem',
                      background: selectedSection === sec ? '#1e3a8a' : '#fff',
                      color: selectedSection === sec ? '#fff' : '#64748b',
                      borderColor: selectedSection === sec ? '#1e3a8a' : '#cbd5e1',
                    }}>
                    Section {sec} ({sectionDistribution[sec]})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search roll number, name, email..." 
                style={{ paddingLeft: '2.5rem', width: '100%', height: '38px' }}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select className="input-field" style={{ height: '38px', minWidth: '130px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="responsive-table-wrapper" style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem' }}>Roll Number</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem' }}>Yr/Sec</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <Loader2 className="animate-spin" size={24} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                      Loading students...
                    </td>
                  </tr>
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map(s => (
                    <tr key={s.roll_number} style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => handleStudentClick(s)} className="hover-bg-slate-50">
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#1e3a8a' }}>{s.roll_number}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '500', color: '#0f172a' }}>{s.student_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
                          Y{s.year || '-'} / {s.section || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>{s.email_address || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: s.student_status === 'Active' ? '#22c55e' : '#94a3b8', fontSize: '0.8rem', fontWeight: '600' }}>
                          {s.student_status || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleStudentClick(s); }}>
                          View
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setEditStudent(s); }}>
                          <Edit size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            totalRows={filteredStudents.length}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      {/* STUDENT DETAILS DRAWER / OVERLAY */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '500px', height: '100%', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease forwards' }}>
            
            {/* Drawer Header */}
            <div style={{ background: '#1e3a8a', padding: '2rem 1.5rem', position: 'relative', color: '#fff' }}>
              <button 
                onClick={() => setSelectedStudent(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                ✕
              </button>
              <div style={{ background: '#eff6ff', color: '#1e3a8a', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
                {selectedStudent.student_name?.charAt(0) || 'U'}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>{selectedStudent.student_name}</h2>
              <div style={{ opacity: 0.9, marginTop: '0.25rem', fontSize: '0.95rem' }}>{selectedStudent.roll_number}</div>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Academic Info */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Academic Details</h4>
                <div className="responsive-form-row">
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>DEPARTMENT</div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStudent.department || '-'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>BRANCH</div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStudent.branch || '-'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>YEAR / SEM</div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStudent.year || '-'} / {selectedStudent.semester || '-'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SECTION</div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStudent.section || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Contact Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '24px', color: '#64748b' }}>✉️</div>
                    <div style={{ color: '#0f172a', fontWeight: '500' }}>{selectedStudent.email_address || 'Not provided'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '24px', color: '#64748b' }}>📞</div>
                    <div style={{ color: '#0f172a', fontWeight: '500' }}>{selectedStudent.phone_number || 'Not provided'}</div>
                  </div>
                </div>
              </div>

              {/* Event Participation (Historical) */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={16} /> Event Participation History
                </h4>
                
                {loadingEvents ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} color="#3b82f6" style={{ margin: '0 auto' }} /></div>
                ) : studentEvents.length === 0 ? (
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    No events participated yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {studentEvents.map((evt, idx) => (
                      <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{evt.events?.event_name || 'Unknown Event'}</div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> {evt.events?.start_date ? new Date(evt.events.start_date).toLocaleDateString() : '-'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            background: evt.attendance_status === 'Present' ? '#f0fdf4' : (evt.attendance_status === 'Absent' ? '#fef2f2' : '#f8fafc'),
                            color: evt.attendance_status === 'Present' ? '#16a34a' : (evt.attendance_status === 'Absent' ? '#dc2626' : '#64748b'),
                            padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block'
                          }}>
                            {evt.attendance_status || 'Pending'}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            {evt.registration_status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {editStudent && (
        <EditStudentModal
          isOpen={!!editStudent}
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSuccess={() => {
            setEditStudent(null);
            fetchBranchStudents();
          }}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .hover-bg-slate-50:hover { background-color: #f8fafc !important; }
      `}} />
    </div>
  );
}

