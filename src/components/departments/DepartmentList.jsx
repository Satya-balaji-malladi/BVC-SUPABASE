import React, { useState } from 'react';
import { Search, Eye, Edit, Shield, MoreVertical } from 'lucide-react';
import ViewDepartmentModal from '../widgets/ViewDepartmentModal';

export default function DepartmentList({ departments, loading, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [viewDepartment, setViewDepartment] = useState(null);

  const filteredDepartments = departments.filter(dept => 
    dept.department_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    dept.department_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.hod_name && dept.hod_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading departments...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Table Toolbar */}
      <div className="page-header-flex" style={{ alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>All Departments</h3>
        <div className="input-field" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search departments..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredDepartments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No departments found.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="hide-on-mobile" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Dept Code</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Department Name</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Head of Department</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem' }}>Status</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept.department_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                        {dept.department_code}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{dept.department_name}</td>
                    <td style={{ padding: '1rem' }}>
                      {dept.hod_name ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{dept.hod_name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{dept.hod_employee_id}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Assigned</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem',
                        background: dept.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: dept.status === 'Active' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {dept.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', position: 'relative' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.6rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                          title="View Department Details"
                          onClick={() => setViewDepartment(dept)}
                        >
                          <Eye size={15} /> View
                        </button>
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === dept.department_id ? null : dept.department_id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                      {openDropdown === dept.department_id && (
                        <div className="glass-panel" style={{ 
                          position: 'absolute', right: '1rem', top: '100%', 
                          background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', 
                          borderRadius: '8px', padding: '0.5rem', zIndex: 10, width: '130px'
                        }}>
                          <button 
                            onClick={() => { setOpenDropdown(null); setViewDepartment(dept); }}
                            style={{ 
                              width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                              background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' 
                            }}
                          >
                            <Eye size={16} /> View Details
                          </button>
                          <button 
                            onClick={() => { setOpenDropdown(null); onEdit(dept); }}
                            style={{ 
                              width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                              background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' 
                            }}
                          >
                            <Edit size={16} /> Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="show-on-mobile mobile-card-list">
              {filteredDepartments.map((dept) => (
                <div key={dept.department_id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div>
                      <span className="mobile-card-badge">
                        {dept.department_code}
                      </span>
                      <h4 style={{ margin: '0.5rem 0 0 0', color: 'var(--text-primary)' }}>{dept.department_name}</h4>
                    </div>
                    <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem',
                        background: dept.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: dept.status === 'Active' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {dept.status || 'Active'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-body">
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">HOD:</span>
                      <span className="mobile-card-value">
                        {dept.hod_name ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{dept.hod_name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{dept.hod_employee_id}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Assigned</span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => setViewDepartment(dept)}
                    >
                      <Eye size={15} /> View
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => onEdit(dept)}
                    >
                      <Edit size={15} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {viewDepartment && (
        <ViewDepartmentModal 
          isOpen={true}
          onClose={() => setViewDepartment(null)}
          department={viewDepartment}
        />
      )}
    </div>
  );
}
