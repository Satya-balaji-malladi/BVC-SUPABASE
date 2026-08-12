import React, { useState, useEffect } from 'react';
import EventAdminService from '../../services/EventAdminService';
import { Loader2, Calendar, Users, TrendingUp, Search, Download, AlertTriangle } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ['#0d6efd', '#20c997', '#ffc107', '#fd7e14', '#6f42c1', '#e83e8c', '#198754', '#dc3545'];

export default function EventAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedEventId = localStorage.getItem('selected_event_id');
      if (!selectedEventId) {
        throw new Error("No event selected. Please return to Event Selection and choose an event.");
      }
      const data = await EventAdminService.getSingleEventAnalytics(selectedEventId);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
        <Loader2 className="animate-spin text-accent-blue" size={40} />
        <p style={{ color: 'var(--text-secondary)' }}>Crunching analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '500px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <AlertTriangle size={48} color="var(--error)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Error Loading Analytics</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/event-admin'}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { event, overview, departments, years, dailyAttendance, retention, consistency, participants } = analytics;
  const isMultiDay = event.duration > 1;

  // --- CHART DATA PREPARATION --- //

  // 1. Single-Day Attendance Donut
  const donutData = {
    labels: ['Present', 'Absent'],
    datasets: [{
      data: [overview.totalPresent, overview.totalAbsent],
      backgroundColor: ['#198754', '#dc3545'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // 2. Department Bar Chart (Registered vs Present)
  const deptBarData = {
    labels: departments.map(d => d.dept),
    datasets: [
      {
        label: 'Registered',
        data: departments.map(d => d.registered),
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        borderColor: '#0d6efd',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Present',
        data: departments.map(d => d.present),
        backgroundColor: '#0d6efd',
        borderRadius: 4
      }
    ]
  };

  // 3. Year Bar Chart
  const yearBarData = {
    labels: years.map(y => y.year + (y.year.includes('Year') ? '' : ' Year')),
    datasets: [
      {
        label: 'Registered',
        data: years.map(y => y.registered),
        backgroundColor: 'rgba(111, 66, 193, 0.2)',
        borderColor: '#6f42c1',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Present',
        data: years.map(y => y.present),
        backgroundColor: '#6f42c1',
        borderRadius: 4
      }
    ]
  };

  // MULTI-DAY: Daily Attendance Line
  const dailyLineData = {
    labels: dailyAttendance.map(d => d.dayLabel),
    datasets: [{
      label: 'Present Participants',
      data: dailyAttendance.map(d => d.present),
      borderColor: '#0d6efd',
      backgroundColor: 'rgba(13, 110, 253, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#0d6efd',
      pointRadius: 4
    }]
  };

  // MULTI-DAY: Retention Line
  const retentionLineData = {
    labels: retention.map(d => d.dayLabel),
    datasets: [{
      label: 'Retention %',
      data: retention.map(d => d.rate),
      borderColor: '#20c997',
      backgroundColor: 'rgba(32, 201, 151, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#20c997',
      pointRadius: 4
    }]
  };

  // MULTI-DAY: Consistency Histogram (Bar)
  const consistencyBarData = {
    labels: consistency.map(c => c.label),
    datasets: [{
      label: 'Participants',
      data: consistency.map(c => c.count),
      backgroundColor: '#fd7e14',
      borderRadius: 4
    }]
  };

  // Table Filtering
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'ALL' || p.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* HEADER */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{event.event_name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={14} />
              {new Date(event.start_date).toLocaleDateString()} {isMultiDay && `— ${new Date(event.end_date).toLocaleDateString()}`}
            </span>
            <span style={{ padding: '0.15rem 0.6rem', background: 'rgba(13, 110, 253, 0.1)', color: '#0d6efd', borderRadius: '12px', fontWeight: 600, fontSize: '0.75rem' }}>
              {event.duration} {event.duration === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Event Analytics</div>
          <div style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{isMultiDay ? 'Multi-Day View' : 'Single-Day View'}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="responsive-grid">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Participants</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{overview.totalParticipants}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered for this event</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Unique Attendees</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#198754' }}>{overview.totalPresent}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{overview.totalAbsent} participants absent</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>{isMultiDay ? 'Overall Turnout' : 'Attendance Rate'}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0dcaf0' }}>{overview.attendanceRate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on registration</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>{isMultiDay ? 'Completion Rate' : 'Departments'}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#6f42c1' }}>{isMultiDay ? `${overview.completionRate}%` : overview.departmentCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isMultiDay ? 'Attended all days' : 'Unique depts represented'}</div>
        </div>
      </div>

      {/* SINGLE DAY CHARTS */}
      {!isMultiDay && (
        <>
          <div className="responsive-grid">
            {/* Donut Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Attendance Overview</h3>
              <div style={{ flex: 1, position: 'relative', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut 
                  data={donutData} 
                  options={{ 
                    maintainAspectRatio: false, 
                    cutout: '75%',
                    plugins: {
                      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                    }
                  }} 
                />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', marginTop: '-15px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{overview.attendanceRate}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present</div>
                </div>
              </div>
            </div>

            {/* Department Bar */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Department Participation</h3>
              <div style={{ height: '300px' }}>
                <Bar 
                  data={deptBarData} 
                  options={{ 
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: { position: 'top', align: 'end' }
                    },
                    scales: {
                      x: { grid: { color: 'rgba(0,0,0,0.05)' } },
                      y: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Year-wise Analysis</h3>
              <div style={{ height: '300px' }}>
                <Bar 
                  data={yearBarData} 
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', align: 'end' } },
                    scales: {
                      y: { grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } }
                    },
                    barPercentage: 0.6
                  }} 
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* MULTI DAY CHARTS */}
      {isMultiDay && (
        <>
          <div className="responsive-grid">
            {/* Daily Trend */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Daily Attendance Trend</h3>
              <div style={{ height: '280px' }}>
                <Line 
                  data={dailyLineData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Retention Rate */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Retention Analysis</h3>
              <div style={{ height: '280px' }}>
                <Line 
                  data={retentionLineData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
            {/* Consistency Histogram */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Attendance Consistency</h3>
              <div style={{ height: '250px' }}>
                <Bar 
                  data={consistencyBarData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } }
                    },
                    barPercentage: 0.5
                  }}
                />
              </div>
            </div>

            {/* Department Bar */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Department Participation (Unique)</h3>
              <div style={{ height: '250px' }}>
                <Bar 
                  data={deptBarData} 
                  options={{ 
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { position: 'top', align: 'end' } },
                    scales: {
                      x: { grid: { color: 'rgba(0,0,0,0.05)' } },
                      y: { grid: { display: false } }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* PARTICIPANT DETAILS TABLE */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Participant Details</h3>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              className="input-field" 
              style={{ width: '150px' }}
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="ALL">All Depts</option>
              {departments.map(d => (
                <option key={d.dept} value={d.dept}>{d.dept}</option>
              ))}
            </select>
            
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="input-field" 
                style={{ paddingLeft: '2.5rem', width: '200px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className="responsive-table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Roll Number</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Dept</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Year</th>
                {isMultiDay && dailyAttendance.map(d => (
                  <th key={d.date} style={{ padding: '1rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>{d.dayLabel}</th>
                ))}
                <th style={{ padding: '1rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>{isMultiDay ? 'Attendance %' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={isMultiDay ? 6 + dailyAttendance.length : 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No participants match your filters.
                  </td>
                </tr>
              ) : (
                filteredParticipants.slice(0, 100).map(p => (
                  <tr key={p.roll_number} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{p.roll_number}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{p.name}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{p.department}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{p.year}</td>
                    
                    {isMultiDay && p.attendance_flags.map((isPresent, idx) => (
                      <td key={idx} style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                        {isPresent ? (
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#198754' }}></span>
                        ) : (
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#dc3545' }}></span>
                        )}
                      </td>
                    ))}
                    
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {isMultiDay ? (
                        <span style={{ fontWeight: 600, color: p.attendance_percentage >= 75 ? '#198754' : p.attendance_percentage >= 50 ? '#fd7e14' : '#dc3545' }}>
                          {p.attendance_percentage}%
                        </span>
                      ) : (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: p.attendance_percentage > 0 ? 'rgba(25, 135, 84, 0.1)' : 'rgba(220, 53, 69, 0.1)', color: p.attendance_percentage > 0 ? '#198754' : '#dc3545' }}>
                          {p.attendance_percentage > 0 ? 'Present' : 'Absent'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredParticipants.length > 100 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Showing first 100 records. Use filters or export to view all.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}


