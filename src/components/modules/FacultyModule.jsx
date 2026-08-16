import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Filter, Loader2, UserPlus, Upload, Download, MoreVertical, Mail, Building, Briefcase, X, Edit, Trash2, Eye } from 'lucide-react';
import BulkImporter from '../widgets/BulkImporter';
import TablePagination from '../widgets/TablePagination';
import CreateFacultyModal from '../widgets/CreateFacultyModal';
import ViewFacultyModal from '../widgets/ViewFacultyModal';
import ExportDropdown from '../widgets/ExportDropdown';
import { getFormattedDate } from '../../services/exportService';

export default function FacultyModule({ userRole, userDepartment }) {
  const [faculty, setFaculty] = useState([]);
  const [viewFaculty, setViewFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';

  useEffect(() => {
    fetchFaculty();
  }, [userRole, userDepartment]);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*')
        .in('role', ['Faculty', 'Event Admin', 'HOD']);

      if (isHOD && userDepartment) {
        query = query.ilike('department', `%${userDepartment}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // --- DYNAMIC STATUS COMPUTATION ---
      // Fetch all "active" events (Published)
      const { data: activeEvents } = await supabase
        .from('events')
        .select('event_id, organizer, allowed_coordinator_ids')
        .eq('event_status', 'Published');

      // Fetch coordinators for active events
      const activeEventIds = activeEvents ? activeEvents.map(e => e.event_id) : [];
      let activeCoordinators = [];
      if (activeEventIds.length > 0) {
        const { data: coords } = await supabase
          .from('event_coordinators')
          .select('user_id')
          .in('event_id', activeEventIds);
        if (coords) activeCoordinators = coords;
      }

      // Create a set of active user IDs who are managing active events
      const activeUserIds = new Set();
      
      if (activeEvents) {
        activeEvents.forEach(evt => {
          if (evt.organizer) activeUserIds.add(evt.organizer);
          if (Array.isArray(evt.allowed_coordinator_ids)) {
            evt.allowed_coordinator_ids.forEach(id => activeUserIds.add(id));
          } else if (typeof evt.allowed_coordinator_ids === 'string') {
             try {
               const parsed = JSON.parse(evt.allowed_coordinator_ids);
               if (Array.isArray(parsed)) parsed.forEach(id => activeUserIds.add(id));
             } catch(e) {}
          }
        });
      }
      
      activeCoordinators.forEach(c => {
        if (c.user_id) activeUserIds.add(c.user_id);
      });

      // Map faculty data to overwrite status dynamically
      const facultyWithDynamicStatus = (data || []).map(f => {
        if (f.role === 'Super Admin') return { ...f, status: 'Active' };
        const isActive = activeUserIds.has(f.user_id);
        return { ...f, status: isActive ? 'Active' : 'Inactive' };
      });

      setFaculty(facultyWithDynamicStatus);
    } catch (err) {
      console.error('Error fetching faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepts = [...new Set(faculty.map(f => f.department).filter(Boolean))].sort();
  const uniqueRoles = [...new Set(faculty.map(f => f.role).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(faculty.map(f => f.status || 'Active').filter(Boolean))].sort();

  const filteredFaculty = faculty.filter(f => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      ((f.first_name || '') + ' ' + (f.last_name || '')).toLowerCase().includes(q) ||
      (f.department || '').toLowerCase().includes(q) ||
      (f.employee_id || f.user_id || '').toLowerCase().includes(q) ||
      (f.email_address || '').toLowerCase().includes(q);
    const matchDept = !filterDept || (f.department || '') === filterDept;
    const matchRole = !filterRole || (f.role || '') === filterRole;
    const matchStatus = !filterStatus || (f.status || 'Active') === filterStatus;
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedFaculty = filteredFaculty.slice(startIndex, startIndex + rowsPerPage);

  const facultyColumns = [
    { header: 'Employee ID', key: f => f.employee_id || f.user_id || '--' },
    { header: 'Faculty Name', key: f => `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown' },
    { header: 'Email Address', key: 'email_address' },
    { header: 'Department', key: f => f.department || 'N/A' },
    { header: 'Role', key: 'role' },
  ];

  const appliedFilters = [
    filterDept ? `Dept: ${filterDept}` : 'All Departments',
    filterRole ? `Role: ${filterRole}` : 'All Roles',
    searchTerm ? `Search: "${searchTerm}"` : null,
  ].filter(Boolean);

  const statCards = [
    { label: 'Total Faculty', value: filteredFaculty.length.toString(), color: 'var(--text-primary)' },
    { label: 'Active Staff', value: filteredFaculty.filter(f => (f.status || 'Active') !== 'Inactive').length.toString(), color: '#22c55e' },
    { label: 'Event Admins', value: filteredFaculty.filter(f => (f.role || '').toLowerCase().includes('admin')).length.toString(), color: '#3b82f6' },
    { label: 'Departments', value: [...new Set(filteredFaculty.map(f => f.department).filter(Boolean))].length.toString(), color: '#0ea5e9' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      <div className="page-header-flex">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>Faculty Directory</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage teaching staff and event admins</p>
        </div>
        <div className="header-actions">
          <ExportDropdown
            data={filteredFaculty}
            columns={facultyColumns}
            filename={`faculty_${getFormattedDate()}`}
            title="Faculty Directory Report"
            subtitle={`Total Filtered Records: ${filteredFaculty.length}`}
            appliedFilters={appliedFilters}
            summaryStats={[
              { label: 'Total Faculty', value: filteredFaculty.length },
              { label: 'Departments', value: uniqueDepts.length },
              { label: 'Roles', value: uniqueRoles.length },
            ]}
          />
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} />
            Bulk Import
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} />
            Add Faculty
          </button>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderRadius: '8px' }}>
        {statCards.map((card, idx) => (
          <div key={idx} style={{ textAlign: 'center', padding: '1.25rem', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{card.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Toolbar */}
        <div className="responsive-filter-grid">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search by name, ID, or dept..." 
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
              />
            </div>
          </div>
          <select 
            className="input-field" 
            style={{ height: '42px', width: '100%' }}
            disabled={isHOD}
            value={isHOD ? (userDepartment || '') : filterDept} 
            onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}>
            {isHOD ? (
              <option value={userDepartment || ''}>{userDepartment || 'My Dept'}</option>
            ) : (
              <>
                <option value="">All Depts</option>
                {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </>
            )}
          </select>
          <select className="input-field" style={{ height: '42px', width: '100%' }}
            value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input-field" style={{ height: '42px', width: '100%' }}
            value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">All Statuses</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(searchTerm || filterDept || filterRole || filterStatus) && (
            <button className="btn btn-secondary" style={{ height: '42px', fontSize: '0.8rem', width: '100%' }}
              onClick={() => { setSearchTerm(''); setFilterDept(''); setFilterRole(''); setFilterStatus(''); setCurrentPage(1); }}>
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className="responsive-table-wrapper">
          <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Name</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Employee ID</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Department</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : paginatedFaculty.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No faculty found. Try adjusting your search.
                  </td>
                </tr>
              ) : (
                paginatedFaculty.map(f => (
                  <tr key={f.user_id || f.id || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                          {(f.first_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{`${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email_address}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{f.employee_id || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>
                        {f.department || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: f.status === 'Inactive' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                        color: f.status === 'Inactive' ? '#ef4444' : '#22c55e', 
                        borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' 
                      }}>
                        {f.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', height: 'auto', display: 'flex' }}
                        title="View Details"
                        onClick={() => setViewFaculty(f)}
                      >
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex' }} title="Edit"><Edit size={16} /></button>
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
            ) : paginatedFaculty.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No faculty found.
              </div>
            ) : (
              paginatedFaculty.map(f => (
                <div key={f.user_id || Math.random()} className="mobile-card">
                  <div className="mobile-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
                        {(f.first_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{`${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown'}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.employee_id || 'No ID'}</div>
                      </div>
                    </div>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                      Active
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Email:</span>
                      <span className="mobile-card-value">{f.email_address}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Role:</span>
                      <span className="mobile-card-value">{f.role}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Dept:</span>
                      <span className="mobile-card-value">
                        <span className="mobile-card-badge">{f.department || 'N/A'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setViewFaculty(f)}
                    >
                      <Eye size={15} /> View
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                      <Edit size={15} /> Edit
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', color: '#ef4444' }}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <TablePagination 
          totalRows={filteredFaculty.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Import Faculty</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <BulkImporter 
                tableName="users" 
                expectedColumns={['employee_id', 'first_name', 'last_name', 'email_address', 'department', 'role']}
                transformRow={(row) => ({
                  ...row,
                  user_id: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  username: row.email_address ? row.email_address.split('@')[0] : `user${Math.floor(Math.random() * 10000)}`,
                  password_hash: 'PENDING_SETUP',
                  first_login: true,
                  status: 'Active'
                })}
                onImportSuccess={() => {
                  setShowImportModal(false);
                  fetchFaculty();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <CreateFacultyModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onFacultyCreated={fetchFaculty}
        />
      )}

      {viewFaculty && (
        <ViewFacultyModal 
          isOpen={true}
          onClose={() => setViewFaculty(null)}
          faculty={viewFaculty}
        />
      )}
    </div>
  );
}


