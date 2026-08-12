import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Loader2, UserPlus, Download, Edit, Trash2, Eye } from 'lucide-react';
import TablePagination from '../widgets/TablePagination';
import ViewStudentModal from '../widgets/ViewStudentModal';
import CreateStudentModal from '../widgets/CreateStudentModal';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';
import { getActiveInvolvements } from '../../services/activityService';

export default function StudentsModule({ userRole, userDepartment }) {
  const [students, setStudents] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterPart, setFilterPart] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchStudents();
  }, [userRole]);

    const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('students').select('*');
      
      const normalizedRole = (userRole || '').replace(/\s+/g, '');
      if ((normalizedRole === 'HOD' || normalizedRole === 'DepartmentAdmin') && userDepartment) {
        query = query.eq('department_id', userDepartment);
      }

      const [{ data, error }, { activeStudents }] = await Promise.all([
        query,
        getActiveInvolvements()
      ]);

      if (error) throw error;
      
      const enrichedStudents = (data || []).map(student => {
        const involvements = activeStudents.get(student.roll_number);
        return {
          ...student,
          activity_status: involvements && involvements.length > 0 ? 'Active' : 'Inactive',
          current_events: involvements || []
        };
      });

      setStudents(enrichedStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const isHOD = (userRole || '').replace(/\s+/g, '').toUpperCase() === 'HOD';
  const uniqueDepts = [...new Set(students.map(s => s.department_id || s.department).filter(Boolean))];
  const uniqueYears = [...new Set(students.map(s => String(s.year)).filter(Boolean))]
    .filter(y => isHOD ? y !== '1' : true)
    .sort();
  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  const filteredStudents = students.filter(student => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      (student.student_name || '').toLowerCase().includes(q) ||
      (student.roll_number || '').toLowerCase().includes(q) ||
      (student.email_address || '').toLowerCase().includes(q);
    const dept = student.department_id || student.department || '';
    const matchDept = !filterDept || dept === filterDept;
    const matchYear = !filterYear || String(student.year) === filterYear;
    const matchSection = !filterSection || (student.section || '') === filterSection;
    const matchGender = !filterGender || (student.gender || '') === filterGender;
    const matchStatus = !filterStatus || (student.student_status || 'Active') === filterStatus;
    const matchActivity = !filterActivity || student.activity_status === filterActivity;
    
    let matchPart = true;
    if (filterPart) {
      const cnt = student.events_attended || 0;
      if (filterPart === '1') matchPart = cnt >= 1;
      else if (filterPart === '2') matchPart = cnt >= 2;
      else if (filterPart === '3') matchPart = cnt >= 3;
    }

    return matchSearch && matchDept && matchYear && matchSection && matchGender && matchStatus && matchActivity && matchPart;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + rowsPerPage);

  const studentColumns = [
    { header: 'Roll Number', key: 'roll_number' },
    { header: 'Student Name', key: 'student_name' },
    { header: 'Department', key: s => s.department_id || s.department || '--' },
    { header: 'Year', key: s => s.year || '--' },
    { header: 'Section', key: s => s.section || '--' },
    { header: 'Gender', key: s => s.gender || '--' },
    { header: 'Email Address', key: s => s.email_address || '--' },
    { header: 'Mobile Number', key: s => s.phone_number || '--' },
    { header: 'Activity Status', key: s => s.activity_status || 'Inactive' },
    { header: 'Current Events', key: s => s.current_events?.map(e => e.event_name).join(', ') || 'None' }
  ];

  const appliedFilters = [
    filterDept ? `Dept: ${filterDept}` : 'All Depts',
    filterYear ? `Year: ${filterYear}` : 'All Years',
    filterSection ? `Sec: ${filterSection}` : 'All Sections',
    filterGender ? `Gender: ${filterGender}` : 'All Genders',
    filterActivity ? `Activity: ${filterActivity}` : 'All Activity',
    searchTerm ? `Search: "${searchTerm}"` : null,
  ].filter(Boolean);

  const statCards = [
    { label: 'Total Students', value: filteredStudents.length.toString(), color: 'var(--text-primary)' },
    { label: 'Active in Events', value: filteredStudents.filter(s => s.activity_status === 'Active').length.toString(), color: '#22c55e' },
    { label: 'Inactive in Events', value: filteredStudents.filter(s => s.activity_status === 'Inactive').length.toString(), color: '#ef4444' },
    { label: 'Departments', value: [...new Set(filteredStudents.map(s => s.department_id || s.department).filter(Boolean))].length.toString(), color: '#3b82f6' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div className="page-header-flex">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>
            Student Roster
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Manage student records and track event participation.
          </p>
        </div>
        <div className="header-actions">
          <ExportDropdown
            data={filteredStudents}
            columns={studentColumns}
            filename={`students_${getFormattedDate()}`}
            title="Student Roster Master Export"
            subtitle={`Total Filtered Records: ${filteredStudents.length}`}
            appliedFilters={appliedFilters}
            summaryStats={[
              { label: 'Filtered Count', value: filteredStudents.length },
              { label: 'Active', value: filteredStudents.filter(s => s.student_status !== 'Inactive').length },
              { label: 'Inactive', value: filteredStudents.filter(s => s.student_status === 'Inactive').length },
            ]}
          />
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb' }}>
            <UserPlus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderRadius: '8px' }}>
        {statCards.map((card, idx) => (
          <div key={idx} style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        {/* Filter Bar */}
        <div className="responsive-filter-grid">
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search name, roll no..." 
              style={{ paddingLeft: '2.5rem', width: '100%', height: '40px' }}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterDept} onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}>
            <option value="">All Depts</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterYear} onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}>
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterSection} onChange={e => { setFilterSection(e.target.value); setCurrentPage(1); }}>
            <option value="">All Sections</option>
            {uniqueSections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterGender} onChange={e => { setFilterGender(e.target.value); setCurrentPage(1); }}>
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterActivity} onChange={e => { setFilterActivity(e.target.value); setCurrentPage(1); }}>
            <option value="">Activity: All</option>
            <option value="Active">🟢 Active</option>
            <option value="Inactive">⚪ Inactive</option>
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }}
            value={filterPart} onChange={e => { setFilterPart(e.target.value); setCurrentPage(1); }}>
            <option value="">All Participation</option>
            <option value="1">≥ 1 Events</option>
            <option value="2">≥ 2 Events</option>
            <option value="3">≥ 3 Events</option>
          </select>
          {(searchTerm || filterDept || filterYear || filterSection || filterGender || filterStatus || filterActivity || filterPart) && (
            <button className="btn btn-secondary" style={{ height: '40px', fontSize: '0.8rem', width: '100%' }}
              onClick={() => { setSearchTerm(''); setFilterDept(''); setFilterYear(''); setFilterSection(''); setFilterGender(''); setFilterStatus(''); setFilterActivity(''); setFilterPart(''); setCurrentPage(1); }}>
              ✕ Clear Filters
            </button>
          )}
        </div>
        <div className="responsive-table-wrapper">
          <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                {['Roll Number', 'Name', 'Department', 'Year', 'Section', 'Email', 'Activity Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                      <Loader2 className="animate-spin" size={24} color="#3b82f6" />
                      Loading students...
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr key={student.student_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{student.roll_number}</td>
                    <td style={{ padding: '1rem' }}>{student.student_name}</td>
                    <td style={{ padding: '1rem' }}>{student.department_id || '-'}</td>
                    <td style={{ padding: '1rem' }}>{student.year || '-'}</td>
                    <td style={{ padding: '1rem' }}>{student.section || '-'}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{student.email_address || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.75rem',
                        background: student.activity_status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: student.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                        borderRadius: '999px',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }} title={student.current_events?.map(e => e.event_name).join(', ')}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {student.activity_status}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex' }} title="View Details" onClick={() => setViewStudent(student)}><Eye size={16} /></button>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex' }} title="Edit"><Edit size={16} /></button>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="show-on-mobile mobile-card-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ margin: '0 auto' }} />
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No students found.
              </div>
            ) : (
              paginatedStudents.map(student => (
                <div key={student.student_id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{student.student_name}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.roll_number}</div>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: student.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                      {student.activity_status}
                    </div>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Email:</span>
                      <span className="mobile-card-value">{student.email_address || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Year/Sec:</span>
                      <span className="mobile-card-value">{student.year || '-'} / {student.section || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Dept:</span>
                      <span className="mobile-card-value">
                        <span className="mobile-card-badge">{student.department_id || student.department || '-'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setViewStudent(student)}
                    >
                      <Eye size={15} /> View
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                      <Edit size={15} /> Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <TablePagination 
          totalRows={filteredStudents.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
      
      {/* Modals */}
      {viewStudent && (
        <ViewStudentModal 
          isOpen={!!viewStudent} 
          onClose={() => setViewStudent(null)} 
          student={viewStudent} 
        />
      )}

      {isCreateModalOpen && (
        <CreateStudentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          userRole={userRole}
          userDepartment={userDepartment}
          onSuccess={(newStudent) => {
            setStudents(prev => [newStudent, ...prev]);
            setIsCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}


