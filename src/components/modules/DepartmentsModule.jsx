import React, { useState, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';
import DepartmentService from '../../services/DepartmentService';
import DepartmentList from '../departments/DepartmentList';
import CreateDepartmentModal from '../departments/CreateDepartmentModal';
import EditDepartmentModal from '../departments/EditDepartmentModal';

export default function DepartmentsModule({ userRole, userDepartment }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [error, setError] = useState(null);

  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isSuperAdmin = ['SUPERADMIN', 'DEVELOPER'].includes(normalizedRole);
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    const result = await DepartmentService.getDepartments();
    if (result.success) {
      let list = result.departments || [];
      // Filter list to HOD's department if logged in as HOD
      if (isHOD && userDepartment) {
        list = list.filter(d => 
          (d.department_code || '').toLowerCase() === userDepartment.toLowerCase() ||
          (d.department_id || '').toLowerCase() === userDepartment.toLowerCase() ||
          (d.department_name || '').toLowerCase().includes(userDepartment.toLowerCase())
        );
      }
      setDepartments(list);
    } else {
      setError(result.error || "Failed to load departments.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, [userRole, userDepartment]);

  const handleDepartmentCreated = (newDepartment) => {
    // Optimistic update
    setDepartments(prev => [...prev, newDepartment].sort((a, b) => a.department_name.localeCompare(b.department_name)));
    setIsModalOpen(false);
  };

  const handleDepartmentUpdated = (updatedDepartment) => {
    // Optimistic update
    setDepartments(prev => 
      prev.map(dept => dept.department_id === updatedDepartment.department_id ? updatedDepartment : dept)
          .sort((a, b) => a.department_name.localeCompare(b.department_name))
    );
    setEditingDepartment(null);
  };

  if (!isSuperAdmin && !isHOD) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view or manage departments.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div className="page-header-flex">
        <div>
          <h1 className="text-gradient" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={28} /> {isHOD ? `${userDepartment || 'Department'} Details` : 'Department Management'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {isHOD ? `Viewing information for your assigned department (${userDepartment || 'HOD'})` : 'Manage organizational departments and assign Heads of Department (HODs).'}
          </p>
        </div>
        
        {isSuperAdmin && (
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Create Department
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <DepartmentList 
          departments={departments} 
          loading={loading} 
          onEdit={(dept) => setEditingDepartment(dept)}
        />
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <CreateDepartmentModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleDepartmentCreated} 
        />
      )}

      {/* Edit Modal */}
      {editingDepartment && (
        <EditDepartmentModal
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSuccess={handleDepartmentUpdated}
        />
      )}
    </div>
  );
}
