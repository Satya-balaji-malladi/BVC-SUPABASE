import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  RefreshCw, TrendingUp, Users, Calendar, BarChart2, Percent,
  Building2, AlertTriangle, ShieldCheck, Award, FileText, ChevronDown, CheckCircle, ArrowUpRight, Filter
} from 'lucide-react';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import EventAdminAnalytics from './EventAdminAnalytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DEPTS  = ['CSE','ECE','EEE','MECH','CIVIL','AIDS','AIML','IT'];

const CHART_COLORS = {
  primary: '#2563eb',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
};

const PALETTE = [
  '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', 
  '#06b6d4', '#ef4444', '#ec4899', '#6366f1'
];

export default function AnalyticsModule({ userRole, userDepartment }) {
  if (userRole === 'Event Admin') {
    return <EventAdminAnalytics />;
  }

  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';
  const effectiveDepartment = isHOD ? userDepartment : null;

  // ----------------------------------------------------
  // GLOBAL FILTERS STATE
  // ----------------------------------------------------
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [semester, setSemester]         = useState('All');
  const [deptFilter, setDeptFilter]     = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');

  // Active sub-tab under analytics
  const [activeTab, setActiveTab]       = useState('overview');

  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [rawEvents, setRawEvents]             = useState([]);
  const [rawParticipants, setRawParticipants] = useState([]);
  const [rawStudents, setRawStudents]         = useState([]);
  const [rawAssignments, setRawAssignments]   = useState([]);
  const [rawUsers, setRawUsers]               = useState([]);

  useEffect(() => {
    fetchCoreAnalyticsData();
  }, [userRole, userDepartment]);

  const fetchCoreAnalyticsData = async () => {
    setLoading(true);
    try {
      let eventsQuery = supabase.from('events').select('*');
      let partsQuery = supabase.from('event_participants').select('*, students(*)');
      let studsQuery = supabase.from('students').select('*');
      let assignsQuery = supabase.from('event_assignments').select('*, users(*)');
      let usrsQuery = supabase.from('users').select('*');
      let deptsQuery = supabase.from('departments').select('department_id, department_name, department_code');

      if (isHOD && effectiveDepartment) {
        eventsQuery = eventsQuery.ilike('departments', `%${effectiveDepartment}%`);
        studsQuery = studsQuery.or(`department_id.eq.${effectiveDepartment},department.eq.${effectiveDepartment}`);
        usrsQuery = usrsQuery.ilike('department', `%${effectiveDepartment}%`);
      }

      const [{ data: evts }, { data: parts }, { data: studs }, { data: assigns }, { data: usrs }, { data: depts }] = await Promise.all([
        eventsQuery,
        partsQuery,
        studsQuery,
        assignsQuery,
        usrsQuery,
        deptsQuery
      ]);

      let filteredParts = parts || [];
      if (isHOD && effectiveDepartment) {
        filteredParts = filteredParts.filter(p => {
          const sd = (p.students?.department_id || p.students?.department || p.department || '').toLowerCase();
          return sd.includes(effectiveDepartment.toLowerCase());
        });
      }

      setRawEvents(evts || []);
      setRawParticipants(filteredParts);
      setRawStudents(studs || []);
      setRawAssignments(assigns || []);
      setRawUsers(usrs || []);

      // Dynamic department list from database
      const dbDepts = (depts || []).map(d => d.department_code || d.department_id || d.department_name).filter(Boolean);
      const studentDepts = (studs || []).map(s => s.department_id || s.department).filter(Boolean);
      const eventDepts = (evts || []).flatMap(e => (e.departments || e.department || '').split(',').map(x => x.trim())).filter(Boolean);
      
      let uniqueDynamicDepts = [...new Set([...dbDepts, ...studentDepts, ...eventDepts])].sort();
      if (isHOD && effectiveDepartment) {
        uniqueDynamicDepts = [effectiveDepartment];
      }

      setDepartmentsList(uniqueDynamicDepts);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // FILTERED DATA COMPUTATION
  // ----------------------------------------------------
  const filteredEvents = useMemo(() => {
    const activeDept = isHOD ? effectiveDepartment : deptFilter;
    return rawEvents.filter(e => {
      // Event Type Filter
      if (eventTypeFilter !== 'All' && (e.category || e.event_category || e.event_type || '') !== eventTypeFilter) {
        return false;
      }
      // Department Filter
      if (activeDept && activeDept !== 'All') {
        const evDepts = (e.departments || e.department || e.organizer_dept || '').split(',').map(d => d.trim());
        if (!evDepts.includes(activeDept) && e.department_id !== activeDept) {
          return false;
        }
      }
      // Date Range Filter
      if (dateRangeFilter !== 'All Time' && e.start_date) {
        const eDate = new Date(e.start_date);
        const now = new Date();
        if (dateRangeFilter === 'Today') {
          if (eDate.toDateString() !== now.toDateString()) return false;
        } else if (dateRangeFilter === 'This Month') {
          if (eDate.getMonth() !== now.getMonth() || eDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRangeFilter === 'This Semester') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 5);
          if (eDate < threeMonthsAgo) return false;
        }
      }
      return true;
    });
  }, [rawEvents, eventTypeFilter, deptFilter, dateRangeFilter, isHOD, effectiveDepartment]);

  const filteredEventIds = useMemo(() => new Set(filteredEvents.map(e => e.event_id)), [filteredEvents]);

  const filteredParticipants = useMemo(() => {
    const activeDept = isHOD ? effectiveDepartment : deptFilter;
    return rawParticipants.filter(p => {
      if (!filteredEventIds.has(p.event_id)) return false;
      if (activeDept && activeDept !== 'All') {
        const studDept = p.students?.department_id || p.students?.department;
        if (studDept && studDept !== activeDept) return false;
      }
      return true;
    });
  }, [rawParticipants, filteredEventIds, deptFilter, isHOD, effectiveDepartment]);

  // ----------------------------------------------------
  // KPI CALCULATIONS
  // ----------------------------------------------------
  const totalEvents = filteredEvents.length;
  const completedEvents = filteredEvents.filter(e => (e.status || e.event_status || '').toLowerCase() === 'completed').length;
  const activeOngoingEvents = filteredEvents.filter(e => (e.status || e.event_status || '').toLowerCase() === 'active').length;

  const totalParticipationRecords = filteredParticipants.length;
  const totalPresent = filteredParticipants.filter(p => p.attendance_status === 'Present').length;
  const overallAttendanceRate = totalParticipationRecords > 0 
    ? Math.round((totalPresent / totalParticipationRecords) * 100) 
    : 0;

  const avgParticipantsPerEvent = totalEvents > 0 ? Math.round(totalParticipationRecords / totalEvents) : 0;
  const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  const uniqueDeptsInvolved = useMemo(() => {
    const depts = new Set();
    filteredEvents.forEach(e => {
      const d = e.departments || e.department || e.organizer_dept;
      if (d) d.split(',').forEach(x => depts.add(x.trim()));
    });
    return depts.size;
  }, [filteredEvents]);

  // ----------------------------------------------------
  // CHART DATA: EVENT ANALYTICS
  // ----------------------------------------------------
  const eventGrowthData = useMemo(() => {
    const monthlyCreated = Array(12).fill(0);
    const monthlyCompleted = Array(12).fill(0);

    filteredEvents.forEach(e => {
      if (e.start_date) {
        const m = new Date(e.start_date).getMonth();
        if (m >= 0 && m < 12) {
          monthlyCreated[m]++;
          if ((e.status || e.event_status || '').toLowerCase() === 'completed') {
            monthlyCompleted[m]++;
          }
        }
      }
    });

    return {
      labels: MONTHS,
      datasets: [
        {
          label: 'Total Events Scheduled',
          data: monthlyCreated,
          borderColor: CHART_COLORS.primary,
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Completed Events',
          data: monthlyCompleted,
          borderColor: CHART_COLORS.success,
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
        }
      ]
    };
  }, [filteredEvents]);

  const eventStatusDist = useMemo(() => {
    const counts = { Draft: 0, Upcoming: 0, Active: 0, Completed: 0, Cancelled: 0 };
    filteredEvents.forEach(e => {
      const st = (e.status || e.event_status || 'Draft');
      const norm = st.charAt(0).toUpperCase() + st.slice(1).toLowerCase();
      if (counts[norm] !== undefined) counts[norm]++;
      else counts.Completed++;
    });

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: [CHART_COLORS.cyan, CHART_COLORS.indigo, CHART_COLORS.success, CHART_COLORS.primary, CHART_COLORS.danger],
        borderWidth: 0,
      }]
    };
  }, [filteredEvents]);

  const eventCategoryDist = useMemo(() => {
    const catMap = {};
    filteredEvents.forEach(e => {
      const cat = e.category || e.event_category || e.event_type || 'General';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const labels = Object.keys(catMap);
    return {
      labels,
      datasets: [{
        label: 'Events by Category',
        data: labels.map(l => catMap[l]),
        backgroundColor: CHART_COLORS.secondary,
        borderRadius: 6
      }]
    };
  }, [filteredEvents]);

  const eventDeptDist = useMemo(() => {
    const deptMap = {};
    filteredEvents.forEach(e => {
      const dStr = e.departments || e.department || e.organizer_dept || 'General';
      dStr.split(',').forEach(dRaw => {
        const d = dRaw.trim();
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
    });

    const labels = Object.keys(deptMap).sort((a,b) => deptMap[b] - deptMap[a]);
    return {
      labels,
      datasets: [{
        label: 'Events Conducted',
        data: labels.map(l => deptMap[l]),
        backgroundColor: CHART_COLORS.purple,
        borderRadius: 6
      }]
    };
  }, [filteredEvents]);

  // ----------------------------------------------------
  // CHART DATA: PARTICIPATION & ATTENDANCE
  // ----------------------------------------------------
  const attendanceTrendData = useMemo(() => {
    const regByMonth = Array(12).fill(0);
    const presByMonth = Array(12).fill(0);

    filteredParticipants.forEach(p => {
      const dStr = p.registered_at || p.created_at || p.attendance_timestamp;
      if (dStr) {
        const m = new Date(dStr).getMonth();
        if (m >= 0 && m < 12) {
          regByMonth[m]++;
          if (p.attendance_status === 'Present') presByMonth[m]++;
        }
      }
    });

    return {
      labels: MONTHS,
      datasets: [
        {
          label: 'Registered Students',
          data: regByMonth,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 4,
        },
        {
          label: 'Attended (Present)',
          data: presByMonth,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 4,
        }
      ]
    };
  }, [filteredParticipants]);

  const deptPerformanceTable = useMemo(() => {
    const map = {};
    
    // Process Events per Dept
    filteredEvents.forEach(e => {
      const dStr = e.departments || e.department || e.organizer_dept || 'Other';
      dStr.split(',').forEach(dRaw => {
        const d = dRaw.trim();
        if (!map[d]) map[d] = { dept: d, events: 0, registered: 0, present: 0 };
        map[d].events++;
      });
    });

    // Process Participants per Dept
    filteredParticipants.forEach(p => {
      const d = p.students?.department_id || p.students?.department || 'Other';
      if (!map[d]) map[d] = { dept: d, events: 0, registered: 0, present: 0 };
      map[d].registered++;
      if (p.attendance_status === 'Present') map[d].present++;
    });

    return Object.values(map).map(d => {
      const attRate = d.registered > 0 ? Math.round((d.present / d.registered) * 100) : 0;
      const avgPart = d.events > 0 ? Math.round(d.registered / d.events) : 0;
      // Institutional Transparent Performance Score Formula: (40% Attendance Rate + 40% Volume Score + 20% Event Activity)
      const score = Math.min(100, Math.round((attRate * 0.4) + (Math.min(d.registered, 100) * 0.4) + (Math.min(d.events, 10) * 2)));
      return {
        ...d,
        attRate,
        avgPart,
        score
      };
    }).sort((a,b) => b.score - a.score);
  }, [filteredEvents, filteredParticipants]);

  // ----------------------------------------------------
  // DYNAMIC SMART INSIGHTS GENERATOR
  // ----------------------------------------------------
  const dynamicInsights = useMemo(() => {
    const list = [];
    if (overallAttendanceRate >= 75) {
      list.push({ type: 'good', text: `High institutional attendance rate of ${overallAttendanceRate}% across active events.` });
    } else if (overallAttendanceRate > 0) {
      list.push({ type: 'warning', text: `Overall attendance rate is currently at ${overallAttendanceRate}%. Consider reviewing low-attendance sessions.` });
    }

    if (deptPerformanceTable.length > 0) {
      const topDept = deptPerformanceTable[0];
      list.push({ type: 'good', text: `${topDept.dept} is the top-performing department with ${topDept.registered} student participations.` });
    }

    const lowAttEvents = filteredEvents.filter(e => {
      const parts = filteredParticipants.filter(p => p.event_id === e.event_id);
      if (parts.length === 0) return false;
      const pres = parts.filter(p => p.attendance_status === 'Present').length;
      return (pres / parts.length) < 0.5;
    });

    if (lowAttEvents.length > 0) {
      list.push({ type: 'danger', text: `Attention Required: ${lowAttEvents.length} event(s) have attendance below 50%.` });
    } else {
      list.push({ type: 'good', text: `No events currently flagged with critical low attendance (<50%).` });
    }

    if (completedEvents > 0) {
      list.push({ type: 'good', text: `${completedEvents} event(s) successfully completed in the current academic window (${completionRate}% completion rate).` });
    }

    return list;
  }, [overallAttendanceRate, deptPerformanceTable, filteredEvents, filteredParticipants, completedEvents, completionRate]);

  // Chart Global Default Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } },
      tooltip: { padding: 10, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' }, beginAtZero: true }
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
      
      {/* ---------------------------------------------------- */}
      {/* PAGE HEADER & REFRESH */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {isHOD ? `${effectiveDepartment || 'Department'} Analytics` : 'Principal Analytics Center'}
            </h1>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
              {isHOD ? `Department: ${effectiveDepartment || 'HOD'} 🔒` : 'Institution Wide'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {isHOD 
              ? `Department-level event execution, student participation, and attendance insights for ${effectiveDepartment}.`
              : 'Institutional event execution, student engagement, and department performance insights.'
            }
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ExportDropdown
            data={deptPerformanceTable}
            filename={`${isHOD ? (effectiveDepartment + '_') : ''}analytics_${getFormattedDate()}`}
            title={isHOD ? `${effectiveDepartment} Department Analytics Report` : 'Institutional Analytics Summary Report'}
            subtitle={`Academic Year: ${academicYear} | Dept: ${isHOD ? effectiveDepartment : deptFilter}`}
          />
          <button 
            onClick={fetchCoreAnalyticsData} 
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* GLOBAL FILTERS */}
      {/* ---------------------------------------------------- */}
      <div style={{ background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569', paddingRight: '0.5rem', borderRight: '1px solid #e2e8f0' }}>
          <Filter size={16} color="#3b82f6" /> Global Filters
        </div>

        {/* Academic Year */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Academic Year</label>
          <select className="input-field" style={{ height: '36px', width: '130px', fontSize: '0.85rem' }} value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
            <option value="2026-27">2026–27</option>
            <option value="2025-26">2025–26</option>
            <option value="2024-25">2024–25</option>
          </select>
        </div>

        {/* Semester */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Semester</label>
          <select className="input-field" style={{ height: '36px', width: '130px', fontSize: '0.85rem' }} value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="All">All Semesters</option>
            <option value="Sem 1">Semester I</option>
            <option value="Sem 2">Semester II</option>
          </select>
        </div>

        {/* Department */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Department {isHOD && '🔒'}</label>
          <select 
            className="input-field" 
            style={{ height: '36px', width: '140px', fontSize: '0.85rem' }} 
            disabled={isHOD}
            value={isHOD ? effectiveDepartment : deptFilter} 
            onChange={e => setDeptFilter(e.target.value)}>
            {isHOD ? (
              <option value={effectiveDepartment}>{effectiveDepartment}</option>
            ) : (
              <>
                <option value="All">All Departments</option>
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
              </>
            )}
          </select>
        </div>

        {/* Event Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Event Type</label>
          <select className="input-field" style={{ height: '36px', width: '140px', fontSize: '0.85rem' }} value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Workshop">Workshop</option>
            <option value="Seminar">Seminar</option>
            <option value="Sports">Sports</option>
          </select>
        </div>

        {/* Date Range */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Date Range</label>
          <select className="input-field" style={{ height: '36px', width: '140px', fontSize: '0.85rem' }} value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)}>
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="This Month">This Month</option>
            <option value="This Semester">This Semester</option>
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ANALYTICS NAVIGATION TABS */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'events', label: 'Event Analytics' },
          { id: 'attendance', label: 'Participation & Attendance' },
          { id: 'departments', label: 'Department Rankings' },
          { id: 'insights', label: 'Smart Insights' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === t.id ? '#1e3a8a' : 'transparent',
              color: activeTab === t.id ? '#fff' : '#64748b',
              fontWeight: activeTab === t.id ? '600' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- */}
      {/* KPI SUMMARY CARDS OVERVIEW */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Events */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>TOTAL EVENTS</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a' }}>{loading ? '--' : totalEvents}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {completedEvents} Completed
          </div>
        </div>

        {/* Total Participants */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>PARTICIPATION RECORDS</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a' }}>{loading ? '--' : totalParticipationRecords}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Avg {avgParticipantsPerEvent} / Event
          </div>
        </div>

        {/* Overall Attendance */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>OVERALL ATTENDANCE</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Percent size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a' }}>{loading ? '--' : `${overallAttendanceRate}%`}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
            {totalPresent} Present Check-ins
          </div>
        </div>

        {/* Active Departments */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>ACTIVE DEPTS</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a' }}>{loading ? '--' : uniqueDeptsInvolved}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {DEPTS.length} Total Departments
          </div>
        </div>

        {/* Event Completion Rate */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>COMPLETION RATE</span>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a' }}>{loading ? '--' : `${completionRate}%`}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {completedEvents} of {totalEvents} Events
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* MAIN CONTENT BASED ON TABS */}
      {/* ---------------------------------------------------- */}
      
      {(activeTab === 'overview' || activeTab === 'events') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* Event Growth Trend Line Chart */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Event Growth Over Time
            </h3>
            <div style={{ height: 280 }}>
              <Line data={eventGrowthData} options={chartOptions} />
            </div>
          </div>

          {/* Event Status Distribution Donut Chart */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Event Status Distribution
            </h3>
            <div style={{ height: 280 }}>
              <Doughnut data={eventStatusDist} options={{ ...chartOptions, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Events by Category Bar Chart */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Events Conducted by Category
            </h3>
            <div style={{ height: 280 }}>
              <Bar data={eventCategoryDist} options={chartOptions} />
            </div>
          </div>

          {/* Events by Department Bar Chart */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Events Hosted by Department
            </h3>
            <div style={{ height: 280 }}>
              <Bar data={eventDeptDist} options={chartOptions} />
            </div>
          </div>

        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'attendance') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Registered vs Attended Bar Chart */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
              Monthly Participation & Attendance Trends (Registered vs Present)
            </h3>
            <div style={{ height: 320 }}>
              <Bar data={attendanceTrendData} options={chartOptions} />
            </div>
          </div>

        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'departments') && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: '0 0 1rem 0' }}>
            Department Performance & Participation Scorecard
          </h3>

          <div className="responsive-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Rank</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Events Conducted</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Registrations</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Present Check-Ins</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Attendance Rate</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Avg Part/Event</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {deptPerformanceTable.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No department data available for selected filters.
                    </td>
                  </tr>
                ) : (
                  deptPerformanceTable.map((row, idx) => (
                    <tr key={row.dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#0f172a' }}>#{idx + 1}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#1e3a8a' }}>{row.dept}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{row.events}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{row.registered}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#16a34a', fontWeight: '600' }}>{row.present}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', maxWidth: '80px' }}>
                            <div style={{ height: '100%', width: `${row.attRate}%`, background: row.attRate >= 75 ? '#22c55e' : row.attRate >= 50 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{row.attRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>{row.avgPart}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                          {row.score} / 100
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'overview' || activeTab === 'insights') && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Award size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Institutional Smart Insights
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dynamicInsights.map((insight, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '1rem', 
                borderRadius: '12px', 
                background: insight.type === 'good' ? '#f0fdf4' : insight.type === 'warning' ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${insight.type === 'good' ? '#bbf7d0' : insight.type === 'warning' ? '#fef08a' : '#fecaca'}`,
                color: insight.type === 'good' ? '#166534' : insight.type === 'warning' ? '#92400e' : '#991b1b',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                {insight.type === 'good' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}


