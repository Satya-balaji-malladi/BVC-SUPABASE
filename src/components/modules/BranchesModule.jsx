import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Plus, Filter, Loader2, Edit, Eye, Power, CheckCircle, AlertTriangle, X, Layers, Users } from 'lucide-react';
import TablePagination from '../widgets/TablePagination';
import BranchDetailView from './BranchDetailView';

export default function BranchesModule({ userRole, userDepartment }) {
  const normalizedRole = (userRole || '').replace(/\s+/g, '').toUpperCase();
  const isHOD = normalizedRole === 'HOD' || normalizedRole === 'DEPARTMENTADMIN';
  const effectiveDepartment = isHOD ? userDepartment : null;

  const [branches, setBranches] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal States for Branch
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [isDetailBranchModalOpen, setIsDetailBranchModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Modal States for Section Management
  const [activeSectionBranch, setActiveSectionBranch] = useState(null); // When managing sections for a specific branch
  const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionSearchTerm, setSectionSearchTerm] = useState('');

  // Form States
  const [branchFormData, setBranchFormData] = useState({
    branch_name: '',
    branch_code: '',
    description: '',
    status: 'Active'
  });

  const [sectionFormData, setSectionFormData] = useState({
    section_name: '',
    section_code: '',
    description: '',
    status: 'Active'
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranchesAndSectionsData();
  }, [userRole, userDepartment]);

  const fetchBranchesAndSectionsData = async () => {
    setLoading(true);
    try {
      let branchQuery = supabase.from('branches').select('*');
      let sectionQuery = supabase.from('sections').select('*');
      let studQuery = supabase.from('students').select('roll_number, department_id, section');

      if (isHOD && effectiveDepartment) {
        branchQuery = branchQuery.or(`department_id.eq.${effectiveDepartment},department_code.eq.${effectiveDepartment}`);
        const rawDept = effectiveDepartment.replace('DEPT_', '');
        studQuery = studQuery.ilike('department_id', `%${rawDept}%`);
      }

      const [
        { data: branchData, error: branchErr },
        { data: sectionData, error: sectionErr },
        { data: studData }
      ] = await Promise.all([
        branchQuery,
        sectionQuery,
        studQuery
      ]);

      if (branchErr) {
        // Default demo branch dataset fallback
        const defaultBranches = [
          { branch_id: 'BR-001', department_id: effectiveDepartment || 'AIML', branch_name: `${effectiveDepartment || 'AIML'} Core Program`, branch_code: effectiveDepartment || 'AIML', description: `Main specialization branch for ${effectiveDepartment || 'AIML'} department.`, status: 'Active', created_at: new Date().toISOString() },
          { branch_id: 'BR-002', department_id: effectiveDepartment || 'AIML', branch_name: `${effectiveDepartment || 'AIML'} Advanced Studies`, branch_code: `${effectiveDepartment || 'AIML'}-ADV`, description: 'Specialized honors and advanced research branch.', status: 'Active', created_at: new Date().toISOString() },
          { branch_id: 'BR-003', department_id: effectiveDepartment || 'AIML', branch_name: `${effectiveDepartment || 'AIML'} Applied Research`, branch_code: `${effectiveDepartment || 'AIML'}-AR`, description: 'Applied industry projects and research program.', status: 'Inactive', created_at: new Date().toISOString() },
        ];
        setBranches(defaultBranches);
      } else {
        setBranches(branchData || []);
      }

      if (sectionErr || !sectionData || sectionData.length === 0) {
        // Default sections dataset mapped to fallback branches
        const defaultSections = [
          { section_id: 'SEC-001', branch_id: 'BR-001', branch_code: effectiveDepartment || 'AIML', section_name: 'Section A', section_code: 'A', description: 'Primary section A roster', status: 'Active', created_at: new Date().toISOString() },
          { section_id: 'SEC-002', branch_id: 'BR-001', branch_code: effectiveDepartment || 'AIML', section_name: 'Section B', section_code: 'B', description: 'Primary section B roster', status: 'Active', created_at: new Date().toISOString() },
          { section_id: 'SEC-003', branch_id: 'BR-002', branch_code: `${effectiveDepartment || 'AIML'}-ADV`, section_name: 'Section A', section_code: 'A', description: 'Honors section A roster', status: 'Active', created_at: new Date().toISOString() },
        ];
        setSections(defaultSections);
      } else {
        setSections(sectionData || []);
      }

      setStudents(studData || []);
    } catch (err) {
      console.error('Error fetching branches & sections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics helpers
  const getBranchSections = (branchId, branchCode) => {
    return sections.filter(s => s.branch_id === branchId || s.branch_code === branchCode);
  };

  const getBranchStudentCount = (code, name, departmentId) => {
    if (!students || students.length === 0) return 0;
    const c = (code || '').toLowerCase();
    const n = (name || '').toLowerCase();
    const dId = (departmentId || '').toLowerCase().replace('dept_', '');
    
    return students.filter(s => {
      const sb = (s.department_id || s.department || '').toLowerCase().replace('dept_', '');
      return sb === c || sb === n || sb.includes(c) || sb === dId;
    }).length;
  };

  const getSectionStudentCount = (branchCode, sectionCode, departmentId) => {
    if (!students || students.length === 0) return 0;
    const bc = (branchCode || '').toLowerCase();
    const sc = (sectionCode || '').toLowerCase();
    const dId = (departmentId || '').toLowerCase().replace('dept_', '');
    
    return students.filter(s => {
      const sb = (s.department_id || s.department || '').toLowerCase().replace('dept_', '');
      const sec = (s.section || '').toLowerCase();
      const branchMatch = (sb === bc || sb.includes(bc) || sb === dId);
      return branchMatch && (sec === sc || sec.includes(sc));
    }).length;
  };

  // Filtered branches
  const filteredBranches = branches.filter(b => {
    const q = searchTerm.toLowerCase().trim();
    const matchQuery = !q || 
      (b.branch_name || '').toLowerCase().includes(q) ||
      (b.branch_code || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q);

    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const totalBranches = filteredBranches.length;
  const activeCount = filteredBranches.filter(b => b.status === 'Active').length;
  const totalSectionsCount = filteredBranches.reduce((acc, b) => acc + getBranchSections(b.branch_id, b.branch_code).length, 0);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedBranches = filteredBranches.slice(startIndex, startIndex + rowsPerPage);

  // --- BRANCH HANDLERS ---
  const handleOpenCreateBranch = () => {
    setBranchFormData({ branch_name: '', branch_code: '', description: '', status: 'Active' });
    setFormError('');
    setIsCreateBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch) => {
    setSelectedBranch(branch);
    setBranchFormData({
      branch_name: branch.branch_name || '',
      branch_code: branch.branch_code || '',
      description: branch.description || '',
      status: branch.status || 'Active'
    });
    setFormError('');
    setIsEditBranchModalOpen(true);
  };

  const handleSaveCreateBranch = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!branchFormData.branch_name.trim()) return setFormError('Branch Name is required.');
    if (!branchFormData.branch_code.trim()) return setFormError('Branch Code is required.');

    const codeExists = branches.some(b => b.branch_code.toLowerCase() === branchFormData.branch_code.trim().toLowerCase());
    if (codeExists) return setFormError(`Branch code "${branchFormData.branch_code}" already exists in ${effectiveDepartment || 'department'}.`);

    setSubmitting(true);
    try {
      const newBranch = {
        branch_id: `BR-${Date.now()}`,
        department_id: effectiveDepartment || 'GENERAL',
        department_code: effectiveDepartment || 'GENERAL',
        branch_name: branchFormData.branch_name.trim(),
        branch_code: branchFormData.branch_code.trim().toUpperCase(),
        description: branchFormData.description.trim(),
        status: branchFormData.status,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('branches').insert([newBranch]).select();
      if (error) {
        setBranches(prev => [newBranch, ...prev]);
      } else if (data) {
        setBranches(prev => [...data, ...prev]);
      }
      setIsCreateBranchModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to create branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditBranch = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!branchFormData.branch_name.trim()) return setFormError('Branch Name is required.');

    setSubmitting(true);
    try {
      const updated = {
        ...selectedBranch,
        branch_name: branchFormData.branch_name.trim(),
        description: branchFormData.description.trim(),
        status: branchFormData.status,
        updated_at: new Date().toISOString()
      };

      await supabase.from('branches').update(updated).eq('branch_id', selectedBranch.branch_id);
      setBranches(prev => prev.map(b => b.branch_id === selectedBranch.branch_id ? updated : b));
      setIsEditBranchModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to update branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBranchStatus = async (branch) => {
    const nextStatus = branch.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Are you sure you want to ${nextStatus === 'Active' ? 'activate' : 'deactivate'} branch ${branch.branch_code}?`)) return;

    try {
      const updated = { ...branch, status: nextStatus, updated_at: new Date().toISOString() };
      await supabase.from('branches').update({ status: nextStatus }).eq('branch_id', branch.branch_id);
      setBranches(prev => prev.map(b => b.branch_id === branch.branch_id ? updated : b));
    } catch (err) {
      console.error(err);
    }
  };

  // --- SECTION HANDLERS ---
  const handleOpenManageSections = (branch) => {
    setActiveSectionBranch(branch);
    setSectionSearchTerm('');
  };

  const handleOpenCreateSection = () => {
    setSectionFormData({ section_name: '', section_code: '', description: '', status: 'Active' });
    setFormError('');
    setIsCreateSectionModalOpen(true);
  };

  const handleOpenEditSection = (section) => {
    setSelectedSection(section);
    setSectionFormData({
      section_name: section.section_name || '',
      section_code: section.section_code || '',
      description: section.description || '',
      status: section.status || 'Active'
    });
    setFormError('');
    setIsEditSectionModalOpen(true);
  };

  const handleSaveCreateSection = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!sectionFormData.section_name.trim()) return setFormError('Section Name is required (e.g. Section A).');
    if (!sectionFormData.section_code.trim()) return setFormError('Section Code is required (e.g. A).');

    // Duplicate Section Code check within the same branch
    const branchSecs = getBranchSections(activeSectionBranch.branch_id, activeSectionBranch.branch_code);
    const codeExists = branchSecs.some(s => (s.section_code || '').toLowerCase() === sectionFormData.section_code.trim().toLowerCase());
    if (codeExists) return setFormError(`Section code "${sectionFormData.section_code}" already exists in ${activeSectionBranch.branch_code}.`);

    setSubmitting(true);
    try {
      const newSection = {
        section_id: `SEC-${Date.now()}`,
        branch_id: activeSectionBranch.branch_id,
        branch_code: activeSectionBranch.branch_code,
        section_name: sectionFormData.section_name.trim(),
        section_code: sectionFormData.section_code.trim().toUpperCase(),
        description: sectionFormData.description.trim(),
        status: sectionFormData.status,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('sections').insert([newSection]).select();
      if (error) {
        setSections(prev => [...prev, newSection]);
      } else if (data) {
        setSections(prev => [...prev, ...data]);
      }
      setIsCreateSectionModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to create section.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditSection = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!sectionFormData.section_name.trim()) return setFormError('Section Name is required.');

    setSubmitting(true);
    try {
      const updated = {
        ...selectedSection,
        section_name: sectionFormData.section_name.trim(),
        description: sectionFormData.description.trim(),
        status: sectionFormData.status,
        updated_at: new Date().toISOString()
      };

      await supabase.from('sections').update(updated).eq('section_id', selectedSection.section_id);
      setSections(prev => prev.map(s => s.section_id === selectedSection.section_id ? updated : s));
      setIsEditSectionModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to update section.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSectionStatus = async (section) => {
    const nextStatus = section.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm(`Are you sure you want to ${nextStatus === 'Active' ? 'activate' : 'deactivate'} Section ${section.section_code}? Existing student historical records will be preserved.`)) return;

    try {
      const updated = { ...section, status: nextStatus, updated_at: new Date().toISOString() };
      await supabase.from('sections').update({ status: nextStatus }).eq('section_id', section.section_id);
      setSections(prev => prev.map(s => s.section_id === section.section_id ? updated : s));
    } catch (err) {
      console.error(err);
    }
  };

  if (isDetailBranchModalOpen && selectedBranch) {
    return <BranchDetailView 
             branch={selectedBranch} 
             effectiveDepartment={effectiveDepartment} 
             onBack={() => setIsDetailBranchModalOpen(false)} 
           />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Main Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {effectiveDepartment || 'Department'} Branches & Sections
            </h1>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
              Department: {effectiveDepartment || 'HOD'} 🔒
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Manage program tracks, academic specialization branches, and sections under {effectiveDepartment || 'your department'}.
          </p>
        </div>

        <button 
          onClick={handleOpenCreateBranch}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}>
          <Plus size={18} />
          Create Branch
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>TOTAL PROGRAM BRANCHES</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>{totalBranches}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #22c55e', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>ACTIVE BRANCHES</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#22c55e' }}>{activeCount}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>TOTAL SECTIONS</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#8b5cf6' }}>{totalSectionsCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search branch name, code, description..." 
            style={{ paddingLeft: '2.5rem', width: '100%', height: '40px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Status:</label>
          <select className="input-field" style={{ height: '40px', minWidth: '130px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">🟢 Active</option>
            <option value="Inactive">⚪ Inactive</option>
          </select>
        </div>

        {searchTerm || statusFilter !== 'All' ? (
          <button className="btn btn-secondary" style={{ height: '40px', fontSize: '0.8rem' }} onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}>
            ✕ Clear Filters
          </button>
        ) : null}
      </div>

      {/* Branch Data Table */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="responsive-table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>Branch Name</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>Code</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>Sections</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>Enrolled Students</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', alignItems: 'center' }}>
                      <Loader2 className="animate-spin" size={20} color="#3b82f6" />
                      Loading department branches...
                    </div>
                  </td>
                </tr>
              ) : paginatedBranches.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No branches found for {effectiveDepartment || 'department'}.
                  </td>
                </tr>
              ) : (
                paginatedBranches.map(b => {
                  const branchSecs = getBranchSections(b.branch_id, b.branch_code);
                  const studentCount = getBranchStudentCount(b.branch_code, b.branch_name, b.department_id);
                  return (
                    <tr key={b.branch_id || b.branch_code} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>{b.branch_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                          {b.branch_code}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => handleOpenManageSections(b)}
                          className="btn btn-secondary" 
                          style={{ height: '32px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          <Layers size={14} />
                          {branchSecs.length} {branchSecs.length === 1 ? 'Section' : 'Sections'}
                        </button>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#2563eb' }}>
                        {studentCount} Students
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          background: b.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                          color: b.status === 'Active' ? '#22c55e' : '#64748b',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          {b.status === 'Active' ? '🟢 Active' : '⚪ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleOpenManageSections(b)} 
                            style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer' }}
                            title="Manage Sections">
                            <Layers size={16} />
                          </button>
                          <button 
                            onClick={() => setSelectedBranch(b) || setIsDetailBranchModalOpen(true)} 
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            title="View Details">
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleOpenEditBranch(b)} 
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                            title="Edit Branch">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleToggleBranchStatus(b)} 
                            style={{ background: 'none', border: 'none', color: b.status === 'Active' ? '#ef4444' : '#22c55e', cursor: 'pointer' }}
                            title={b.status === 'Active' ? 'Deactivate Branch' : 'Activate Branch'}>
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          totalRows={filteredBranches.length}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {/* --- MANAGE SECTIONS SLIDE-OVER / MODAL --- */}
      {activeSectionBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '750px', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>
                    {activeSectionBranch.branch_name} Sections
                  </h3>
                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {activeSectionBranch.branch_code}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  Department: {effectiveDepartment || 'HOD'} 🔒 | Manage section rosters under this branch.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  onClick={handleOpenCreateSection}
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Create Section
                </button>
                <button onClick={() => setActiveSectionBranch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Sections Search & Roster Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative', maxWidth: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search section name or code..." 
                  style={{ paddingLeft: '2.25rem', width: '100%', height: '36px', fontSize: '0.85rem' }}
                  value={sectionSearchTerm}
                  onChange={e => setSectionSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>Section Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>Code</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>Enrolled Students</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const branchSecs = getBranchSections(activeSectionBranch.branch_id, activeSectionBranch.branch_code).filter(s => {
                        const sq = sectionSearchTerm.toLowerCase().trim();
                        return !sq || (s.section_name || '').toLowerCase().includes(sq) || (s.section_code || '').toLowerCase().includes(sq);
                      });

                      if (branchSecs.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                              No sections configured for {activeSectionBranch.branch_code} yet. Click "+ Create Section" to add Section A, B, etc.
                            </td>
                          </tr>
                        );
                      }

                      return branchSecs.map(s => {
                        const secStudents = getSectionStudentCount(activeSectionBranch.branch_code, s.section_code, activeSectionBranch.department_id);
                        return (
                          <tr key={s.section_id || s.section_code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#0f172a' }}>{s.section_name}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                                Section {s.section_code}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#2563eb' }}>
                              {secStudents} Students
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                background: s.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                color: s.status === 'Active' ? '#22c55e' : '#64748b',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}>
                                {s.status === 'Active' ? '🟢 Active' : '⚪ Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleOpenEditSection(s)} 
                                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                                  title="Edit Section">
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleToggleSectionStatus(s)} 
                                  style={{ background: 'none', border: 'none', color: s.status === 'Active' ? '#ef4444' : '#22c55e', cursor: 'pointer' }}
                                  title={s.status === 'Active' ? 'Deactivate Section' : 'Activate Section'}>
                                  <Power size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={() => setActiveSectionBranch(null)} className="btn btn-secondary">
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {isCreateBranchModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Create Program Branch</h3>
              <button onClick={() => setIsCreateBranchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleSaveCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Department 🔒</label>
                <input type="text" className="input-field" disabled value={effectiveDepartment || 'HOD Department'} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Branch Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  value={branchFormData.branch_name}
                  onChange={e => setBranchFormData({ ...branchFormData, branch_name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Branch Code *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder={`e.g. ${effectiveDepartment || 'AIML'}-CS`}
                  value={branchFormData.branch_code}
                  onChange={e => setBranchFormData({ ...branchFormData, branch_code: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Description</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  placeholder="Brief description of the program track..."
                  value={branchFormData.description}
                  onChange={e => setBranchFormData({ ...branchFormData, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Status</label>
                <select 
                  className="input-field"
                  value={branchFormData.status}
                  onChange={e => setBranchFormData({ ...branchFormData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCreateBranchModalOpen(false)} className="btn btn-secondary" style={{ height: '38px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditBranchModalOpen && selectedBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Edit Branch: {selectedBranch.branch_code}</h3>
              <button onClick={() => setIsEditBranchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditBranch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Department 🔒</label>
                <input type="text" className="input-field" disabled value={effectiveDepartment || 'HOD Department'} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Branch Code 🔒</label>
                <input type="text" className="input-field" disabled value={branchFormData.branch_code} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Branch Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={branchFormData.branch_name}
                  onChange={e => setBranchFormData({ ...branchFormData, branch_name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Description</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={branchFormData.description}
                  onChange={e => setBranchFormData({ ...branchFormData, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Status</label>
                <select 
                  className="input-field"
                  value={branchFormData.status}
                  onChange={e => setBranchFormData({ ...branchFormData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditBranchModalOpen(false)} className="btn btn-secondary" style={{ height: '38px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SECTION MODAL */}
      {isCreateSectionModalOpen && activeSectionBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Create Section</h3>
              <button onClick={() => setIsCreateSectionModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleSaveCreateSection} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Branch 🔒</label>
                <input type="text" className="input-field" disabled value={`${activeSectionBranch.branch_name} (${activeSectionBranch.branch_code})`} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Section Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Section A"
                  value={sectionFormData.section_name}
                  onChange={e => setSectionFormData({ ...sectionFormData, section_name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Section Code *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. A"
                  value={sectionFormData.section_code}
                  onChange={e => setSectionFormData({ ...sectionFormData, section_code: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Description</label>
                <textarea 
                  className="input-field" 
                  rows={2} 
                  placeholder="Section roster notes..."
                  value={sectionFormData.description}
                  onChange={e => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Status</label>
                <select 
                  className="input-field"
                  value={sectionFormData.status}
                  onChange={e => setSectionFormData({ ...sectionFormData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsCreateSectionModalOpen(false)} className="btn btn-secondary" style={{ height: '38px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SECTION MODAL */}
      {isEditSectionModalOpen && selectedSection && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="glass-panel" style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Edit Section: {selectedSection.section_code}</h3>
              <button onClick={() => setIsEditSectionModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditSection} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Section Code 🔒</label>
                <input type="text" className="input-field" disabled value={sectionFormData.section_code} style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Section Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={sectionFormData.section_name}
                  onChange={e => setSectionFormData({ ...sectionFormData, section_name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Description</label>
                <textarea 
                  className="input-field" 
                  rows={2} 
                  value={sectionFormData.description}
                  onChange={e => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>Status</label>
                <select 
                  className="input-field"
                  value={sectionFormData.status}
                  onChange={e => setSectionFormData({ ...sectionFormData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditSectionModalOpen(false)} className="btn btn-secondary" style={{ height: '38px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


