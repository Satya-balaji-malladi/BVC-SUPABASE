import React, { useState, useEffect } from 'react';
import EventAdminService from '../../services/EventAdminService';
import { Download, FileText, Loader2 } from 'lucide-react';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';

export default function EventAdminReports() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  
  useEffect(() => {
    EventAdminService.getEvents().then(evts => {
      setEvents(evts);
      const savedId = localStorage.getItem('selected_event_id');
      if (savedId && evts.some(e => String(e.event_id) === String(savedId))) {
        setSelectedEventId(savedId);
      } else if (evts.length > 0) {
        setSelectedEventId(evts[0].event_id);
      }
    }).catch(console.error);
    EventAdminService.getDashboardStats().then(setSummaryStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      const evt = events.find(e => e.event_id === selectedEventId);
      if (evt && evt.start_date) {
        const start = new Date(evt.start_date);
        const end = new Date(evt.end_date || evt.start_date);
        const dates = [];
        let curr = new Date(start);
        let day = 1;
        while (curr <= end) {
          dates.push({ label: `Day ${day} (${curr.toLocaleDateString()})`, value: curr.toISOString().split('T')[0] });
          curr.setDate(curr.getDate() + 1);
          day++;
        }
        setAvailableDates(dates);
      } else {
        setAvailableDates([]);
      }
    } else {
      setAvailableDates([]);
    }
  }, [selectedEventId, events]);

  const generateReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'summary') {
        const stats = await EventAdminService.getDashboardStats();
        setData({
          title: 'Event Summary Report',
          columns: [{ header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' }],
          rows: [
            { metric: 'Total Assigned Events', value: stats.events_count },
            { metric: 'Total Registered', value: stats.total_participants },
            { metric: 'Total Present', value: stats.total_present },
            { metric: 'Attendance %', value: `${stats.attendance_percentage}%` }
          ]
        });
      } else if (reportType === 'participants') {
        const parts = await EventAdminService.getParticipants();
        setData({
          title: 'Participant Report',
          columns: [
            { header: 'Event ID', key: 'event_id' },
            { header: 'Roll Number', key: 'roll_number' },
            { header: 'Name', key: 'name' },
            { header: 'Department', key: 'department' },
            { header: 'Registration Method', key: 'registration_type' },
            { header: 'Attendance', key: 'attendance_status' }
          ],
          rows: parts.map(p => ({
            event_id: p.event_id, 
            roll_number: p.roll_number, 
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            department: p.department ? p.department.replace('DEPT_', '') : '--', 
            registration_type: p.registration_type || 'By Form',
            attendance_status: p.attendance_status || 'Unknown'
          }))
        });
      } else if (reportType === 'attendance') {
        const att = await EventAdminService.getAttendance();
        setData({
          title: 'Attendance Report',
          columns: [
            { header: 'Roll Number', key: 'roll_number' },
            { header: 'Name', key: 'name' },
            { header: 'Status', key: 'attendance_status' },
            { header: 'Time', key: 'timestamp' }
          ],
          rows: att.map(a => ({
            roll_number: a.roll_number, name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
            attendance_status: a.attendance_status, timestamp: new Date(a.timestamp).toLocaleString()
          }))
        });
      } else if (reportType === 'absent') {
        const parts = await EventAdminService.getParticipants();
        const absentees = parts.filter(p => p.attendance_status !== 'Present');
        setData({
          title: 'Absent Report',
          columns: [
            { header: 'Event ID', key: 'event_id' },
            { header: 'Roll Number', key: 'roll_number' },
            { header: 'Name', key: 'name' },
            { header: 'Department', key: 'department' }
          ],
          rows: absentees.map(p => ({
            event_id: p.event_id, roll_number: p.roll_number, name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            department: p.department || '--'
          }))
        });
      } else if (reportType === 'daywise') {
        if (!selectedEventId) {
          alert('Please select an event for Day-wise report');
          setLoading(false);
          return;
        }
        if (!selectedDate) {
          alert('Please select a Date / Day');
          setLoading(false);
          return;
        }
        
        const att = await EventAdminService.getAttendance();
        const eventAtt = att.filter(a => a.event_id === selectedEventId && new Date(a.timestamp).toISOString().split('T')[0] === selectedDate);
        
        setData({
          title: `Day-wise Attendance for ${availableDates.find(d => d.value === selectedDate)?.label || selectedDate}`,
          columns: [
            { header: 'Roll Number', key: 'roll_number' },
            { header: 'Name', key: 'name' },
            { header: 'Status', key: 'attendance_status' },
            { header: 'Time', key: 'timestamp' }
          ],
          rows: eventAtt.map(a => ({
            roll_number: a.roll_number, name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
            attendance_status: a.attendance_status, timestamp: new Date(a.timestamp).toLocaleString()
          }))
        });
      }
    } catch (err) {
      console.error("Report Generation Error:", err);
      alert("Failed to generate report: " + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '0.5rem' }}>
      <div>
        <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Event Reports</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Generate reports for your assigned events.</p>
      </div>

      {summaryStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>EVENTS ASSIGNED</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0d6efd' }}>{summaryStats.events_count}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #20c997' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL REGISTRATIONS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#20c997' }}>{summaryStats.total_participants}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #198754' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL PRESENT</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#198754' }}>{summaryStats.total_present}</div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Report Type</label>
            <select className="form-control" value={reportType} onChange={e => {setReportType(e.target.value); setData(null);}}>
              <option value="summary">Event Summary</option>
              <option value="participants">Participation Report</option>
              <option value="attendance">Detailed Attendance Report</option>
              <option value="absent">Absent Report</option>
              <option value="daywise">Day-wise Attendance Report</option>
            </select>
          </div>
          {events.length > 1 && (
            <div style={{ flex: 1 }}>
              <label className="form-label">Select Event</label>
              <select className="form-control" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                <option value="">-- Choose an Event --</option>
                {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>)}
              </select>
            </div>
          )}
          {reportType === 'daywise' && (
            <div style={{ flex: 1 }}>
              <label className="form-label">Select Date / Day</label>
              <select className="form-control" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                <option value="">-- Choose a Date --</option>
                {availableDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={generateReport} disabled={loading} style={{ height: '42px', minWidth: '140px' }}>
            {loading ? <Loader2 size={18} className="spin" /> : <><FileText size={18} /> Generate</>}
          </button>
        </div>
      </div>

      {data && (
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0 }}>{data.title}</h4>
            <ExportDropdown data={data.rows} columns={data.columns} filename={`report_${getFormattedDate()}`} title={data.title} />
          </div>
          <div className="table-responsive" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
                <tr>{data.columns.map(c => <th key={c.key} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>{c.header}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>{data.columns.map(c => <td key={c.key} style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{row[c.key]}</td>)}</tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={data.columns.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
