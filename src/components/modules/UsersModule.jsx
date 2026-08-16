import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Filter, Loader2, UserPlus, Upload, Download, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import BulkImporter from '../widgets/BulkImporter';
import TablePagination from '../widgets/TablePagination';
import ViewUserModal from '../widgets/ViewUserModal';
import ExportDropdown from '../widgets/ExportDropdown';
import CreateUserModal from '../widgets/CreateUserModal';
import { getFormattedDate } from '../../services/exportService';
import { getActiveInvolvements } from '../../services/activityService';
import EventAdminService from '../../services/EventAdminService';
import { normalizeRole, isHOD as checkIsHOD, isEventAdmin as checkIsEventAdmin, isSuperAdminOrDev } from '../../constants/Roles';
import { normalizeDepartment, getDepartmentLabel } from '../../utils/departmentUtils';

export default function UsersModule({ userRole, userDepartment }) {
  const [users, setUsers] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const normalizedRole = normalizeRole(userRole);
  const isHOD = checkIsHOD(userRole);
  const isEventAdmin = checkIsEventAdmin(userRole);
  const normUserDept = normalizeDepartment(userDepartment);

  useEffect(() => {
    fetchUsers();
  }, [userRole, userDepartment]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let enrichedUsers = [];

      if (isEventAdmin) {
        const teamData = await EventAdminService.getTeam();
        enrichedUsers = teamData.map(t => ({
          ...t,
          activity_status: 'Active',
          current_events: [{ event_name: `Assigned as ${t.role}` }]
        }));
      } else {
        let userQuery = supabase.from('users').select('*').or('status.eq.Active,status.is.null').order('created_at', { ascending: false });
        if (isHOD && normUserDept) {
          userQuery = userQuery.ilike('department', `%${normUserDept}%`);
        }

        const [{ data, error }, { activeUsers }] = await Promise.all([
          userQuery,
          getActiveInvolvements()
        ]);

        if (error) throw error;
        
        const uniqueUsers = Array.from(new Map((data || []).map(u => [u.user_id, u])).values());
        
        enrichedUsers = uniqueUsers.map(user => {
          const involvements = 
            activeUsers.get(user.user_id) || 
            activeUsers.get(user.email_address) || 
            activeUsers.get(user.email) || 
            activeUsers.get(user.username) || [];

          // Compute dynamic role
          let dynamicRole = user.role;
          if (involvements && involvements.length > 0) {
             const isEventAdmin = involvements.some(i => i.role === 'Host / Organizer');
             const isCoordinator = involvements.some(i => i.role && i.role.includes('Coordinator'));
             
             if (isEventAdmin && isCoordinator) dynamicRole = 'Event Admin / Coordinator';
             else if (isEventAdmin) dynamicRole = 'Event Admin';
             else if (isCoordinator) dynamicRole = 'Event Coordinator';
          }

          return {
            ...user,
            activity_status: involvements && involvements.length > 0 ? 'Active' : 'Inactive',
            current_events: involvements,
            role: dynamicRole
          };
        });
      }

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))].sort();
  const uniqueDepts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();

  const filteredUsers = users.filter(user => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q ||
      (user.first_name || '').toLowerCase().includes(q) ||
      (user.last_name || '').toLowerCase().includes(q) ||
      (user.email_address || '').toLowerCase().includes(q) ||
      (user.employee_id || user.user_id || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q);

    // Normalize role comparison like legacy (Event Admin <-> Admin <-> Event)
    const uRoleNorm = (user.role || '').toLowerCase().replace(/[\s_]+/g, '');
    const fRoleNorm = (filterRole || '').toLowerCase().replace(/[\s_]+/g, '');
    const matchRole = !filterRole || uRoleNorm === fRoleNorm ||
      (fRoleNorm === 'eventadmin' && (uRoleNorm === 'eventadmin' || uRoleNorm === 'admin'));

    const matchDept = !filterDept || (user.department || '') === filterDept;
    const matchActivity = !filterActivity || user.activity_status === filterActivity;
    return matchSearch && matchRole && matchDept && matchActivity;
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  const userColumns = [
    { header: 'Employee / User ID', key: u => u.employee_id || u.user_id || '--' },
    { header: 'Name', key: u => `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown' },
    { header: 'Email Address', key: 'email_address' },
    { header: 'Role', key: u => u.role || 'Unassigned' },
    { header: 'Department', key: u => u.department || 'All' },
    { header: 'Activity Status', key: u => u.activity_status || 'Inactive' },
    { header: 'Current Events', key: u => u.current_events?.map(e => e.event_name).join(', ') || 'None' }
  ];

  const appliedFilters = [
    filterRole ? `Role: ${filterRole}` : 'All Roles',
    filterDept ? `Dept: ${filterDept}` : 'All Departments',
    filterActivity ? `Activity: ${filterActivity}` : 'All Activity',
    searchTerm ? `Search: "${searchTerm}"` : null,
  ].filter(Boolean);

  const statCards = [
    { label: userRole === 'Event Admin' ? 'Team Members' : 'Total Users', value: filteredUsers.length.toString(), color: '#22c55e' },
    { label: 'Event Admins', value: filteredUsers.filter(u => (u.role || '').toLowerCase().includes('admin')).length.toString(), color: '#3b82f6' },
    { label: 'Coordinators', value: filteredUsers.filter(u => u.role === 'Coordinator').length.toString(), color: '#a855f7' },
    { label: 'Departments', value: [...new Set(filteredUsers.map(u => u.department).filter(Boolean))].length.toString(), color: '#f59e0b' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      {viewUser && <ViewUserModal isOpen={true} user={viewUser} onClose={() => setViewUser(null)} />}
      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onUserCreated={fetchUsers} 
        isSuperAdmin={isSuperAdminOrDev(userRole)}
        isHOD={isHOD}
        userDepartment={normUserDept}
      />
      <div className="page-header-flex">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>
            {userRole === 'Event Admin' ? 'Event Team' : 'System Users'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {userRole === 'Event Admin' ? 'View coordinators assigned to your events.' : 'Manage user roles and system access'}
          </p>
        </div>
        <div className="header-actions">
          <ExportDropdown
            data={filteredUsers}
            columns={userColumns}
            filename={`users_${getFormattedDate()}`}
            title={userRole === 'Event Admin' ? "Event Team Directory" : "System Users Directory"}
            subtitle={`Total Filtered Records: ${filteredUsers.length}`}
            appliedFilters={appliedFilters}
            summaryStats={[
              { label: 'Total Users', value: filteredUsers.length },
              { label: 'Roles', value: uniqueRoles.length },
              { label: 'Departments', value: uniqueDepts.length },
            ]}
          />
          {userRole !== 'Event Admin' && (
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} />
              Assign Role
            </button>
          )}
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
                placeholder="Search by name, email, role..." 
                style={{ paddingLeft: '2.75rem', width: '100%' }}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          <select className="input-field" style={{ height: '42px', width: '100%' }}
            value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
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
          {!isEventAdmin && (
            <select className="input-field" style={{ height: '42px', width: '100%' }}
              value={filterActivity} onChange={e => { setFilterActivity(e.target.value); setCurrentPage(1); }}>
              <option value="">Activity: All</option>
              <option value="Active">🟢 Active</option>
              <option value="Inactive">⚪ Inactive</option>
            </select>
          )}
          {(searchTerm || filterRole || filterDept || filterActivity) && (
            <button className="btn btn-secondary" style={{ height: '42px', fontSize: '0.8rem', width: '100%' }}
              onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterDept(''); setFilterActivity(''); setCurrentPage(1); }}>
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className="responsive-table-wrapper">
          <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>User</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Role</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Department</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem' }}>Activity Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                          {(u.first_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email_address}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: u.role === 'Super Admin' ? 'rgba(244, 63, 94, 0.1)' : 
                                    u.role === 'Developer' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                        color: u.role === 'Super Admin' ? '#f43f5e' : 
                               u.role === 'Developer' ? '#a855f7' : '#3b82f6', 
                        borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                      }}>
                        {u.role || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.department || 'All'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.75rem',
                        background: u.activity_status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: u.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                        borderRadius: '999px',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }} title={u.current_events?.map(e => e.event_name).join(', ')}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                        {u.activity_status}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem', height: 'auto', display: 'flex' }}
                        title="View Details"
                        onClick={() => setViewUser(u)}
                      >
                        <Eye size={16} />
                      </button>
                      {userRole !== 'Event Admin' && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex' }} title="Edit"><Edit size={16} /></button>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem', height: 'auto', display: 'flex', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                        </>
                      )}
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
            ) : paginatedUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No users found.
              </div>
            ) : (
              paginatedUsers.map(u => (
                <div key={u.user_id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
                        {(u.first_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email_address}</div>
                      </div>
                    </div>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: u.role === 'Super Admin' ? 'rgba(244, 63, 94, 0.1)' : 
                                  u.role === 'Developer' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                      color: u.role === 'Super Admin' ? '#f43f5e' : 
                             u.role === 'Developer' ? '#a855f7' : '#3b82f6', 
                      borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' 
                    }}>
                      {u.role || 'Unassigned'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Activity:</span>
                      <span className="mobile-card-value">
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: u.activity_status === 'Active' ? '#22c55e' : '#6b7280',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase'
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                          {u.activity_status}
                        </div>
                      </span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Dept:</span>
                      <span className="mobile-card-value">
                        <span className="mobile-card-badge">{u.department || 'All'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setViewUser(u)}
                    >
                      <Eye size={15} /> View
                    </button>
                    {userRole !== 'Event Admin' && (
                      <>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                          <Edit size={15} /> Edit
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', color: '#ef4444' }}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <TablePagination 
          totalRows={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
}


