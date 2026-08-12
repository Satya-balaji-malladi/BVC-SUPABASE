import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  FileText, Search, Download, Printer, RotateCcw, Play, Loader2, 
  Calendar, Users, Building2, CheckCircle, Sliders, Filter, Eye, ChevronRight, X
} from 'lucide-react';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';
import EventAdminReports from './EventAdminReports';
import HODReportsService from '../../services/HODReportsService';

const REPORT_CATEGORIES = [
  { id: 'event', label: 'Event Reports', icon: Calendar, description: 'Event execution, categories and status logs' },
  { id: 'student', label: 'Student Participation', icon: Users, description: 'Student attendance history and participation rates' },
  { id: 'attendance', label: 'Attendance Records', icon: CheckCircle, description: 'Real-time check-in, presence and defaulters' },
  { id: 'department', label: 'Department Reports', icon: Building2, description: 'Department-wise activity and comparative rankings' },
  { id: 'coordinator', label: 'Coordinator Reports', icon: FileText, description: 'Coordinator and admin event management logs' },
  { id: 'custom', label: 'Custom Report Builder', icon: Sliders, description: 'Build customized reports with selectable columns' },
];

const REPORT_TYPES = [
  { value: 'event', category: 'event', label: 'Master Event Report', filters: ['event', 'status', 'department'] },
  { value: 'cancelled', category: 'event', label: 'Cancelled Events Report', filters: [] },
  { value: 'daterange', category: 'event', label: 'Date Range Event Report', filters: ['fromdate', 'todate'] },
  { value: 'monthly', category: 'event', label: 'Monthly Event Log', filters: ['year_cal', 'month'] },
  
  { value: 'student', category: 'student', label: 'Student Roster Report', filters: ['department', 'year'] },
  { value: 'student_history', category: 'student', label: 'Individual Student Event History', filters: ['rollno'] },
  { value: 'top_participants', category: 'student', label: 'Top Student Participants', filters: ['limit'] },

  { value: 'attendance', category: 'attendance', label: 'Session Attendance Log', filters: ['event', 'status'] },
  { value: 'defaulters', category: 'attendance', label: 'Low Attendance Defaulters', filters: ['event', 'threshold'] },
  { value: 'absent', category: 'attendance', label: 'Absent Students Report', filters: ['event'] },

  { value: 'department', category: 'department', label: 'Department Performance Summary', filters: ['department'] },
  { value: 'dept_comparison', category: 'department', label: 'Department Participation Comparison', filters: [] },
  { value: 'dept_ranking', category: 'department', label: 'Department Ranking Report', filters: [] },

  { value: 'coordinator', category: 'coordinator', label: 'Coordinator Management Activity', filters: ['coordinator'] },
  
  { value: 'custom', category: 'custom', label: 'Custom Multi-Column Report', filters: ['department', 'status'] },
];

