import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import ExportDropdown from './ExportDropdown';
import { getFormattedDate, sanitizeFilename } from '../../services/exportService';

export default function ViewEventModal({ isOpen, onClose, event }) {
  const [timeline, setTimeline] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [dayStats, setDayStats] = useState({ registered: 0, marked: 0, present: 0, absent: 0, percentage: 0 });
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportScope, setReportScope] = useState('DAY');
  const [coordinatorDisplay, setCoordinatorDisplay] = useState('Loading...');
  const [assignedCoordinators, setAssignedCoordinators] = useState([]);

  useEffect(() => {
    if (isOpen && event) {
      loadTimeline();
      loadCoordinatorDetails();
    }
  }, [isOpen, event]);

  const loadCoordinatorDetails = async () => {
    if (!event) return;
    const targetId = event.organizer || event.coordinator_id;
    if (targetId) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('employee_id, first_name, last_name')
          .or(`user_id.eq.${targetId},employee_id.eq.${targetId}`)
          .maybeSingle();

        if (!error && data) {
          const nameStr = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          const empIdStr = data.employee_id || targetId;
          setCoordinatorDisplay(nameStr ? `${nameStr} (${empIdStr})` : empIdStr);
        } else {
          setCoordinatorDisplay(targetId);
        }
      } catch (e) {
        setCoordinatorDisplay(targetId);
      }
    } else {
      setCoordinatorDisplay('N/A');
    }

    // Fetch all assigned coordinators for this event
    try {
      const { data: assignData } = await supabase
        .from('event_assignments')
        .select(`
          assignment_id,
          role,
          users:user_id (
            user_id,
            employee_id,
            first_name,
            last_name,
            email_address,
            role,
            department
          )
        `)
        .eq('event_id', event.event_id)
        .eq('deletion_flag', false);

      const mapped = (assignData || []).map(a => ({
        assignment_id: a.assignment_id,
        role: a.role,
        name: `${a.users?.first_name || ''} ${a.users?.last_name || ''}`.trim() || 'Coordinator',
        id: a.users?.employee_id || a.users?.user_id || 'N/A',
        department: a.users?.department || 'N/A',
        email: a.users?.email_address || ''
      }));
      setAssignedCoordinators(mapped);
    } catch (err) {
      console.error('Error fetching assigned coordinators:', err);
    }
  };

  const loadTimeline = async () => {
    if (!event) return;
    setLoadingTimeline(true);
    try {
      // Build day timeline from start_date -> end_date
      const start = new Date(event.start_date);
      const end = new Date(event.end_date || event.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const days = [];
      let current = new Date(start);
      let dayNum = 1;
      while (current <= end) {
        const dayDate = new Date(current);
        dayDate.setHours(0, 0, 0, 0);
        let status = 'FUTURE';
        if (dayDate < today) status = 'COMPLETED';
        else if (dayDate.getTime() === today.getTime()) status = 'ACTIVE';

        days.push({
          dayNumber: dayNum,
          date: new Date(current),
          dateLabel: current.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          status,
          isSelectable: status === 'COMPLETED' || status === 'ACTIVE',
        });
        current.setDate(current.getDate() + 1);
        dayNum++;
      }
      setTimeline(days);

      // Auto-select first active or last completed day
      const autoSelect = days.find(d => d.status === 'ACTIVE') || [...days].reverse().find(d => d.status === 'COMPLETED') || days[0];
      if (autoSelect) selectDay(autoSelect, days);
    } catch (err) {
      console.error('Timeline error', err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const selectDay = async (day, timelineData) => {
    setSelectedDay(day);
    setLoadingAttendance(true);
    setAttendance([]);
    setDayStats({ registered: 0, marked: 0, present: 0, absent: 0, percentage: 0 });

    try {
      const dayDate = day.date || new Date(event.start_date);
      const nextDay = new Date(dayDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const [{ data: attData, error: attError }, { data: studentsData, error: stuError }] = await Promise.all([
        supabase
          .from('attendance')
          .select('roll_number, attendance_status, created_at')
          .eq('event_id', event.event_id)
          .gte('created_at', dayDate.toISOString())
          .lt('created_at', nextDay.toISOString()),
        supabase
          .from('students')
          .select('roll_number, first_name, last_name, department, year, section')
      ]);

      if (attError) throw attError;

      const studentMap = new Map();
      if (studentsData) {
        studentsData.forEach(s => studentMap.set(s.roll_number, s));
      }

      const records = (attData || []).map(r => {
        const s = studentMap.get(r.roll_number);
        return {
          roll_number: r.roll_number,
          name: s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : r.roll_number,
          department: s?.department || '--',
          year: s?.year || '--',
          section: s?.section || '--',
          status: r.attendance_status || 'PRESENT',
          timestamp: r.created_at,
        };
      });

      setAttendance(records);

      // Count stats
      const present = records.filter(r => (r.status || '').toUpperCase() === 'PRESENT').length;
      const absent = records.filter(r => (r.status || '').toUpperCase() === 'ABSENT').length;
      const marked = records.length;
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      // Fetch registered count
      const { count: regCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.event_id)
        .not('registration_status', 'is', null);

      setDayStats({ registered: regCount || 0, marked, present, absent, percentage });
    } catch (err) {
      console.error('Day attendance error', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const exportCSV = () => {
    const rows = filteredAttendance.map(r => [
      r.roll_number, r.name, r.department, r.year, r.section, r.status,
      r.timestamp ? new Date(r.timestamp).toLocaleString() : '--'
    ]);
    const header = ['Roll Number', 'Student Name', 'Department', 'Year', 'Section', 'Status', 'Timestamp'];
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_name}_Day${selectedDay?.dayNumber}_Report.csv`;
    a.click();
  };

  const printDay = async () => {
    // Determine total registered participants
    let totalRegistered = 0;
    try {
      const { count } = await supabase.from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.event_id)
        .not('registration_status', 'is', null);
      totalRegistered = count || 0;
    } catch (e) {}

    const { data: studentsData } = await supabase.from('students').select('roll_number, first_name, last_name, department, year, section');
    const studentMap = new Map();
    if (studentsData) studentsData.forEach(s => studentMap.set(s.roll_number, s));

    let contentHtml = '';
    
    // Helper to format table rows
    const renderTableRows = (records) => {
      if (records.length === 0) return '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6c757d">No records found</td></tr>';
      return records.map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-weight:600">${r.roll_number || '--'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${r.name || '--'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${r.department || '--'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${r.year || '--'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${r.section || '--'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="
              background:${(r.status||'').toUpperCase()==='PRESENT'?'#198754':(r.status||'').toUpperCase()==='ABSENT'?'#dc3545':'#ffc107'};
              color:${(r.status||'').toUpperCase()==='LATE'?'#212529':'#fff'};
              padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600
            ">${(r.status||'PRESENT').toUpperCase()}</span>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6c757d">
            ${r.timestamp ? new Date(r.timestamp).toLocaleString() : '--'}
          </td>
        </tr>
      `).join('');
    };

    if (reportScope === 'DAY') {
      const dataToUse = filteredAttendance;
      const dayLabel = `Day ${selectedDay?.dayNumber || 1} — ${selectedDay?.dateLabel || ''}`;
      const presentCount = dataToUse.filter(r => (r.status||'').toUpperCase() === 'PRESENT').length;
      const absentCount = dataToUse.filter(r => (r.status||'').toUpperCase() === 'ABSENT').length;
      const pct = dataToUse.length > 0 ? Math.round((presentCount / dataToUse.length) * 100) : 0;
      
      contentHtml = `
        <div class="page">
          <h2 style="margin: 20px 0 10px; color: #212529; font-size: 16px; border-bottom: 2px solid #212529; padding-bottom: 5px;">${dayLabel} Attendance Report</h2>
          <div class="stats" style="margin-bottom: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
            <div class="stat"><div class="stat-label">Registered</div><div class="stat-value" style="color:#0d6efd">${totalRegistered}</div></div>
            <div class="stat"><div class="stat-label">Present</div><div class="stat-value" style="color:#198754">${presentCount}</div></div>
            <div class="stat"><div class="stat-label">Absent</div><div class="stat-value" style="color:#dc3545">${absentCount}</div></div>
            <div class="stat"><div class="stat-label">Attendance %</div><div class="stat-value" style="color:#0dcaf0">${pct}%</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Roll Number</th><th>Student Name</th><th>Department</th><th style="text-align:center">Year</th><th style="text-align:center">Section</th><th style="text-align:center">Status</th><th>Scan Timestamp</th></tr>
            </thead>
            <tbody>
              ${renderTableRows(dataToUse)}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // OVERALL REPORT LOGIC
      let overallScans = 0;
      let overallPresent = 0;
      let overallAbsent = 0;
      const dailyStats = [];
      const studentAttMap = {}; // for student-level stats

      // Fetch all attendance for event
      const { data: allAtt } = await supabase
        .from('attendance')
        .select('roll_number, attendance_status, created_at, date')
        .eq('event_id', event.event_id);
        
      const allRecords = allAtt || [];
      
      // Group by day using timeline
      let daysHtml = '';
      
      for (const day of timeline) {
        // filter records for this day's date
        const dayDate = day.date || new Date(event.start_date);
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const dayAtt = allRecords.filter(r => {
          const d = new Date(r.created_at);
          return d >= dayDate && d < nextDay;
        });
        
        const records = dayAtt.map(r => {
          const s = studentMap.get(r.roll_number);
          // track student level
          if (!studentAttMap[r.roll_number]) {
            studentAttMap[r.roll_number] = { name: s ? `${s.first_name||''} ${s.last_name||''}`.trim() : r.roll_number, dept: s?.department||'--', presentCount: 0, totalDays: timeline.length };
          }
          if ((r.attendance_status||'').toUpperCase() === 'PRESENT') {
            studentAttMap[r.roll_number].presentCount++;
          }
          
          return {
            roll_number: r.roll_number,
            name: s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : r.roll_number,
            department: s?.department || '--',
            year: s?.year || '--',
            section: s?.section || '--',
            status: r.attendance_status || 'PRESENT',
            timestamp: r.created_at,
          };
        });
        
        const presentCount = records.filter(r => (r.status||'').toUpperCase() === 'PRESENT').length;
        const absentCount = records.filter(r => (r.status||'').toUpperCase() === 'ABSENT').length;
        const pct = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : (records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0);
        
        overallScans += records.length;
        overallPresent += presentCount;
        overallAbsent += absentCount;
        
        dailyStats.push({
          day: `Day ${day.dayNumber}`,
          date: day.dateLabel,
          present: presentCount,
          absent: absentCount,
          pct: pct
        });

        const dayLabel = `Day ${day.dayNumber} — ${day.dateLabel}`;
        
        daysHtml += `
          <div class="page">
            <h2 style="margin: 20px 0 10px; color: #212529; font-size: 16px; border-bottom: 2px solid #212529; padding-bottom: 5px;">${dayLabel} Attendance Report</h2>
            <div class="stats" style="margin-bottom: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
              <div class="stat"><div class="stat-label">Registered</div><div class="stat-value" style="color:#0d6efd">${totalRegistered}</div></div>
              <div class="stat"><div class="stat-label">Present</div><div class="stat-value" style="color:#198754">${presentCount}</div></div>
              <div class="stat"><div class="stat-label">Absent</div><div class="stat-value" style="color:#dc3545">${absentCount}</div></div>
              <div class="stat"><div class="stat-label">Attendance %</div><div class="stat-value" style="color:#0dcaf0">${pct}%</div></div>
            </div>
            <table>
              <thead>
                <tr><th>Roll Number</th><th>Student Name</th><th>Department</th><th style="text-align:center">Year</th><th style="text-align:center">Section</th><th style="text-align:center">Status</th><th>Scan Timestamp</th></tr>
              </thead>
              <tbody>
                ${renderTableRows(records)}
              </tbody>
            </table>
          </div>
        `;
      }

      // Calculate Insights
      const avgPct = dailyStats.length > 0 ? Math.round(dailyStats.reduce((acc, curr) => acc + curr.pct, 0) / dailyStats.length) : 0;
      const sortedByPct = [...dailyStats].sort((a,b) => b.pct - a.pct);
      const highestDay = sortedByPct.length > 0 ? `${sortedByPct[0].day} (${sortedByPct[0].pct}%)` : 'N/A';
      const lowestDay = sortedByPct.length > 0 ? `${sortedByPct[sortedByPct.length-1].day} (${sortedByPct[sortedByPct.length-1].pct}%)` : 'N/A';

      // Daily stats table
      const dailyTableRows = dailyStats.map(d => `
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding:8px 10px; font-weight:bold;">${d.day}</td>
          <td style="padding:8px 10px;">${d.date}</td>
          <td style="padding:8px 10px; text-align:right; color:#198754; font-weight:bold;">${d.present}</td>
          <td style="padding:8px 10px; text-align:right; color:#dc3545;">${d.absent}</td>
          <td style="padding:8px 10px; text-align:right; font-weight:bold;">${d.pct}%</td>
        </tr>
      `).join('');

      // Student level analytics rows
      const studentRows = Object.entries(studentAttMap)
        .sort((a,b) => b[1].presentCount - a[1].presentCount)
        .map(([roll, data], i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
            <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; font-weight:600;">${roll}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb;">${data.name}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; text-align:right;">${data.presentCount} / ${data.totalDays}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:bold; color:${data.presentCount === data.totalDays ? '#198754' : '#212529'}">${Math.round((data.presentCount/data.totalDays)*100)}%</td>
          </tr>
        `).join('');

      // Inject Chart Data Script
      const chartLabels = dailyStats.map(d => d.day);
      const chartData = dailyStats.map(d => d.pct);
      
      contentHtml = `
        <div class="page">
          <h2 style="text-align:center; margin: 0 0 20px 0; color: #212529; font-size: 22px; text-transform: uppercase; border-bottom: 2px solid #212529; padding-bottom: 10px;">Overall Event Analytics</h2>
          
          <div class="stats" style="margin-bottom: 30px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
            <div class="stat"><div class="stat-label">Total Registered</div><div class="stat-value">${totalRegistered}</div></div>
            <div class="stat"><div class="stat-label">Total Attendance</div><div class="stat-value" style="color:#198754">${overallPresent}</div></div>
            <div class="stat"><div class="stat-label">Avg Attendance</div><div class="stat-value" style="color:#0dcaf0">${avgPct}%</div></div>
            <div class="stat"><div class="stat-label">Event Days</div><div class="stat-value">${timeline.length}</div></div>
          </div>

          <div style="display:flex; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 2; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;">
              <div style="background: #212529; color: #fff; padding: 10px; font-weight: 700; font-size: 14px; text-transform: uppercase;">Day-wise Summary</div>
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8f9fa;">
                  <tr>
                    <th style="padding:10px; border-bottom:2px solid #dee2e6; text-align:left; color:#495057;">Day</th>
                    <th style="padding:10px; border-bottom:2px solid #dee2e6; text-align:left; color:#495057;">Date</th>
                    <th style="padding:10px; border-bottom:2px solid #dee2e6; text-align:right; color:#495057;">Present</th>
                    <th style="padding:10px; border-bottom:2px solid #dee2e6; text-align:right; color:#495057;">Absent</th>
                    <th style="padding:10px; border-bottom:2px solid #dee2e6; text-align:right; color:#495057;">Att %</th>
                  </tr>
                </thead>
                <tbody>${dailyTableRows}</tbody>
              </table>
            </div>
            
            <div style="flex: 1; border: 1px solid #dee2e6; border-radius: 8px; background: #f8f9fa; padding: 15px;">
              <div style="font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; color: #212529; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Event Insights</div>
              <ul style="list-style: none; padding: 0; font-size: 13px; line-height: 2;">
                <li>• <b>Total Registered:</b> ${totalRegistered}</li>
                <li>• <b>Highest Att.:</b> ${highestDay}</li>
                <li>• <b>Lowest Att.:</b> ${lowestDay}</li>
                <li>• <b>Daily Average:</b> ${avgPct}%</li>
                <li>• <b>Total Records:</b> ${overallScans}</li>
              </ul>
            </div>
          </div>

          <div style="display:flex; gap: 20px; margin-bottom: 40px;">
             <div style="flex: 1; height: 250px; border: 1px solid #dee2e6; border-radius: 8px; padding: 10px; background: #fff;">
               <canvas id="trendChart"></canvas>
             </div>
             <div style="flex: 1; height: 250px; border: 1px solid #dee2e6; border-radius: 8px; padding: 10px; background: #fff;">
               <canvas id="distChart"></canvas>
             </div>
          </div>

          <div style="page-break-inside: avoid;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Student-Level Analytics (Top)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #dee2e6;">
              <thead style="background: #f8f9fa;">
                <tr>
                  <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dee2e6; color:#495057;">Roll No</th>
                  <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #dee2e6; color:#495057;">Student Name</th>
                  <th style="padding:8px 10px; text-align:right; border-bottom:2px solid #dee2e6; color:#495057;">Days Present</th>
                  <th style="padding:8px 10px; text-align:right; border-bottom:2px solid #dee2e6; color:#495057;">Att %</th>
                </tr>
              </thead>
              <tbody>${studentRows}</tbody>
            </table>
          </div>
        </div>
        
        <script>
          window.renderCharts = function() {
             const ctx1 = document.getElementById('trendChart').getContext('2d');
             new Chart(ctx1, {
               type: 'bar',
               data: {
                 labels: ${JSON.stringify(chartLabels)},
                 datasets: [{
                   label: 'Attendance %',
                   data: ${JSON.stringify(chartData)},
                   backgroundColor: '#0d6efd',
                   borderRadius: 4
                 }]
               },
               options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: { title: { display: true, text: 'Daily Attendance Trend' }, legend: { display: false } },
                 scales: { y: { min: 0, max: 100 } }
               }
             });

             const ctx2 = document.getElementById('distChart').getContext('2d');
             new Chart(ctx2, {
               type: 'doughnut',
               data: {
                 labels: ['Present', 'Absent'],
                 datasets: [{
                   data: [${overallPresent}, ${overallAbsent}],
                   backgroundColor: ['#198754', '#dc3545']
                 }]
               },
               options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: { title: { display: true, text: 'Overall Distribution' } }
               }
             });
          };
        </script>
        ${daysHtml}
      `;
    }

    const printWindow = window.open('', '_blank', '');
    if (!printWindow) {
      alert("Please allow popups to print reports.");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report — ${event.event_name}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #212529; background: #fff; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; color: #000; text-transform: uppercase; }
          .header h2 { font-size: 16px; font-weight: 600; color: #495057; text-transform: uppercase; }
          
          .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 15px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; }
          .meta-item {}
          .meta-label { font-size: 10px; font-weight: 700; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-value { font-weight: 600; font-size: 13px; color: #000; }
          
          .stats { display: flex; }
          .stat { flex: 1; text-align: center; padding: 15px 10px; border-right: 1px solid #dee2e6; }
          .stat:last-child { border-right: none; }
          .stat-label { font-size: 11px; color: #495057; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-value { font-size: 26px; font-weight: 800; margin-top: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #212529; padding: 10px; text-align: left; font-size: 11px; font-weight: 700; color: #fff; text-transform: uppercase; border: 1px solid #212529; }
          td { border: 1px solid #dee2e6; }
          
          .footer { padding: 20px; text-align: center; font-size: 11px; color: #6c757d; border-top: 1px solid #dee2e6; margin-top: 30px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; }
          .sig-box { text-align: center; border-top: 1px solid #000; padding-top: 8px; width: 200px; font-weight: 600; font-size: 12px; color: #000; }
          
          .page { page-break-after: always; padding: 10px 0; }
          .page:last-child { page-break-after: avoid; }
          
          @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
            .no-print { display: none; }
            /* Add page numbers */
            .footer::after { counter-increment: page; content: "Page " counter(page); position: fixed; bottom: 0; right: 15mm; font-size: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BVC ENGINEERING COLLEGE</h1>
          <h2>EVENT MANAGEMENT SYSTEM &nbsp;|&nbsp; ATTENDANCE REPORT</h2>
        </div>
        <div class="meta">
          <div class="meta-item"><div class="meta-label">Event Name</div><div class="meta-value">${event.event_name}</div></div>
          <div class="meta-item"><div class="meta-label">Event ID</div><div class="meta-value">${event.event_id}</div></div>
          <div class="meta-item"><div class="meta-label">Department</div><div class="meta-value">${event.departments || 'All'}</div></div>
          <div class="meta-item"><div class="meta-label">Event Admin</div><div class="meta-value">${coordinatorDisplay}</div></div>
          <div class="meta-item"><div class="meta-label">Start Date</div><div class="meta-value">${event.start_date || '--'}</div></div>
          <div class="meta-item"><div class="meta-label">End Date</div><div class="meta-value">${event.end_date || event.start_date || '--'}</div></div>
          <div class="meta-item"><div class="meta-label">Duration</div><div class="meta-value">${timeline.length} Days</div></div>
          <div class="meta-item"><div class="meta-label">Generated On</div><div class="meta-value">${new Date().toLocaleString('en-IN')}</div></div>
        </div>
        
        <div class="report-content">
          ${contentHtml}
        </div>

        <div class="signatures">
          <div class="sig-box">Event Coordinator</div>
          <div class="sig-box">Head of Department</div>
          <div class="sig-box">Principal</div>
        </div>

        <div class="footer no-print">
          Report generated by BVC Event Management System
        </div>
        
        <script>
          window.onload = function() { 
            if(window.renderCharts) window.renderCharts();
            setTimeout(() => window.print(), 800); 
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE': return { bg: '#0d6efd', text: 'Active Today' };
      case 'COMPLETED': return { bg: '#198754', text: 'Done' };
      default: return { bg: '#6c757d', text: 'Future' };
    }
  };

  const isRegEnabled = event?.enable_registration === 'Yes' || event?.enable_registration === true;

  let customFields = [];
  try {
    if (event?.registration_fields) {
      customFields = typeof event.registration_fields === 'string'
        ? JSON.parse(event.registration_fields)
        : event.registration_fields;
    }
  } catch (e) { }

  const filteredAttendance = attendance.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.roll_number?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q);
  });

  const formatDate = (d) => {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Active': return '#198754';
      case 'Upcoming': return '#0d6efd';
      case 'Completed': return '#0dcaf0';
      case 'Cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (!isOpen || !event) return null;

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };
  const dialogStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '950px',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  };
  const cardStyle = {
    background: '#fff', borderRadius: '8px', border: '1px solid rgba(0,0,0,.125)',
    boxShadow: '0 1px 3px rgba(0,0,0,.08)', marginBottom: '1rem',
  };
  const cardHeaderStyle = {
    background: '#fff', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,.05)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };
  const statCellStyle = {
    flex: 1, textAlign: 'center', padding: '0.75rem 0.5rem',
    borderRight: '1px solid #dee2e6',
  };

  const getComputedStatus = () => {
    let status = event.event_status || 'Draft';
    if (status !== 'Cancelled' && status !== 'Draft') {
      const today = new Date();
      const end = new Date(event.end_date || event.start_date);
      end.setHours(23, 59, 59, 999);
      const start = new Date(event.start_date);
      start.setHours(0, 0, 0, 0);
      
      if (today > end) status = 'Completed';
      else if (today < start) status = 'Upcoming';
      else status = 'Active';
    }
    return status;
  };

  const computedStatus = getComputedStatus();

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialogStyle}>
        {/* Header */}
        <div style={{ background: '#212529', color: '#fff', padding: '1rem 1.5rem', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <h5 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#fff' }}>{event.event_name}</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: getStatusColor(computedStatus), color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                {computedStatus}
              </span>
              <small style={{ color: 'rgba(255,255,255,0.85)' }}>ID: {event.event_id}</small>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', background: '#f8f9fa', flex: 1 }}>

          {/* Section 1: Meta Summary */}
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '1rem 0' }}>
              <div style={{ ...statCellStyle, borderLeft: '1px solid #dee2e6' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start & End Date</div>
                <div style={{ fontWeight: 700, color: '#212529', marginTop: '0.25rem' }}>
                  {formatDate(event.start_date)}
                  {event.end_date && event.end_date !== event.start_date && <> – {formatDate(event.end_date)}</>}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                  Duration: {timeline.length || 1} Day{timeline.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={statCellStyle}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                <div style={{ fontWeight: 700, color: '#212529', marginTop: '0.25rem' }}>{event.departments || 'All'}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Venue: {event.location || event.venue || 'N/A'}</div>
              </div>
              <div style={statCellStyle}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Admin</div>
                <div style={{ fontWeight: 700, color: '#212529', marginTop: '0.25rem' }}>{coordinatorDisplay}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Capacity: {event.capacity || 'Unlimited'}</div>
              </div>
              <div style={{ ...statCellStyle, borderRight: 'none' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Attendance</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1, height: '10px', background: '#dee2e6', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dayStats.percentage}%`, background: '#198754', borderRadius: '5px', transition: 'width 0.4s' }}></div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#198754', minWidth: '36px' }}>{dayStats.percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1.5: Assigned Event Coordinators */}
          {assignedCoordinators.length > 0 && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h6 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                  👥 Assigned Event Coordinators ({assignedCoordinators.length})
                </h6>
              </div>
              <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {assignedCoordinators.map(c => (
                  <div key={c.assignment_id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                      ID: {c.id}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {c.role} • {c.department}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Day Timeline */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h6 style={{ margin: 0, fontWeight: 700 }}>
                📅 Event Day Timeline
              </h6>
              <small style={{ color: '#6c757d' }}>Tap an active or completed day to view attendance</small>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {loadingTimeline ? (
                <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>⏳ Calculating timeline...</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {timeline.map(d => {
                    const badge = getStatusBadge(d.status);
                    const isSelected = selectedDay?.dayNumber === d.dayNumber;
                    const btnStyle = {
                      padding: '0.5rem 0.75rem',
                      border: isSelected ? '2.5px solid #212529' : `1px solid ${badge.bg}`,
                      borderRadius: '6px',
                      background: d.status === 'ACTIVE' ? '#0d6efd' : d.status === 'COMPLETED' ? '#198754' : '#e9ecef',
                      color: d.status === 'FUTURE' ? '#6c757d' : '#fff',
                      cursor: d.isSelectable ? 'pointer' : 'not-allowed',
                      opacity: d.isSelectable ? 1 : 0.6,
                      minWidth: '110px', textAlign: 'left',
                      fontWeight: isSelected ? 700 : 500,
                      boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.2)' : 'none',
                    };
                    return (
                      <button key={d.dayNumber} style={btnStyle} disabled={!d.isSelectable} onClick={() => selectDay(d)}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                          {d.status === 'ACTIVE' ? '▶' : d.status === 'COMPLETED' ? '✓' : '⏱'} {badge.text}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>Day {d.dayNumber}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>{d.dateLabel}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Day Attendance */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <h6 style={{ margin: '0 0 0.125rem 0', fontWeight: 700 }}>
                  ✅ Day {selectedDay?.dayNumber || 1} Attendance
                </h6>
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>Date: {selectedDay?.dateLabel || '--'}</span>
              </div>
              <input
                type="text"
                placeholder="Search roll no or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.875rem', width: '220px' }}
              />
            </div>

            {/* Day Stat Boxes */}
            <div style={{ display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', borderTop: '1px solid #dee2e6' }}>
              {[
                { label: 'REGISTERED', value: dayStats.registered, color: '#212529' },
                { label: 'MARKED TOTAL', value: dayStats.marked, color: '#0d6efd' },
                { label: 'PRESENT', value: dayStats.present, color: '#198754' },
                { label: 'ABSENT', value: dayStats.absent, color: '#dc3545' },
                { label: 'ATTENDANCE %', value: `${dayStats.percentage}%`, color: '#0dcaf0' },
              ].map((s, i) => (
                <div key={i} style={{ ...statCellStyle, borderLeft: i === 0 ? '1px solid #dee2e6' : 'none', borderRight: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: '0.7rem', color: '#6c757d', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Attendance Table */}
            <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    {['Roll Number', 'Student Name', 'Department', 'Year', 'Section', 'Status', 'Scan Timestamp'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', fontWeight: 600, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingAttendance ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>⏳ Loading Day {selectedDay?.dayNumber} attendance...</td></tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                      {attendance.length === 0 ? `No attendance records found for Day ${selectedDay?.dayNumber || 1}` : 'No results match your search'}
                    </td></tr>
                  ) : filteredAttendance.map((r, i) => {
                    const st = (r.status || '').toUpperCase();
                    const badgeBg = st === 'PRESENT' ? '#198754' : st === 'ABSENT' ? '#dc3545' : '#ffc107';
                    const badgeColor = st === 'LATE' ? '#212529' : '#fff';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{r.roll_number}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{r.name}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{r.department}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{r.year}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{r.section}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{ background: badgeBg, color: badgeColor, padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{st}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#6c757d', fontSize: '0.8rem' }}>
                          {r.timestamp ? new Date(r.timestamp).toLocaleString() : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Registration Settings */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h6 style={{ margin: 0, fontWeight: 700 }}>⚙️ Registration Settings</h6>
              <span style={{ background: isRegEnabled ? '#198754' : '#6c757d', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                {isRegEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {isRegEnabled ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase' }}>Registration Window</div>
                    <strong style={{ fontSize: '0.875rem' }}>{formatDate(event.registration_open)} to {formatDate(event.registration_close)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase' }}>Maximum Seats</div>
                    <strong style={{ fontSize: '0.875rem' }}>{event.maximum_seats || 'Unlimited'}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase' }}>Spot Registration</div>
                    <strong style={{ fontSize: '0.875rem' }}>{event.allow_spot_registration === 'Yes' || event.allow_spot_registration === true ? 'Allowed' : 'Not Allowed'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #dee2e6', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Registration Fields</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span title="Roll Number, Name, Department, Year, Section, Email" style={{ background: '#6c757d', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'help' }}>6 Default Fields (Roll No, Name, Dept, Year, Section, Email)</span>
                      {customFields.map((f, i) => (
                        <span key={i} style={{ background: '#0d6efd', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem' }}>
                          {f.name} ({f.type}){f.required ? '*' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>Registration is not enabled for this event.</div>
              )}
            </div>
          </div>

          {/* Section 5: Export */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h6 style={{ margin: 0, fontWeight: 700 }}>📊 Event Reports & Export</h6>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ExportDropdown
                  data={reportScope === 'DAY' ? filteredAttendance : attendance}
                  columns={[
                    { header: 'Roll Number', key: 'roll_number' },
                    { header: 'Student Name', key: 'name' },
                    { header: 'Department', key: 'department' },
                    { header: 'Year', key: 'year' },
                    { header: 'Section', key: 'section' },
                    { header: 'Status', key: 'status' },
                    { header: 'Timestamp', key: r => r.timestamp ? new Date(r.timestamp).toLocaleString() : '--' },
                  ]}
                  filename={`attendance_${sanitizeFilename(event.event_name)}_${reportScope === 'DAY' ? `day${selectedDay?.dayNumber||1}` : 'full'}_${getFormattedDate()}`}
                  title={`Attendance Report — ${event.event_name}`}
                  subtitle={`Scope: ${reportScope === 'DAY' ? `Day ${selectedDay?.dayNumber || 1} (${selectedDay?.dateLabel || ''})` : 'Full Event (All Days)'}`}
                  appliedFilters={[
                    `Event: ${event.event_name}`,
                    `Scope: ${reportScope}`,
                    searchQuery ? `Search: "${searchQuery}"` : null,
                  ].filter(Boolean)}
                  summaryStats={[
                    { label: 'Scanned Total', value: (reportScope === 'DAY' ? filteredAttendance : attendance).length },
                    { label: 'Present', value: (reportScope === 'DAY' ? filteredAttendance : attendance).filter(r => (r.status||'').toUpperCase() === 'PRESENT').length },
                    { label: 'Absent', value: (reportScope === 'DAY' ? filteredAttendance : attendance).filter(r => (r.status||'').toUpperCase() === 'ABSENT').length },
                  ]}
                />
                <button onClick={printDay} style={{ height: '40px', padding: '0 1rem', background: 'transparent', border: '1px solid #212529', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#212529', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🖨️ Print View
                </button>
              </div>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: '#6c757d' }}>Report Target Scope:</span>
              {[
                { value: 'DAY', label: `Currently Selected Day Only (Day ${selectedDay?.dayNumber || 1})` },
                { value: 'EVENT', label: 'Entire Event (All Days Summary)' }
              ].map(o => (
                <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input type="radio" name="reportScope" checked={reportScope === o.value} onChange={() => setReportScope(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #dee2e6', background: '#fff', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '0.5rem 2rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
