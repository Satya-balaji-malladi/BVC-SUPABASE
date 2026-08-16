import React, { useState, useEffect, useMemo } from 'react';
import EventAdminService from '../../services/EventAdminService';
import {
  Loader2, Calendar, Users, TrendingUp, TrendingDown, Minus,
  Search, Download, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];

function ScopeBadge({ scope }) {
  const isBvc = scope === 'BVC_STUDENTS_ONLY';
  return (
    <span style={{ padding:'0.2rem 0.75rem', borderRadius:'999px', fontSize:'0.75rem', fontWeight:700,
      background: isBvc ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
      color: isBvc ? '#2563eb' : '#7c3aed' }}>
      {isBvc ? '🏫 BVC Students Only' : '🌐 All College Students'}
    </span>
  );
}

function DurationBadge({ durationType, duration }) {
  const isMulti = durationType === 'MULTI_DAY';
  return (
    <span style={{ padding:'0.2rem 0.75rem', borderRadius:'999px', fontSize:'0.75rem', fontWeight:700,
      background: isMulti ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
      color: isMulti ? '#059669' : '#d97706' }}>
      {isMulti ? `📅 ${duration} Days` : '📅 1 Day'}
    </span>
  );
}

function TrendBadge({ trend }) {
  if (!trend) return null;
  const cfg = {
    INCREASING: { icon: <TrendingUp size={13}/>, label:'Increasing', color:'#059669', bg:'rgba(16,185,129,0.1)' },
    DECLINING:  { icon: <TrendingDown size={13}/>, label:'Declining', color:'#dc2626', bg:'rgba(239,68,68,0.1)' },
    STABLE:     { icon: <Minus size={13}/>, label:'Stable', color:'#6b7280', bg:'rgba(107,114,128,0.1)' }
  }[trend] || {};
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.2rem 0.6rem',
      borderRadius:'999px', fontSize:'0.75rem', fontWeight:700, background:cfg.bg, color:cfg.color }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, color='var(--text-primary)', icon }) {
  return (
    <div className="glass-panel" style={{ padding:'1.25rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text-secondary)', fontSize:'0.82rem', fontWeight:600,
            marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
          <div style={{ fontSize:'2rem', fontWeight:800, color, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.35rem' }}>{sub}</div>}
        </div>
        {icon && <div style={{ opacity:0.18, fontSize:'2rem' }}>{icon}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
      <h3 style={{ fontSize:'1rem', fontWeight:700, margin:0, color:'var(--text-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem' }}>
      <Users size={32} style={{ margin:'0 auto 0.75rem', opacity:0.3 }}/>
      <div>{message}</div>
    </div>
  );
}

export default function EventAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterDept, setFilterDept]     = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [tablePage, setTablePage]       = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    setLoading(true); setError(null);
    try {
      const selectedEventId = localStorage.getItem('selected_event_id');
      if (!selectedEventId) throw new Error('No event selected. Please return to Event Selection and choose an event.');
      const data = await EventAdminService.getSingleEventAnalytics(selectedEventId);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load analytics.');
    } finally { setLoading(false); }
  };

  const participants = analytics?.participants || [];
  
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch  = !q || p.roll_number?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
      const matchDept    = filterDept === 'ALL' || p.department === filterDept;
      const matchStatus  = filterStatus === 'ALL'
        || (filterStatus === 'PRESENT' && Number(p.attendance_percentage) > 0)
        || (filterStatus === 'ABSENT'  && Number(p.attendance_percentage) === 0);
      return matchSearch && matchDept && matchStatus;
    });
  }, [participants, searchTerm, filterDept, filterStatus]);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'1rem' }}>
      <Loader2 className="animate-spin" size={40} color="var(--accent-blue)"/>
      <p style={{ color:'var(--text-secondary)' }}>Crunching analytics data...</p>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', padding:'2rem' }}>
      <div className="glass-panel" style={{ padding:'2rem', textAlign:'center', maxWidth:'480px' }}>
        <AlertTriangle size={48} color="var(--error)" style={{ margin:'0 auto 1rem' }}/>
        <h3 style={{ color:'var(--error)', marginBottom:'0.5rem' }}>Error Loading Analytics</h3>
        <p style={{ color:'var(--text-secondary)', marginBottom:'1.5rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadAnalytics}
          style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem' }}>
          <RefreshCw size={14}/> Retry
        </button>
      </div>
    </div>
  );

  if (!analytics) return null;

  const { event, scenario, overview, departments, years, colleges, dailyAttendance, retention, consistency, heatmap } = analytics;
  const { scope, durationType, duration } = scenario;
  const isMultiDay    = durationType === 'MULTI_DAY';
  const isAllColleges = scope === 'ALL_COLLEGE_STUDENTS';


  const paginatedParticipants = filteredParticipants.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredParticipants.length / PAGE_SIZE);

  const exportCSV = () => {
    const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [];
    if (isMultiDay) {
      const dayHeaders = heatmap.days.map(d => d.label);
      rows.push(['Roll Number','Name','Department','Year','College',...dayHeaders,'Days Attended','Attendance %'].map(esc).join(','));
      filteredParticipants.forEach(p => {
        rows.push([p.roll_number, p.name, p.department, p.year, p.college,
          ...p.attendance_flags.map(f => f ? 'Present' : 'Absent'),
          p.days_attended, `${p.attendance_percentage}%`].map(esc).join(','));
      });
    } else {
      rows.push(['Roll Number','Name','Department','Year','Section','College','Status','Check-in Time'].map(esc).join(','));
      filteredParticipants.forEach(p => {
        const status = Number(p.attendance_percentage) > 0 ? 'Present' : 'Absent';
        const time   = p.checkin_time ? new Date(p.checkin_time).toLocaleString() : '--';
        rows.push([p.roll_number, p.name, p.department, p.year, p.section, p.college, status, time].map(esc).join(','));
      });
    }
    const blob = new Blob([rows.join('\n')], { type:'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href:url, download:`${event.event_name.replace(/\s+/g,'_')}_analytics.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  // Chart data
  const donutData = {
    labels: ['Present','Absent'],
    datasets:[{ data:[overview.totalPresent, overview.totalAbsent], backgroundColor:['#10b981','#ef4444'], borderWidth:0, hoverOffset:4 }]
  };
  const deptBarData = {
    labels: departments.map(d => d.dept),
    datasets:[
      { label:'Registered', data:departments.map(d => d.registered), backgroundColor:'rgba(59,130,246,0.2)', borderColor:'#3b82f6', borderWidth:1.5, borderRadius:4 },
      { label:'Present',    data:departments.map(d => d.present),    backgroundColor:'#10b981', borderRadius:4 }
    ]
  };
  const collegeBarData = {
    labels: colleges.map(c => c.college),
    datasets:[{ label:'Registered', data:colleges.map(c => c.registered), backgroundColor:PALETTE, borderWidth:0, borderRadius:6 }]
  };
  const dailyLineData = {
    labels: dailyAttendance.map(d => d.dayLabel),
    datasets:[{ label:'Attendance %', data:dailyAttendance.map(d => parseFloat(d.rate)),
      borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)', fill:true, tension:0.35, pointBackgroundColor:'#3b82f6', pointRadius:5 }]
  };
  const retentionLineData = {
    labels: retention.map(d => d.dayLabel),
    datasets:[{ label:'Retention %', data:retention.map(d => parseFloat(d.rate)),
      borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.08)', fill:true, tension:0.35, pointBackgroundColor:'#10b981', pointRadius:5 }]
  };
  const baseLineOpts = (yMax) => ({
    maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{
      y:{ beginAtZero:true, max:yMax, grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ font:{ size:11 } } },
      x:{ grid:{ display:false }, ticks:{ font:{ size:11 } } }
    }
  });
  const barOpts = {
    maintainAspectRatio:false, indexAxis:'y',
    plugins:{ legend:{ position:'top', align:'end', labels:{ usePointStyle:true, boxWidth:8, padding:14, font:{ size:11 } } } },
    scales:{
      x:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ font:{ size:11 } } },
      y:{ grid:{ display:false }, ticks:{ font:{ size:11 } } }
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', height:'100%', overflowY:'auto', paddingRight:'0.25rem' }}>

      {/* SECTION 1: HEADER */}
      <div className="glass-panel" style={{ padding:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, margin:'0 0 0.5rem 0', color:'var(--text-primary)' }}>
              {event.event_name}
            </h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center' }}>
              <ScopeBadge scope={scope}/>
              <DurationBadge durationType={durationType} duration={duration}/>
              {isMultiDay && <TrendBadge trend={overview.trend}/>}
              <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                <Calendar size={12}/>
                {new Date(event.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                {isMultiDay && ` — ${new Date(event.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}`}
              </span>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button className="btn btn-secondary" onClick={loadAnalytics}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem' }}>
              <RefreshCw size={13}/> Refresh
            </button>
            <button className="btn btn-primary" onClick={exportCSV}
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem' }}>
              <Download size={13}/> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: KPI CARDS */}
      <div className="responsive-grid">
        <KpiCard label="Registered" value={overview.totalParticipants} sub="participants" icon="👥"/>
        <KpiCard label="Present" value={overview.totalPresent} sub={`${overview.totalAbsent} absent`} color="#10b981" icon="✅"/>
        <KpiCard
          label={isMultiDay ? 'Avg Daily Attendance' : 'Attendance Rate'}
          value={`${isMultiDay ? overview.avgDailyRate : overview.attendanceRate}%`}
          sub={isMultiDay ? `Overall: ${overview.attendanceRate}%` : 'of registered'}
          color="#3b82f6" icon="📊"/>
        <KpiCard
          label={isMultiDay ? 'Full Completion' : 'Departments'}
          value={isMultiDay ? `${overview.completionRate}%` : overview.departmentCount}
          sub={isMultiDay ? 'Attended all days' : 'Unique depts'}
          color="#8b5cf6" icon={isMultiDay ? '🏆' : '🏛️'}/>
      </div>

      {/* SECTION 3: OVERVIEW CHARTS */}
      <div className="responsive-grid">
        <div className="glass-panel" style={{ padding:'1.5rem' }}>
          <SectionHeader title="Attendance Overview"/>
          {overview.totalParticipants === 0 ? <EmptyState message="No participants registered yet."/> : (
            <div style={{ position:'relative', height:'260px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Doughnut data={donutData} options={{ maintainAspectRatio:false, cutout:'72%',
                plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, padding:18, font:{ size:12 } } } } }}/>
              <div style={{ position:'absolute', textAlign:'center', pointerEvents:'none' }}>
                <div style={{ fontSize:'1.6rem', fontWeight:800, color:'var(--text-primary)' }}>{overview.attendanceRate}%</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>Present</div>
              </div>
            </div>
          )}
        </div>
        <div className="glass-panel" style={{ padding:'1.5rem' }}>
          <SectionHeader title="Department Participation"/>
          {departments.length === 0 ? <EmptyState message="No department data available."/> : (
            <div style={{ height:'260px' }}><Bar data={deptBarData} options={barOpts}/></div>
          )}
        </div>
      </div>

      {/* SECTION: COLLEGE DISTRIBUTION (all_colleges only) */}
      {isAllColleges && colleges.length > 0 && (
        <div className="glass-panel" style={{ padding:'1.5rem' }}>
          <SectionHeader title="🌐 College / Institution Distribution"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
            <div style={{ height:'220px' }}>
              <Bar data={collegeBarData} options={{ maintainAspectRatio:false, indexAxis:'y',
                plugins:{ legend:{ display:false } },
                scales:{ x:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,0.04)' } }, y:{ grid:{ display:false } } }}}/>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.06)', color:'var(--text-secondary)' }}>
                    {['Institution','Registered','Present','Attendance %'].map(h => (
                      <th key={h} style={{ padding:'0.6rem 0.5rem', fontWeight:700, textAlign:h==='Institution'?'left':'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colleges.map((c,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding:'0.6rem 0.5rem', fontWeight:600 }}>{c.college}</td>
                      <td style={{ padding:'0.6rem 0.5rem', textAlign:'center' }}>{c.registered}</td>
                      <td style={{ padding:'0.6rem 0.5rem', textAlign:'center', color:'#10b981', fontWeight:600 }}>{c.present}</td>
                      <td style={{ padding:'0.6rem 0.5rem', textAlign:'center' }}>
                        <span style={{ fontWeight:700, color:parseFloat(c.rate)>=75?'#10b981':parseFloat(c.rate)>=50?'#f59e0b':'#ef4444' }}>{c.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: MULTI-DAY ANALYTICS */}
      {isMultiDay && (
        <>
          <div className="responsive-grid">
            <div className="glass-panel" style={{ padding:'1.5rem' }}>
              <SectionHeader title="Daily Attendance Trend (%)"><TrendBadge trend={overview.trend}/></SectionHeader>
              {dailyAttendance.every(d => d.present === 0) ? <EmptyState message="No attendance recorded yet."/> : (
                <div style={{ height:'260px' }}><Line data={dailyLineData} options={baseLineOpts(100)}/></div>
              )}
            </div>
            <div className="glass-panel" style={{ padding:'1.5rem' }}>
              <SectionHeader title="Day-1 Retention (%)"/>
              {retention.length === 0 ? <EmptyState message="Not enough data for retention."/> : (
                <div style={{ height:'260px' }}><Line data={retentionLineData} options={baseLineOpts(100)}/></div>
              )}
            </div>
          </div>

          {/* Day-by-day table */}
          <div className="glass-panel" style={{ padding:'1.5rem' }}>
            <SectionHeader title="📅 Day-by-Day Breakdown"/>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.06)', color:'var(--text-secondary)' }}>
                    {['Day','Date','Registered','Present','Absent','Attendance %','Retention %'].map(h => (
                      <th key={h} style={{ padding:'0.75rem 0.5rem', fontWeight:700, textAlign:['Day','Date'].includes(h)?'left':'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyAttendance.map((d,i) => {
                    const ret = retention[i];
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding:'0.7rem 0.5rem', fontWeight:700 }}>{d.dayLabel}</td>
                        <td style={{ padding:'0.7rem 0.5rem', color:'var(--text-secondary)' }}>{d.date}</td>
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'center' }}>{d.registered}</td>
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'center', color:'#10b981', fontWeight:600 }}>{d.present}</td>
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'center', color:'#ef4444' }}>{d.registered - d.present}</td>
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'center' }}>
                          <span style={{ fontWeight:700, color:parseFloat(d.rate)>=75?'#10b981':parseFloat(d.rate)>=50?'#f59e0b':'#ef4444' }}>{d.rate}%</span>
                        </td>
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'center', color:'var(--text-secondary)', fontSize:'0.8rem' }}>
                          {ret ? `${ret.rate}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Consistency Cards */}
          {consistency.length > 0 && (
            <div className="glass-panel" style={{ padding:'1.5rem' }}>
              <SectionHeader title="🏆 Student Consistency"/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.75rem' }}>
                {consistency.map((c,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.025)', borderRadius:'8px', padding:'0.9rem 1rem', textAlign:'center' }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:800, color:c.daysAttended===duration?'#10b981':c.daysAttended===0?'#ef4444':'#f59e0b' }}>
                      {c.count}
                    </div>
                    <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginTop:'0.2rem' }}>{c.label}</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{c.pct}% of participants</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {heatmap && heatmap.rows.length > 0 && (
            <div className="glass-panel" style={{ padding:'1.5rem' }}>
              <SectionHeader title="🗓️ Attendance Heatmap (Student × Day)"/>
              <div style={{ overflowX:'auto', maxHeight:'400px', overflowY:'auto' }}>
                <table style={{ borderCollapse:'collapse', fontSize:'0.78rem', minWidth:'600px' }}>
                  <thead style={{ position:'sticky', top:0, background:'var(--surface)', zIndex:1 }}>
                    <tr>
                      <th style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontWeight:700, color:'var(--text-secondary)', borderBottom:'2px solid rgba(0,0,0,0.06)', minWidth:'160px' }}>Student</th>
                      <th style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontWeight:700, color:'var(--text-secondary)', borderBottom:'2px solid rgba(0,0,0,0.06)' }}>Dept</th>
                      {heatmap.days.map(d => (
                        <th key={d.date} style={{ padding:'0.5rem 0.4rem', textAlign:'center', fontWeight:700, color:'var(--text-secondary)', borderBottom:'2px solid rgba(0,0,0,0.06)', minWidth:'56px' }}>{d.label}</th>
                      ))}
                      <th style={{ padding:'0.5rem 0.4rem', textAlign:'center', fontWeight:700, color:'var(--text-secondary)', borderBottom:'2px solid rgba(0,0,0,0.06)' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.rows.map((row,ri) => {
                      const pct = duration > 0 ? Math.round((row.flags.filter(Boolean).length / duration) * 100) : 0;
                      return (
                        <tr key={ri} style={{ borderBottom:'1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding:'0.45rem 0.75rem', fontWeight:600 }}>{row.name}</td>
                          <td style={{ padding:'0.45rem 0.75rem', color:'var(--text-secondary)' }}>{row.dept}</td>
                          {row.flags.map((present,fi) => (
                            <td key={fi} style={{ padding:'0.45rem 0.4rem', textAlign:'center' }}>
                              <span style={{ display:'inline-block', width:'20px', height:'20px', borderRadius:'4px',
                                background:present?'#10b981':'#fecaca' }} title={present?'Present':'Absent'}/>
                            </td>
                          ))}
                          <td style={{ padding:'0.45rem 0.4rem', textAlign:'center', fontWeight:700, fontSize:'0.8rem',
                            color:pct>=75?'#10b981':pct>=50?'#f59e0b':'#ef4444' }}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {participants.length > 60 && (
                  <div style={{ padding:'0.75rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>
                    Showing first 60 students. Export CSV for the full list.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* SECTION 9: PARTICIPANT TABLE */}
      <div className="glass-panel" style={{ padding:'1.5rem' }}>
        <SectionHeader title="Participant Details">
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
            <select className="input-field" style={{ width:'140px', fontSize:'0.82rem' }}
              value={filterDept} onChange={e => { setFilterDept(e.target.value); setTablePage(0); }}>
              <option value="ALL">All Depts</option>
              {departments.map(d => <option key={d.dept} value={d.dept}>{d.dept}</option>)}
            </select>
            <select className="input-field" style={{ width:'130px', fontSize:'0.82rem' }}
              value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTablePage(0); }}>
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
            </select>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:'0.6rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input type="text" placeholder="Search roll / name..." className="input-field"
                style={{ paddingLeft:'2rem', width:'200px', fontSize:'0.82rem' }}
                value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setTablePage(0); }}/>
            </div>
          </div>
        </SectionHeader>

        <div className="responsive-table-wrapper">
          {filteredParticipants.length === 0 ? (
            <EmptyState message={participants.length === 0 ? 'No participants registered for this event.' : 'No participants match your filters.'}/>
          ) : (
            <>
              <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:'0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid rgba(0,0,0,0.06)', color:'var(--text-secondary)' }}>
                    <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>Roll No</th>
                    <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>Name</th>
                    <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>Dept</th>
                    <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>Year</th>
                    {isAllColleges && <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>College</th>}
                    {isMultiDay && heatmap.days.map(d => (
                      <th key={d.date} style={{ padding:'0.75rem 0.3rem', fontWeight:700, textAlign:'center', fontSize:'0.75rem' }}>{d.label}</th>
                    ))}
                    <th style={{ padding:'0.75rem 0.5rem', fontWeight:700, textAlign:'right' }}>
                      {isMultiDay ? 'Attendance %' : 'Status'}
                    </th>
                    {!isMultiDay && <th style={{ padding:'0.75rem 0.5rem', fontWeight:700 }}>Check-in</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedParticipants.map((p,i) => {
                    const isPresent = Number(p.attendance_percentage) > 0;
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding:'0.7rem 0.5rem', fontWeight:600, fontFamily:'monospace' }}>{p.roll_number}</td>
                        <td style={{ padding:'0.7rem 0.5rem' }}>{p.name}</td>
                        <td style={{ padding:'0.7rem 0.5rem', color:'var(--text-secondary)' }}>{p.department}</td>
                        <td style={{ padding:'0.7rem 0.5rem', color:'var(--text-secondary)' }}>{p.year}</td>
                        {isAllColleges && <td style={{ padding:'0.7rem 0.5rem', color:'var(--text-secondary)', fontSize:'0.8rem' }}>{p.college}</td>}
                        {isMultiDay && p.attendance_flags.map((flag,fi) => (
                          <td key={fi} style={{ padding:'0.7rem 0.3rem', textAlign:'center' }}>
                            <span style={{ display:'inline-block', width:'14px', height:'14px', borderRadius:'3px',
                              background:flag?'#10b981':'#fecaca' }} title={flag?'Present':'Absent'}/>
                          </td>
                        ))}
                        <td style={{ padding:'0.7rem 0.5rem', textAlign:'right' }}>
                          {isMultiDay ? (
                            <span style={{ fontWeight:700, color:Number(p.attendance_percentage)>=75?'#10b981':Number(p.attendance_percentage)>=50?'#f59e0b':'#ef4444' }}>
                              {p.attendance_percentage}%
                            </span>
                          ) : (
                            <span style={{ padding:'0.2rem 0.65rem', borderRadius:'999px', fontSize:'0.75rem', fontWeight:700,
                              background:isPresent?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)',
                              color:isPresent?'#059669':'#dc2626' }}>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          )}
                        </td>
                        {!isMultiDay && (
                          <td style={{ padding:'0.7rem 0.5rem', color:'var(--text-secondary)', fontSize:'0.8rem' }}>
                            {p.checkin_time ? new Date(p.checkin_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0.5rem 0', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                  <span>Showing {tablePage*PAGE_SIZE+1}–{Math.min((tablePage+1)*PAGE_SIZE,filteredParticipants.length)} of {filteredParticipants.length}</span>
                  <div style={{ display:'flex', gap:'0.4rem' }}>
                    <button className="btn btn-secondary" onClick={() => setTablePage(p => Math.max(0,p-1))} disabled={tablePage===0}
                      style={{ padding:'0.3rem 0.75rem', fontSize:'0.82rem' }}>← Prev</button>
                    <button className="btn btn-secondary" onClick={() => setTablePage(p => Math.min(totalPages-1,p+1))} disabled={tablePage===totalPages-1}
                      style={{ padding:'0.3rem 0.75rem', fontSize:'0.82rem' }}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