const AVAILABLE_CUSTOM_COLUMNS = [
  { id: 'event_id', label: 'Event ID', type: 'event' },
  { id: 'event_name', label: 'Event Name', type: 'event' },
  { id: 'start_date', label: 'Start Date', type: 'event' },
  { id: 'venue', label: 'Venue / Location', type: 'event' },
  { id: 'status', label: 'Event Status', type: 'event' },
  { id: 'roll_number', label: 'Student Roll No', type: 'student' },
  { id: 'student_name', label: 'Student Name', type: 'student' },
  { id: 'department', label: 'Department', type: 'student' },
  { id: 'year', label: 'Academic Year', type: 'student' },
  { id: 'attendance_status', label: 'Attendance Status', type: 'attendance' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsModule({ userRole, userDepartment, selectedEventId }) {
  if (userRole === 'Event Admin') {
    return <EventAdminReports />;
  }

  // Active Category & Specific Selected Report Type
  const [activeCategory, setActiveCategory] = useState('event');
  const [selectedReportType, setSelectedReportType] = useState('event');

  // Filters State
  const [filters, setFilters] = useState({
    event: '',
    rollno: '',
    department: '',
    coordinator: '',
    status: '',
    year_cal: new Date().getFullYear(),
    month: '',
    year: '',
    fromdate: '',
    todate: '',
    threshold: 75,
    limit: 20
  });

  // Custom Report Builder Selected Columns
  const [customColumns, setCustomColumns] = useState(['event_name', 'student_name', 'department', 'attendance_status']);

  // Data Collections & Dropdowns
  const [events, setEvents] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [summaryStats, setSummaryStats] = useState({ events: 0, students: 0, checkins: 0, depts: 0 });

  // Report Results & Table Controls
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Official Institutional Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';
  const effectiveDepartment = isHOD ? userDepartment : null;

  useEffect(() => {
    loadDropdownsAndSummary();
  }, [userRole, userDepartment]);

  const loadDropdownsAndSummary = async () => {
    try {
      let eventsQuery = supabase.from('events').select('*').order('start_date', { ascending: false });
      let coordsQuery = supabase.from('users').select('user_id, employee_id, first_name, last_name, department').in('role', ['Event Admin','Faculty','HOD','Coordinator']);
      let deptsQuery = supabase.from('departments').select('department_id, department_name, department_code');
      let studsQuery = supabase.from('students').select('department_id, department');
      let attQuery = supabase.from('event_participants').select('*', { count: 'exact', head: true });

      if (isHOD) {
        // Securely fetch HOD dashboard stats via RPC
        try {
          const stats = await HODReportsService.getDashboardSummary();
          setSummaryStats({
            events: stats.total_events || 0,
            students: stats.total_students || 0,
            checkins: stats.total_participation || 0,
            depts: 1 // HOD only sees their own department
          });
        } catch (e) {
          console.error("HOD Dashboard stats error:", e);
        }
      }

      const [{ data: evts }, { data: coords }, { data: depts }, { data: studs }, { count: attCount }] = await Promise.all([
        eventsQuery,
        coordsQuery,
        deptsQuery,
        studsQuery,
        attQuery
      ]);

      setEvents(evts || []);
      setCoordinators(coords || []);

      const dbDepts = (depts || []).map(d => d.department_code || d.department_id || d.department_name).filter(Boolean);
      const studentDepts = (studs || []).map(s => s.department_id || s.department).filter(Boolean);
      const eventDepts = (evts || []).flatMap(e => (e.departments || e.department || '').split(',').map(x => x.trim())).filter(Boolean);
      let uniqueDynamicDepts = [...new Set([...dbDepts, ...studentDepts, ...eventDepts])].sort();

      if (isHOD && effectiveDepartment) {
        uniqueDynamicDepts = [effectiveDepartment];
      }
      
      setDepartmentsList(uniqueDynamicDepts);

      if (!isHOD) {
        setSummaryStats({
          events: (evts || []).length,
          students: (studs || []).length,
          checkins: attCount || 0,
          depts: uniqueDynamicDepts.length
        });
      }
    } catch (err) {
      console.error('Error loading report dropdowns:', err);
    }
  };

  const f = (key) => filters[key];
  const setF = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const currentReportMeta = REPORT_TYPES.find(r => r.value === selectedReportType) || REPORT_TYPES[0];
  const activeFilterKeys = currentReportMeta.filters || [];

  // Handle Category Switch
  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    const firstTypeInCat = REPORT_TYPES.find(r => r.category === catId);
    if (firstTypeInCat) {
      setSelectedReportType(firstTypeInCat.value);
    }
    setGenerated(false);
  };

  // Generate Official Institutional Report Data
  const generateReport = async () => {
    setLoading(true);
    setGenerated(false);
    setSearchQuery('');
    setCurrentPage(1);

    try {
      let headers = [];
      let rows = [];

      const activeDeptFilter = isHOD ? effectiveDepartment : f('department');

      if (selectedReportType === 'event') {
        if (isHOD) {
          const data = await HODReportsService.getEventReport();
          headers = ['Event ID', 'Event Name', 'Start Date', 'Status', 'Total Attendees (Your Dept)'];
          rows = (data || []).map(e => [
            e.event_id,
            e.event_name,
            e.start_date ? new Date(e.start_date).toLocaleDateString() : '--',
            e.status || 'Active',
            e.total_attendees || 0
          ]);
        } else {
          let q = supabase.from('events').select('*');
          if (f('event')) q = q.eq('event_id', f('event'));
          const { data } = await q.order('start_date', { ascending: false });

          let filteredEvents = data || [];
          if (f('status')) {
            filteredEvents = filteredEvents.filter(e => (e.status || e.event_status || '').toLowerCase() === f('status').toLowerCase());
          }
          if (activeDeptFilter) {
            filteredEvents = filteredEvents.filter(e => (e.departments || e.department || '').includes(activeDeptFilter));
          }

          headers = ['Event ID','Event Name','Start Date','End Date','Venue','Departments','Status','Coordinator'];
          rows = filteredEvents.map(e => [
            e.event_id, 
            e.event_name, 
            e.start_date || '--', 
            e.end_date || '--', 
            e.venue || e.location || '--', 
            e.departments || e.department || '--', 
            e.status || e.event_status || 'Active', 
            e.coordinator_id || e.organizer || e.created_by || '--'
          ]);
        }
      } else if (selectedReportType === 'student') {
        if (isHOD) {
          const data = await HODReportsService.getStudentReport();
          headers = ['Roll No', 'Student Name', 'Year', 'Section', 'Events Participated'];
          rows = (data || []).map(s => [
            s.roll_number,
            s.student_name,
            s.year || '--',
            s.section || '--',
            s.events_participated || 0
          ]);
        } else {
          let q = supabase.from('students').select('*');
          if (activeDeptFilter) q = q.or(`department_id.eq.${activeDeptFilter},department.eq.${activeDeptFilter}`);
          if (f('year')) q = q.eq('year', f('year'));
          const { data } = await q.order('roll_number');
          
          headers = ['Roll No','Student Name','Department','Year','Section','Gender','Email','Activity Status'];
          rows = (data||[]).map(s => [
            s.roll_number, 
            s.student_name, 
            s.department_id || s.department || '--', 
            s.year || '--', 
            s.section || '--', 
            s.gender || '--', 
            s.email_address || '--', 
            s.activity_status || 'Inactive'
          ]);
        }

      } else if (selectedReportType === 'student_history') {
        const roll = f('rollno');
        if (!roll) { 
          alert('Please enter a Roll Number.'); 
          setLoading(false); 
          return; 
        }

        const { data: epData } = await supabase.from('event_participants').select('*, events(*)').eq('roll_number', roll);
        headers = ['Event ID','Event Name','Date','Attendance Status','Timestamp'];
        rows = (epData || []).map(p => [
          p.event_id,
          p.events?.event_name || '--',
          p.events?.start_date || '--',
          p.attendance_status || p.registration_status || 'Present',
          p.attendance_timestamp || p.registered_at ? new Date(p.attendance_timestamp || p.registered_at).toLocaleString() : '--'
        ]);

      } else if (selectedReportType === 'attendance') {
        let q = supabase.from('event_participants').select('*, events(*), students(*)');
        if (f('event')) q = q.eq('event_id', f('event'));
        const { data: epData } = await q;

        let filtered = epData || [];
        if (f('status')) {
          filtered = filtered.filter(p => (p.attendance_status || 'Absent').toLowerCase() === f('status').toLowerCase());
        }

        headers = ['Roll Number','Student Name','Department','Event Name','Attendance Status','Time'];
        rows = filtered.map(p => [
          p.roll_number,
          p.students?.student_name || p.roll_number,
          p.students?.department_id || p.students?.department || '--',
          p.events?.event_name || '--',
          p.attendance_status || 'Absent',
          p.attendance_timestamp ? new Date(p.attendance_timestamp).toLocaleTimeString() : '--'
        ]);

      } else if (selectedReportType === 'defaulters') {
        const thr = parseInt(f('threshold')) || 75;
        let q = supabase.from('event_participants').select('*, students(*)');
        if (f('event')) q = q.eq('event_id', f('event'));
        const { data: epData } = await q;

        const pm = {};
        (epData || []).forEach(a => {
          const k = a.roll_number;
          if (!pm[k]) pm[k] = { name: a.students?.student_name || k, dept: a.students?.department_id || a.students?.department || '--', year: a.students?.year || '--', total: 0, present: 0 };
          pm[k].total++;
          if (a.attendance_status === 'Present') pm[k].present++;
        });

        headers = ['Roll Number','Name','Department','Year','Registered Sessions','Present Sessions','Attendance Rate'];
        rows = Object.entries(pm)
          .map(([roll, v]) => { const rate = v.total > 0 ? Math.round((v.present/v.total)*100) : 0; return [roll, v.name, v.dept, v.year, v.total, v.present, `${rate}%`, rate]; })
          .filter(r => parseInt(r[7]) < thr)
          .sort((a,b) => a[7]-b[7])
          .map(r => r.slice(0,7));

      } else if (selectedReportType === 'department') {
        const { data: studs } = await supabase.from('students').select('*');
        const { data: epData } = await supabase.from('event_participants').select('roll_number').eq('attendance_status', 'Present');
        const presentRolls = new Set((epData || []).map(p => p.roll_number));

        const deptMap = {};
        (studs||[]).forEach(s => {
          const d = s.department_id || s.department || 'Other';
          if (!deptMap[d]) deptMap[d] = { students: 0, checkins: 0 };
          deptMap[d].students++;
          if (presentRolls.has(s.roll_number)) deptMap[d].checkins++;
        });

        headers = ['Department','Total Students','Present Check-Ins','Attendance Rate'];
        rows = Object.entries(deptMap).map(([deptName, val]) => [deptName, val.students, val.checkins, val.students > 0 ? `${Math.round((val.checkins/val.students)*100)}%` : '0%']);

      } else if (selectedReportType === 'coordinator') {
        const { data: evts } = await supabase.from('events').select('*');
        const { data: assigns } = await supabase.from('event_assignments').select('*, users(*)');
        const cm = {};

        (assigns || []).forEach(a => {
          const cName = a.users ? `${a.users.first_name || ''} ${a.users.last_name || ''}`.trim() : (a.user_id || 'Unknown');
          if (!cm[cName]) cm[cName] = { events: 0, active: 0 };
          cm[cName].events++;
        });

        (evts||[]).forEach(e => {
          const c = e.coordinator_id || e.organizer || e.created_by || 'Unassigned';
          if (!cm[c]) cm[c] = { events: 0, active: 0 };
          cm[c].events++;
          if ((e.status || e.event_status || '').toLowerCase() === 'active') cm[c].active++;
        });

        headers = ['Coordinator / Admin','Total Events Managed','Active Events'];
        rows = Object.entries(cm).sort((a,b)=>b[1].events-a[1].events).map(([coord, val]) => [coord, val.events, val.active]);

      } else if (selectedReportType === 'custom') {
        // Build Custom Selected Columns
        const { data: epData } = await supabase.from('event_participants').select('*, events(*), students(*)');
        const colMeta = AVAILABLE_CUSTOM_COLUMNS.filter(c => customColumns.includes(c.id));
        headers = colMeta.map(c => c.label);
        
        rows = (epData || []).map(p => {
          return colMeta.map(c => {
            if (c.id === 'event_id') return p.event_id;
            if (c.id === 'event_name') return p.events?.event_name || '--';
            if (c.id === 'start_date') return p.events?.start_date || '--';
            if (c.id === 'venue') return p.events?.venue || p.events?.location || '--';
            if (c.id === 'status') return p.events?.status || p.events?.event_status || 'Active';
            if (c.id === 'roll_number') return p.roll_number;
            if (c.id === 'student_name') return p.students?.student_name || p.roll_number;
            if (c.id === 'department') return p.students?.department_id || p.students?.department || '--';
            if (c.id === 'year') return p.students?.year || '--';
            if (c.id === 'attendance_status') return p.attendance_status || 'Absent';
            return '--';
          });
        });
      } else {
        // Default Event Fallback
        const { data } = await supabase.from('events').select('*');
        headers = ['Event ID','Event Name','Start Date','Venue','Status'];
        rows = (data || []).map(e => [e.event_id, e.event_name, e.start_date || '--', e.venue || '--', e.status || 'Active']);
      }

      setTableHeaders(headers);
      setTableData(rows);
      setGenerated(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Paginate Table Results
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return tableData;
    const q = searchQuery.toLowerCase();
    return tableData.filter(row => row.some(cell => String(cell || '').toLowerCase().includes(q)));
  }, [tableData, searchQuery]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);

  const exportColumns = useMemo(() => {
    return tableHeaders.map((h, idx) => ({ header: h, key: row => row[idx] }));
  }, [tableHeaders]);

  // Handle Print Action
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
      
      {/* ---------------------------------------------------- */}
      {/* HEADER & SUMMARY OVERVIEW */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {isHOD ? `${userDepartment || 'Department'} Reports` : 'Institutional Reports Center'}
            </h1>
            <span style={{ background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
              {isHOD ? `Department: ${userDepartment || 'HOD'} 🔒` : 'Official Documentation'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {isHOD 
              ? `Department-specific event, student participation, and attendance reports for ${userDepartment || 'your department'}.`
              : 'Generate, preview, print, and export official event, student participation, and attendance documentation.'
            }
          </p>
        </div>

        {/* Overview Stats Badges */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Available Events</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e3a8a' }}>{summaryStats.events}</div>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Students</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>{summaryStats.students}</div>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Check-Ins Logged</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706' }}>{summaryStats.checkins}</div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* REPORT CATEGORY CARDS / TABS */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {REPORT_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.25rem',
                borderRadius: '14px',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)'
              }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: isSelected ? '#2563eb' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#fff' : '#475569', marginBottom: '0.75rem' }}>
                <Icon size={18} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isSelected ? '#1e3a8a' : '#0f172a', marginBottom: '0.25rem' }}>
                {cat.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.3' }}>
                {cat.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* REPORT GENERATION & FILTER PANEL */}
      {/* ---------------------------------------------------- */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end' }}>
          
          {/* Specific Report Type Dropdown */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', uppercase: 'true', marginBottom: '0.35rem', display: 'block' }}>
              Specific Report Format
            </label>
            <select 
              className="input-field" 
              style={{ height: '40px', fontWeight: '600' }}
              value={selectedReportType} 
              onChange={e => { setSelectedReportType(e.target.value); setGenerated(false); }}>
              {REPORT_TYPES.filter(r => r.category === activeCategory).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Filters */}
          {activeFilterKeys.includes('event') && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.35rem', display: 'block' }}>Select Event</label>
              <select className="input-field" style={{ height: '40px' }} value={f('event')} onChange={e => setF('event', e.target.value)}>
                <option value="">All Events</option>
                {events.map(e => <option key={e.event_id} value={e.event_id}>{e.event_name}</option>)}
              </select>
            </div>
          )}

          {activeFilterKeys.includes('rollno') && (
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.35rem', display: 'block' }}>Roll Number</label>
              <input className="input-field" style={{ height: '40px' }} placeholder="e.g. 21BVC101" value={f('rollno')} onChange={e => setF('rollno', e.target.value)} />
            </div>
          )}

          {activeFilterKeys.includes('department') && (
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.35rem', display: 'block' }}>Department {isHOD && '🔒'}</label>
              <select 
                className="input-field" 
                style={{ height: '40px' }} 
                disabled={isHOD}
                value={isHOD ? effectiveDepartment : f('department')} 
                onChange={e => setF('department', e.target.value)}>
                {isHOD ? (
                  <option value={effectiveDepartment}>{effectiveDepartment}</option>
                ) : (
                  <>
                    <option value="">All Departments</option>
                    {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </>
                )}
              </select>
            </div>
          )}

          {activeFilterKeys.includes('status') && (
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.35rem', display: 'block' }}>Status</label>
              <select className="input-field" style={{ height: '40px' }} value={f('status')} onChange={e => setF('status', e.target.value)}>
                <option value="">All Statuses</option>
                {['Active','Completed','Upcoming','Draft','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {activeFilterKeys.includes('coordinator') && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.35rem', display: 'block' }}>Coordinator</label>
              <select className="input-field" style={{ height: '40px' }} value={f('coordinator')} onChange={e => setF('coordinator', e.target.value)}>
                <option value="">All Coordinators</option>
                {coordinators.map(c => <option key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: 'auto' }}>
            <button 
              className="btn btn-secondary" 
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => { setFilters({ event:'', rollno:'', department:'', coordinator:'', status:'', year_cal: new Date().getFullYear(), month:'', year:'', fromdate:'', todate:'', threshold:75, limit:20 }); setGenerated(false); }}>
              <RotateCcw size={15} /> Reset
            </button>
            <button 
              className="btn btn-primary" 
              style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', fontWeight: '600' }}
              onClick={generateReport} 
              disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Generate Official Report
            </button>
          </div>

        </div>

        {/* Custom Column Picker (Only if Custom Report Selected) */}
        {selectedReportType === 'custom' && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
              Select Custom Report Columns:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {AVAILABLE_CUSTOM_COLUMNS.map(col => {
                const checked = customColumns.includes(col.id);
                return (
                  <label 
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      border: checked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: checked ? '#eff6ff' : '#f8fafc',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: checked ? '600' : '400'
                    }}>
                    <input 
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) setCustomColumns(customColumns.filter(c => c !== col.id));
                        else setCustomColumns([...customColumns, col.id]);
                      }}
                    />
                    {col.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ---------------------------------------------------- */}
      {/* REPORT OUTPUT & ACTION TOOLBAR */}
      {/* ---------------------------------------------------- */}
      {generated && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Table Header Controls */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                {currentReportMeta.label}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Showing {filteredRows.length} total records
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Search Field */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Search report..."
                  style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.85rem' }}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>

              {/* Preview Button */}
              <button 
                onClick={() => setShowPreviewModal(true)}
                className="btn btn-secondary" 
                style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <Eye size={15} /> Official Preview
              </button>

              {/* Print Button */}
              <button 
                onClick={handlePrintReport}
                className="btn btn-secondary" 
                style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <Printer size={15} /> Print
              </button>

              {/* Export Dropdown */}
              <ExportDropdown
                data={filteredRows}
                columns={exportColumns}
                filename={`report_${selectedReportType}_${getFormattedDate()}`}
                title={currentReportMeta.label}
                subtitle={`Total Records: ${filteredRows.length}`}
              />
            </div>
          </div>

          {/* Results Table */}
          <div className="responsive-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  {tableHeaders.map((h, idx) => (
                    <th key={idx} style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length || 1} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      No report records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                          {String(cell || '--')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="btn btn-secondary" 
                style={{ height: '32px', fontSize: '0.8rem' }}>
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="btn btn-secondary" 
                style={{ height: '32px', fontSize: '0.8rem' }}>
                Next
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* OFFICIAL INSTITUTIONAL PREVIEW MODAL */}
      {/* ---------------------------------------------------- */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '850px', maxHeight: '90vh', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>Official Institutional Report Preview</span>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Print Document Paper Container */}
            <div style={{ padding: '2.5rem', overflowY: 'auto', background: '#fff', fontFamily: 'Georgia, serif' }}>
              
              {/* College Official Letterhead Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', letterSpacing: '0.05em' }}>
                  BVC ENGINEERING COLLEGE
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                  AUTONOMOUS INSTITUTION — EVENT MANAGEMENT SYSTEM
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e3a8a', marginTop: '0.75rem', textTransform: 'uppercase' }}>
                  OFFICIAL {currentReportMeta.label.toUpperCase()}
                </div>
              </div>

              {/* Report Metadata Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div><strong>Generated Date:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Report Format:</strong> {currentReportMeta.label}</div>
                <div><strong>Total Records:</strong> {filteredRows.length}</div>
                <div><strong>Authorized By:</strong> Principal / System Admin</div>
              </div>

              {/* Data Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', marginBottom: '2rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #334155' }}>
                    {tableHeaders.map((h, i) => (
                      <th key={i} style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 50).map((r, rIdx) => (
                    <tr key={rIdx}>
                      {r.map((c, cIdx) => (
                        <td key={cIdx} style={{ padding: '0.4rem 0.5rem', border: '1px solid #e2e8f0' }}>{String(c || '--')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                <div>Verified By: Coordinator Signature</div>
                <div>Approved By: Principal / Director</div>
              </div>

            </div>

            {/* Modal Actions */}
            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handlePrintReport} style={{ background: '#2563eb' }}>
                <Printer size={16} /> Print Document
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


