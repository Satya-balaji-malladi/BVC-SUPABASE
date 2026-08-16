import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Plus, Search, Loader2, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import TablePagination from '../widgets/TablePagination';
import CreateEventModal from '../widgets/CreateEventModal';
import HodCreateEventModal from '../widgets/HodCreateEventModal';
import ManageEventModal from '../widgets/ManageEventModal';
import ViewEventModal from '../widgets/ViewEventModal';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';
import EventAdminService from '../../services/EventAdminService';
import { normalizeRole, isHOD as checkIsHOD, isEventAdmin as checkIsEventAdmin, isSuperAdminOrDev } from '../../constants/Roles';
import { normalizeDepartment } from '../../utils/departmentUtils';

export default function EventsModule({ userRole, userDepartment }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);
  const [manageEvent, setManageEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCoord, setFilterCoord] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const location = useLocation();

  useEffect(() => {
    fetchEvents();
  }, [userRole]);

  // Keep modals updated with fresh data if the events array changes in the background
  useEffect(() => {
    if (viewEvent) {
      const updated = events.find(e => e.event_id === viewEvent.event_id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(viewEvent)) {
        setViewEvent(updated);
      }
    }
    if (manageEvent) {
      const updated = events.find(e => e.event_id === manageEvent.event_id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(manageEvent)) {
        setManageEvent(updated);
      }
    }
  }, [events]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const isEventAdmin = checkIsEventAdmin(userRole);
      const isHOD = checkIsHOD(userRole);
      const normUserDept = normalizeDepartment(userDepartment);
      let data = [];

      if (isEventAdmin) {
        try {
           data = await EventAdminService.getEvents();
        } catch(e) {
           console.error('EventAdminService.getEvents() threw:', e);
           // Handle error appropriately without falling back to insecure direct queries
           throw new Error('Failed to fetch authorized events');
        }
      } else {
        // Legacy fetching for other roles
        let query = supabase.from('events').select('*');
        if (isHOD && normUserDept) {
          query = query.ilike('departments', `%${normUserDept}%`);
        }
        const { data: qData, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        data = qData || [];
      }

      setEvents(data);

      // Fetch users mapping for resolving organizer / coordinator IDs to Employee IDs
      const organizerIds = [...new Set(data.map(e => e.organizer || e.coordinator_id).filter(Boolean))];
      if (organizerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, employee_id, first_name, last_name')
          .in('user_id', organizerIds);

        const map = {};
        (usersData || []).forEach(u => {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          const empId = u.employee_id || u.user_id;
          map[u.user_id] = name ? `${empId} (${name})` : empId;
        });
        setUserMap(map);
      }

      // Check if we need to auto-open the setup modal
      const queryParams = new URLSearchParams(location.search);
      if (queryParams.get('setupEvent') === 'true' && data.length === 1) {
        const ev = data[0];
        if (ev.event_status === 'Draft' || ev.status === 'Draft') {
          setManageEvent(ev);
          // Clear URL parameter so it doesn't auto-open on page refresh
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }

    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepts = [...new Set(events.flatMap(e => (e.departments || '').split(',').map(d => d.trim()).filter(Boolean)))];
  const uniqueStatuses = [...new Set(events.map(e => e.status || e.event_status).filter(Boolean))];
  const uniqueCoords = [...new Set(events.map(e => e.coordinator_id || e.organizer).filter(Boolean))];
  const uniqueYears = [...new Set(events.map(e => e.start_date ? new Date(e.start_date).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a);

  const filteredEvents = events.filter(event => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      (event.event_name || '').toLowerCase().includes(q) ||
      (event.departments || '').toLowerCase().includes(q) ||
      (event.venue || event.location || '').toLowerCase().includes(q) ||
      (event.coordinator_id || event.organizer || '').toLowerCase().includes(q) ||
      (event.event_id || '').toLowerCase().includes(q);

    const eventStatus = event.status || event.event_status || '';
    const matchStatus = !filterStatus || eventStatus === filterStatus;
    const matchDept = !filterDept || (event.departments || '').includes(filterDept);
    const matchCoord = !filterCoord || (event.coordinator_id || event.organizer || '') === filterCoord;

    let matchMonth = true;
    let matchYear = true;
    if (event.start_date) {
      const d = new Date(event.start_date);
      if (filterMonth) matchMonth = (d.getMonth() + 1) === parseInt(filterMonth, 10);
      if (filterYear) matchYear = d.getFullYear() === parseInt(filterYear, 10);
    } else if (filterMonth || filterYear) {
      matchMonth = false;
      matchYear = false;
    }

    let matchDateRange = true;
    if (event.start_date) {
      const startDate = event.start_date;
      if (filterFromDate && startDate < filterFromDate) matchDateRange = false;
      if (filterToDate && startDate > filterToDate) matchDateRange = false;
    }

    return matchSearch && matchStatus && matchDept && matchCoord && matchMonth && matchYear && matchDateRange;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + rowsPerPage);

  const eventColumns = [
    { header: 'Event ID', key: e => e.event_id || '--' },
    { header: 'Event Name', key: 'event_name' },
    { header: 'Start Date', key: e => e.start_date ? new Date(e.start_date).toLocaleDateString() : '--' },
    { header: 'End Date', key: e => e.end_date ? new Date(e.end_date).toLocaleDateString() : '--' },
    { header: 'Venue', key: e => e.venue || e.location || '--' },
    { header: 'Event Admin', key: e => e.coordinator_id || e.organizer || '--' },
    { header: 'Target Departments', key: e => e.departments || 'Global' },
    { header: 'Status', key: e => e.event_status || e.status || 'Draft' },
  ];

  const appliedFilters = [
    filterStatus ? `Status: ${filterStatus}` : 'All Statuses',
    filterDept ? `Dept: ${filterDept}` : 'All Departments',
    searchTerm ? `Search: "${searchTerm}"` : null,
  ].filter(Boolean);

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return '#22c55e';
    if (s === 'completed') return '#0ea5e9';
    if (s === 'cancelled' || s === 'stopped') return '#ef4444';
    return '#3b82f6';
  };

  const getEventStatusStr = (e) => String(e.status || e.event_status || '').toLowerCase().trim();

  const statCards = [
    { label: 'Total Events', value: filteredEvents.length.toString(), color: 'var(--text-primary)' },
    { label: 'Draft', value: filteredEvents.filter(e => getEventStatusStr(e) === 'draft').length.toString(), color: '#8b5cf6' },
    { label: 'Upcoming', value: filteredEvents.filter(e => getEventStatusStr(e) === 'upcoming').length.toString(), color: '#3b82f6' },
    { label: 'Active', value: filteredEvents.filter(e => getEventStatusStr(e) === 'active').length.toString(), color: '#22c55e' },
    { label: 'Stopped', value: filteredEvents.filter(e => getEventStatusStr(e) === 'stopped').length.toString(), color: 'var(--text-primary)' },
    { label: 'Completed', value: filteredEvents.filter(e => getEventStatusStr(e) === 'completed').length.toString(), color: '#0ea5e9' },
    { label: 'Cancelled', value: filteredEvents.filter(e => getEventStatusStr(e) === 'cancelled').length.toString(), color: '#ef4444' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div className="page-header-flex">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>
            Event Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Manage and oversee all institutional events.
          </p>
        </div>
        <div className="header-actions">
          <ExportDropdown
            data={filteredEvents}
            columns={eventColumns}
            filename={`events_${getFormattedDate()}`}
            title="Events Directory Master Export"
            subtitle={`Total Filtered Events: ${filteredEvents.length}`}
            appliedFilters={appliedFilters}
            summaryStats={[
              { label: 'Total Events', value: filteredEvents.length },
              { label: 'Active', value: filteredEvents.filter(e => (e.event_status||e.status) === 'Active').length },
              { label: 'Completed', value: filteredEvents.filter(e => (e.event_status||e.status) === 'Completed').length },
            ]}
          />
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-blue)' }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} /> Create Event
          </button>
        </div>
      </div>

      {/* Top Stats Grid - Hidden for Event Admin */}
      {!checkIsEventAdmin(userRole) && (
        <div className="glass-panel" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', borderRadius: '8px' }}>
          {statCards.map((card, idx) => (
            <div key={idx} style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
        
        {/* Filter Bar */}
        <div className="responsive-filter-grid">
          {!checkIsEventAdmin(userRole) && (
            <>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search events, venue..." 
                  style={{ paddingLeft: '2.5rem', width: '100%', height: '40px' }}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <select className="input-field" style={{ height: '40px', width: '100%' }}
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {isSuperAdminOrDev(userRole) && (
                <select className="input-field" style={{ height: '40px', width: '100%' }}
                  value={filterDept}
                  onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">All Departments</option>
                  {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              <select className="input-field" style={{ height: '40px', width: '100%' }}
                value={filterCoord}
                onChange={e => { setFilterCoord(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Event Admins</option>
                {uniqueCoords.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="input-field" style={{ height: '40px', width: '100%' }}
                value={filterMonth}
                onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Months</option>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              {(filterStatus || filterDept || filterCoord || filterMonth || filterYear || filterFromDate || filterToDate || searchTerm) && (
                <button className="btn btn-secondary" style={{ height: '40px', fontSize: '0.8rem', width: '100%' }}
                  onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterDept(''); setFilterCoord(''); setFilterMonth(''); setFilterYear(''); setFilterFromDate(''); setFilterToDate(''); setCurrentPage(1); }}>
                  ✕ Clear Filters
                </button>
              )}
            </>
          )}
        </div>
        <div className="responsive-table-wrapper">
          <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                {['Event ID', 'Event Name', 'Dates', 'Start Time', 'End Time', 'Venue', 'Event Admin', 'Target Depts', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.875rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Loader2 className="animate-spin" size={24} />
                      Loading events...
                    </div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No events found.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map(event => (
                  <tr key={event.event_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{event.event_id?.substring(0,8) || 'EVT-01'}</td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{event.event_name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {event.start_date ? new Date(event.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{event.start_time || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{event.end_time || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{event.location || '-'}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {userMap[event.organizer || event.coordinator_id] || event.organizer || event.coordinator_id || '-'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{event.departments || 'Global'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ color: getStatusColor(event.event_status), fontWeight: '600', fontSize: '0.875rem' }}>
                        {event.event_status || 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', height: 'auto', display: 'flex' }}
                        title="View Details"
                        onClick={() => setViewEvent(event)}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', height: 'auto', display: 'flex' }} 
                        title="Manage/Edit Event"
                        onClick={() => setManageEvent(event)}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
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
            ) : paginatedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No events found.
              </div>
            ) : (
              paginatedEvents.map(event => (
                <div key={event.event_id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-badge">
                        {event.event_id?.substring(0,8) || 'EVT-01'}
                      </span>
                      <h4 style={{ margin: '0.5rem 0 0 0', color: 'var(--text-primary)' }}>{event.event_name}</h4>
                    </div>
                    <span style={{ color: getStatusColor(event.event_status), fontWeight: '600', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: `${getStatusColor(event.event_status)}15`, borderRadius: '999px' }}>
                      {event.event_status || 'Draft'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Date:</span>
                      <span className="mobile-card-value">
                        {event.start_date ? new Date(event.start_date).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Time:</span>
                      <span className="mobile-card-value">
                        {event.start_time || '-'} to {event.end_time || '-'}
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Venue:</span>
                      <span className="mobile-card-value">{event.location || '-'}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Depts:</span>
                      <span className="mobile-card-value">
                        <span className="mobile-card-badge">{event.departments || 'Global'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setViewEvent(event)}
                    >
                      <Eye size={15} /> View
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setManageEvent(event)}
                    >
                      <Edit size={15} /> Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <TablePagination 
          totalRows={filteredEvents.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {isModalOpen && (
        (checkIsHOD(userRole) || isSuperAdminOrDev(userRole)) ? (
          <HodCreateEventModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onEventCreated={() => fetchEvents()}
          />
        ) : (
          <CreateEventModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onEventCreated={() => fetchEvents()}
          />
        )
      )}

      {viewEvent && (
        <ViewEventModal 
          isOpen={true}
          onClose={() => setViewEvent(null)}
          event={viewEvent}
        />
      )}

      {manageEvent && (
        <ManageEventModal
          isOpen={!!manageEvent}
          onClose={() => setManageEvent(null)}
          event={manageEvent}
          onEventUpdated={() => fetchEvents()}
        />
      )}
    </div>
  );
}
