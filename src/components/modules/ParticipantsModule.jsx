import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Loader2, Download, Edit, Trash2, Eye } from 'lucide-react';
import TablePagination from '../widgets/TablePagination';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';
import { getActiveInvolvements } from '../../services/activityService';
import EventAdminService from '../../services/EventAdminService';
import ImportParticipantsModal from '../widgets/ImportParticipantsModal';
import ViewStudentModal from '../widgets/ViewStudentModal';

export default function ParticipantsModule({ userRole, userDepartment, selectedEventId }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterRegStatus, setFilterRegStatus] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterPartCount, setFilterPartCount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);

  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';
  const effectiveDepartment = isHOD ? userDepartment : null;

  useEffect(() => {
    fetchParticipants();
  }, [userRole, userDepartment, selectedEventId]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      let enrichedParticipants = [];

      let [{ data: epData, error: epErr }, { data: stData }, { data: evData }, { activeStudents }] = await Promise.all([
        supabase.from('event_participants').select('*'),
        supabase.from('students').select('*'),
        supabase.from('events').select('event_id, event_name'),
        getActiveInvolvements()
      ]);

      if (epErr) throw epErr;

      const studentMap = new Map((stData || []).map(s => [s.roll_number || s.student_id, s]));
      const eventMap = new Map((evData || []).map(e => [e.event_id, e]));

      let rawList = epData || [];
      if (normalizedRole === 'EVENTADMIN' && selectedEventId) {
        rawList = rawList.filter(p => p.event_id === selectedEventId);
      }

      // Deduplicate to keep only the latest event for each student
      rawList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const uniqueParticipants = new Map();
      rawList.forEach(p => {
        const roll = p.roll_number || p.student_id;
        if (roll && !uniqueParticipants.has(roll)) {
          uniqueParticipants.set(roll, p);
        }
      });
      rawList = Array.from(uniqueParticipants.values());

      enrichedParticipants = rawList.map(p => {
        const roll = p.roll_number || p.student_id;
        const matchedStudent = studentMap.get(roll) || {};
        const matchedEvent = eventMap.get(p.event_id) || {};
        const involvements = activeStudents.get(roll);

        return {
          ...p,
          students: {
            student_name: matchedStudent.student_name || p.student_name || roll || 'N/A',
            department_id: matchedStudent.department_id || matchedStudent.department || p.department_id || p.department || '',
            year: matchedStudent.year || p.year || '',
            section: matchedStudent.section || p.section || '',
            email_address: matchedStudent.email_address || p.email_address || '',
            phone_number: matchedStudent.phone_number || p.phone_number || ''
          },
          events: {
            event_name: matchedEvent.event_name || p.event_name || p.event_id || 'Event'
          },
          activity_status: involvements && involvements.length > 0 ? 'Active' : 'Inactive'
        };
      });

      if (isHOD && effectiveDepartment) {
        enrichedParticipants = enrichedParticipants.filter(p => {
          const sd = (p.students?.department_id || p.students?.department || p.department || p.department_id || '').toLowerCase();
          const eff = (effectiveDepartment || '').toLowerCase();
          return !sd || sd.includes(eff) || eff.includes(sd);
        });
      }

      setParticipants(enrichedParticipants);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };
  const uniqueEvents = [...new Set(participants.map(p => p.events?.event_name || p.event_id).filter(Boolean))];
  const uniqueDepts = [...new Set(participants.map(p => p.students?.department_id).filter(Boolean))];
  const uniqueYears = [...new Set(participants.map(p => String(p.students?.year || '')).filter(Boolean))].sort();
  const uniqueColleges = ['BVC Engineering College'];
  const uniqueRegStatuses = [...new Set(participants.map(p => p.registration_status || 'Registered').filter(Boolean))];
  const uniqueAttendanceStatuses = ['Present', 'Absent'];

  const filteredParticipants = participants.filter(p => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      (p.student_id || p.roll_number || '').toLowerCase().includes(q) ||
      (p.students?.student_name || p.student_name || '').toLowerCase().includes(q) ||
      (p.events?.event_name || p.event_name || p.event_id || '').toLowerCase().includes(q);

    const evtName = p.events?.event_name || p.event_name || p.event_id || '';
    const matchEvent = !filterEvent || evtName === filterEvent;
    const dept = p.students?.department_id || p.department || p.department_id || '';
    const matchDept = !filterDept || isHOD || dept === filterDept;
    const matchYear = !filterYear || String(p.students?.year || p.year || '') === filterYear;
    const matchCollege = !filterCollege || (p.college_name || 'BVC Engineering College') === filterCollege;
    const matchRegStatus = !filterRegStatus || (p.registration_status || p.status || 'Registered') === filterRegStatus;
    const matchAttStatus = !filterAttendance || (p.attendance_status || (p.status === 'Present' ? 'Present' : 'Absent')) === filterAttendance;
    const matchActivity = !filterActivity || p.activity_status === filterActivity;

    let matchPartCount = true;
    if (filterPartCount) {
      const cnt = p.participation_count || 1;
      if (filterPartCount === '1') matchPartCount = cnt >= 1;
      else if (filterPartCount === '2') matchPartCount = cnt >= 2;
      else if (filterPartCount === '3') matchPartCount = cnt >= 3;
    }

    return matchSearch && matchEvent && matchDept && matchYear && matchCollege && matchRegStatus && matchAttStatus && matchActivity && matchPartCount;
  });

  const participantColumns = [
    { header: 'Roll Number', key: p => p.student_id || p.roll_number || '--' },
    { header: 'Student Name', key: p => p.students?.student_name || p.student_name || 'N/A' },
    {
      header: 'Dept / Branch', key: p => {
        const dept = p.students?.department_id || p.department || p.department_id || '--';
        return dept.replace('DEPT_', '');
      }
    },
    { header: 'Year & Sec', key: p => `${p.students?.year || p.year || ''} ${p.students?.section || p.section || ''}`.trim() || '--' },
    {
      header: 'Contact', key: p => (
        <div style={{ lineHeight: '1.2' }}>
          <div>{p.students?.email_address || p.email_address || '--'}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginTop: '2px' }}>
            {p.students?.phone_number || p.phone_number || '--'}
          </div>
        </div>
      )
    },
    { header: 'Latest Event Participated', key: p => p.events?.event_name || p.event_name || p.event_id || '--' },
    { header: 'Reg Status', key: p => p.registration_status || (p.status !== 'Present' ? p.status : null) || 'Registered' },
    { header: 'Attendance', key: p => p.attendance_status || (p.status === 'Present' ? 'Present' : '') || '--' },
    { header: 'Activity Status', key: p => p.activity_status || 'Inactive' },
  ];

  const appliedFilters = [
    filterEvent ? `Event: ${filterEvent}` : 'All Events',
    filterDept ? `Dept: ${filterDept}` : 'All Depts',
    searchTerm ? `Search: "${searchTerm}"` : null,
  ].filter(Boolean);

  const statCards = [
    { label: 'TOTAL REGISTERED', value: filteredParticipants.length.toString(), color: 'var(--text-primary)', borderLeft: '#3b82f6' },
    { label: 'PRESENT (ATTENDED)', value: filteredParticipants.filter(p => (p.attendance_status || '').toLowerCase() === 'present').length.toString(), color: '#22c55e', borderLeft: '#22c55e' },
    { label: 'ABSENT (NO-SHOW)', value: filteredParticipants.filter(p => (p.attendance_status || '').toLowerCase() === 'absent').length.toString(), color: '#ef4444', borderLeft: '#ef4444' },
    { label: 'ATTENDANCE RATE', value: `${filteredParticipants.length > 0 ? Math.round((filteredParticipants.filter(p => (p.attendance_status || '').toLowerCase() === 'present').length / filteredParticipants.length) * 100) : 0}%`, color: '#0ea5e9', borderLeft: '#0ea5e9' },
  ];

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedParticipants = filteredParticipants.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>

      {/* Page Header */}
      <div className="page-header-flex" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {isHOD ? `${effectiveDepartment || 'Department'} Event Participants` : 'Institutional Participants Directory'}
            </h1>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
              {isHOD ? `Department: ${effectiveDepartment || 'HOD'} 🔒` : 'Institution Wide'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {isHOD
              ? `Review student event registrations, participation logs, and attendance status for ${effectiveDepartment || 'your department'}.`
              : 'Manage and review student event participation and registration records across all departments.'
            }
          </p>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderRadius: '8px' }}>
        {statCards.map((card, idx) => (
          <div key={idx} style={{
            padding: '1.5rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            border: '1px solid var(--glass-border)',
            borderLeft: `4px solid ${card.borderLeft}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>{card.label}</div>
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
              placeholder="Search roll, name, event..."
              style={{ paddingLeft: '2.5rem', width: '100%', height: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
            <option value="">All Events</option>
            {uniqueEvents.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Depts</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
            <option value="">All Colleges</option>
            {uniqueColleges.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterAttendance} onChange={e => setFilterAttendance(e.target.value)}>
            <option value="">All Attendance</option>
            {uniqueAttendanceStatuses.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterActivity} onChange={e => setFilterActivity(e.target.value)}>
            <option value="">Activity: All</option>
            <option value="Active">🟢 Active</option>
            <option value="Inactive">⚪ Inactive</option>
          </select>
          <select className="input-field" style={{ height: '40px', width: '100%' }} value={filterPartCount} onChange={e => setFilterPartCount(e.target.value)}>
            <option value="">All Participation</option>
            <option value="1">≥ 1 Events</option>
            <option value="2">≥ 2 Events</option>
            <option value="3">≥ 3 Events</option>
          </select>
          {(searchTerm || filterEvent || filterDept || filterYear || filterCollege || filterAttendance || filterActivity || filterPartCount) && (
            <button className="btn btn-secondary" style={{ height: '40px', fontSize: '0.8rem', width: '100%' }}
              onClick={() => { setSearchTerm(''); setFilterEvent(''); setFilterDept(''); setFilterYear(''); setFilterCollege(''); setFilterRegStatus(''); setFilterAttendance(''); setFilterActivity(''); setFilterPartCount(''); setCurrentPage(1); }}>
              ✕ Clear Filters
            </button>
          )}
          
          {/* Action Buttons in Grid on Mobile, Float Right on Desktop (handled via CSS/wrapper later, but here we just place them) */}
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ height: '40px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e9ecef', color: '#495057', border: 'none' }}
              onClick={() => setIsImportModalOpen(true)}
            >
              <Download size={16} style={{ transform: 'rotate(180deg)' }} /> Import CSV
            </button>
            <ExportDropdown
              data={filteredParticipants}
              columns={participantColumns}
              filename={`participants_${getFormattedDate()}`}
              title="Event Participants & Attendance Report"
              subtitle={`Total Filtered Roster: ${filteredParticipants.length}`}
              appliedFilters={appliedFilters}
              summaryStats={[
                { label: 'Registered', value: filteredParticipants.length },
                { label: 'Present', value: filteredParticipants.filter(p => (p.attendance_status || '').toLowerCase() === 'present').length },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="responsive-table-wrapper">
          <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', width: '40px' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </th>
                {['Roll Number', 'Name', 'Dept / Branch', 'Year & Sec', 'Contact', 'Latest Event Participated', 'Reg Status', 'Attendance', 'Activity Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                      <Loader2 className="animate-spin" size={24} color="#3b82f6" />
                      Loading participants data...
                    </div>
                  </td>
                </tr>
              ) : paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No participants found.
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map(p => (
                  <tr key={p.participant_id || p.id || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem' }}><input type="checkbox" style={{ cursor: 'pointer' }} /></td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{p.student_id || p.roll_number || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>{p.students?.student_name || p.student_name || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const dept = p.students?.department_id || p.department || p.department_id || '--';
                        return dept.replace('DEPT_', '');
                      })()}
                    </td>
                    <td style={{ padding: '1rem' }}>{`${p.students?.year || p.year || '-'} ${p.students?.section || p.section || ''}`.trim()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ lineHeight: '1.2' }}>
                        <div>{p.students?.email_address || p.email_address || '--'}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginTop: '2px' }}>
                          {p.students?.phone_number || p.phone_number || '--'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.events?.event_name || p.event_name || p.event_id || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>
                        {p.registration_status || (p.status !== 'Present' ? p.status : null) || 'Registered'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const att = p.attendance_status || (p.status === 'Present' ? 'Present' : '');
                        if (att === 'Present') return <span style={{ color: '#22c55e', fontWeight: '600' }}>Present</span>;
                        if (att === 'Absent') return <span style={{ color: '#ef4444', fontWeight: '600' }}>Absent</span>;
                        return <span style={{ color: 'var(--text-muted)' }}>--</span>;
                      })()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.75rem',
                        background: p.activity_status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: p.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                        borderRadius: '999px',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {p.activity_status || 'Inactive'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          title="View Student Details & Event History"
                          onClick={() => setViewStudent(p.students ? { ...p.students, roll_number: p.roll_number } : { roll_number: p.roll_number, student_name: p.student_name, email_address: p.email_address, phone_number: p.phone_number, department: p.department, year: p.year, college: p.college })}>
                          <Eye size={16} />
                        </button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Edit size={16} /></button>
                        <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
            ) : paginatedParticipants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No participants found.
              </div>
            ) : (
              paginatedParticipants.map(p => {
                const att = p.attendance_status || (p.status === 'Present' ? 'Present' : '');
                return (
                  <div key={p.participant_id || Math.random()} className="mobile-card">
                    <div className="mobile-card-header">
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{p.students?.student_name || p.student_name || 'N/A'}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.student_id || p.roll_number || 'N/A'}</div>
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: p.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {p.activity_status || 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Event:</span>
                        <span className="mobile-card-value" style={{ fontWeight: '500' }}>{p.events?.event_name || p.event_name || p.event_id || '-'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Dept/Yr:</span>
                        <span className="mobile-card-value">
                          {(() => {
                            const dept = p.students?.department_id || p.department || p.department_id || '--';
                            const yr = p.students?.year || p.year || '-';
                            const sec = p.students?.section || p.section || '';
                            return `${dept.replace('DEPT_', '')} / ${yr} ${sec}`.trim();
                          })()}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Attendance:</span>
                        <span className="mobile-card-value">
                          {att === 'Present' ? <span style={{ color: '#22c55e', fontWeight: '600' }}>Present</span> : 
                           att === 'Absent' ? <span style={{ color: '#ef4444', fontWeight: '600' }}>Absent</span> : '--'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mobile-card-actions">
                      <button 
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                        onClick={() => setViewStudent(p.students ? { ...p.students, roll_number: p.roll_number } : { roll_number: p.roll_number, student_name: p.student_name, email_address: p.email_address, phone_number: p.phone_number, department: p.department, year: p.year, college: p.college })}
                      >
                        <Eye size={15} /> View History
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <TablePagination
          totalRows={filteredParticipants.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {viewStudent && (
        <ViewStudentModal
          isOpen={true}
          onClose={() => setViewStudent(null)}
          student={viewStudent}
        />
      )}

      {isImportModalOpen && (
        <ImportParticipantsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          selectedEventId={selectedEventId || null}
          onSuccess={() => {
            fetchParticipants();
          }}
        />
      )}
    </div>
  );
}


