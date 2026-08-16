import { supabase } from '../supabaseClient';
import SessionService from './SessionService';

class DepartmentService {
  /**
   * Fetch all active departments.
   */
  static async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('deletion_flag', false)
        .order('department_name', { ascending: true });

      if (error) throw error;
      return { success: true, departments: data };
    } catch (error) {
      console.error('Error fetching departments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch faculty users to populate the HOD selection dropdown.
   */
  static async getFacultyList() {
    try {
      // Fetch users with role 'Faculty' or 'HOD' 
      const { data, error } = await supabase
        .from('users')
        .select('user_id, employee_id, first_name, last_name, email_address, department')
        .in('role', ['Faculty', 'HOD'])
        .eq('status', 'Active')
        .eq('deletion_flag', false);

      if (error) throw error;
      return { success: true, faculty: data };
    } catch (error) {
      console.error('Error fetching faculty list:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a department code already exists.
   */
  static async checkDepartmentCodeUnique(code) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('department_id')
        .eq('department_code', code.toUpperCase())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, isUnique: !data };
    } catch (error) {
      console.error('Error checking department code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new department and optionally an HOD.
   * This performs sequential API calls to handle the multi-table insertions.
   * 
   * @param {Object} departmentData { name, code }
   * @param {Object} hodData { id, name, employeeId, email }
   * @param {string} hodOption 'existing' or 'new'
   */
  static async createDepartment(departmentData, hodData, hodOption) {
    let newUserId = null;
    let newDepartmentId = null;

    try {
      const currentUser = SessionService.getUser();
      const currentTimestamp = new Date().toISOString();
      const deptCode = departmentData.code.trim().toUpperCase();
      
      // 1. Uniqueness check for Department Code
      const uniqueCheck = await this.checkDepartmentCodeUnique(deptCode);
      if (!uniqueCheck.success) throw new Error("Failed to validate department code uniqueness.");
      if (!uniqueCheck.isUnique) throw new Error(`Department code '${deptCode}' already exists.`);

      let hodUserId = null;
      let finalHodName = '';
      let finalHodEmpId = '';

      // 2. Handle HOD (Create or Use Existing)
      if (hodOption === 'new') {
        const empId = hodData.employeeId.trim().toUpperCase();
        
        // Check if employee ID exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('employee_id', empId)
          .maybeSingle();
          
        if (existingUser) {
           throw new Error(`Employee ID '${empId}' is already in use.`);
        }

        // Generate user_id
        newUserId = `USER_${empId}`;
        const nameParts = hodData.name.trim().split(" ");
        const initialPassword = `BVC@${empId}`; // Dummy clear text for migration logic to hash later, or we assume it's pre-hashed for now.
        // Actually, the legacy code stored password_hash as clear text initially, then the `authenticate_user` RPC migrates it. 
        // We will store it directly in password_hash.

        const newUserData = {
          user_id: newUserId,
          employee_id: empId,
          first_name: nameParts[0] || hodData.name.trim(),
          last_name: nameParts.slice(1).join(" ") || "",
          email_address: hodData.email.trim(),
          username: empId.toLowerCase(),
          password_hash: initialPassword, 
          salt: 'temp_salt',
          role: 'HOD',
          default_role: 'HOD',
          department: deptCode,
          title_designation: `Head of Department (${deptCode})`,
          status: 'Active',
          created_by: currentUser?.employee_id || 'System',
          created_at: currentTimestamp,
          updated_at: currentTimestamp
        };

        const { error: userInsertError } = await supabase.from('users').insert(newUserData);
        if (userInsertError) throw new Error(`Failed to create HOD user: ${userInsertError.message}`);
        
        hodUserId = newUserId;
        finalHodName = hodData.name.trim();
        finalHodEmpId = empId;

      } else if (hodOption === 'existing' && hodData.id) {
        hodUserId = hodData.id;
        finalHodName = hodData.name;
        finalHodEmpId = hodData.employeeId;
        
        // Update existing user role to HOD if they aren't already
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            role: 'HOD',
            department: deptCode,
            title_designation: `Head of Department (${deptCode})`,
            updated_at: currentTimestamp
          })
          .eq('user_id', hodUserId);
          
        if (userUpdateError) throw new Error(`Failed to update existing HOD user: ${userUpdateError.message}`);
      }

      // 3. Create Department
      newDepartmentId = `DEPT_${deptCode}`;
      
      const newDeptData = {
        department_id: newDepartmentId,
        department_code: deptCode,
        department_name: departmentData.name.trim(),
        hod_name: finalHodName,
        hod_employee_id: finalHodEmpId,
        status: 'Active',
        allowed_years: departmentData.allowedYears || [1, 2, 3, 4],
        created_by: currentUser?.employee_id || 'System',
        created_at: currentTimestamp,
        updated_at: currentTimestamp
      };

      const { error: deptInsertError } = await supabase.from('departments').insert(newDeptData);
      
      if (deptInsertError) {
         // Rollback user creation if dept creation fails
         if (hodOption === 'new' && newUserId) {
             await supabase.from('users').delete().eq('user_id', newUserId);
         }
         throw new Error(`Failed to create department: ${deptInsertError.message}`);
      }

      // 4. Link in department_hods table
      if (hodUserId) {
         // We might need an ID for the junction table
         const linkId = `HOD_LINK_${newDepartmentId}_${hodUserId}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
         const { error: linkError } = await supabase.from('department_hods').insert({
             id: linkId,
             department_id: newDepartmentId,
             user_id: hodUserId,
             assigned_at: currentTimestamp
         });
         
         if (linkError) {
            console.warn("Failed to link HOD in department_hods table, but department was created.", linkError);
         }
      }

      return { success: true, department: newDeptData };

    } catch (error) {
      console.error('Department creation flow error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a department and its HOD assignment.
   */
  static async updateDepartment(departmentId, updateData, hodData, hodOption, oldHodEmployeeId) {
    try {
      const currentUser = SessionService.getUser();
      const currentTimestamp = new Date().toISOString();
      const newDeptCode = updateData.code.trim().toUpperCase();

      // Check if code changed and if it's unique
      const { data: existingDept } = await supabase
        .from('departments')
        .select('department_code, hod_employee_id')
        .eq('department_id', departmentId)
        .single();

      if (!existingDept) throw new Error("Department not found.");

      if (existingDept.department_code !== newDeptCode) {
        const uniqueCheck = await this.checkDepartmentCodeUnique(newDeptCode);
        if (!uniqueCheck.success) throw new Error("Failed to validate department code.");
        if (!uniqueCheck.isUnique) throw new Error(`Department code '${newDeptCode}' already exists.`);
      }

      let hodUserId = null;
      let finalHodName = hodData.name || '';
      let finalHodEmpId = hodData.employeeId || '';
      let isNewHodAssigned = false;

      // Handle HOD assignment if an option was chosen (i.e. changing HOD)
      if (hodOption && hodOption !== 'none') {
        if (hodOption === 'new') {
          const empId = hodData.employeeId.trim().toUpperCase();
          const { data: existingUser } = await supabase.from('users').select('user_id').eq('employee_id', empId).maybeSingle();
          if (existingUser) throw new Error(`Employee ID '${empId}' is already in use.`);

          const newUserId = `USER_${empId}`;
          const initialPassword = `BVC@${empId}`;
          const nameParts = hodData.name.trim().split(" ");
          
          const newUserData = {
            user_id: newUserId,
            employee_id: empId,
            first_name: nameParts[0] || hodData.name.trim(),
            last_name: nameParts.slice(1).join(" ") || "",
            email_address: hodData.email.trim(),
            username: empId.toLowerCase(),
            password_hash: initialPassword,
            salt: 'temp_salt',
            role: 'HOD',
            default_role: 'HOD',
            department: newDeptCode,
            title_designation: `Head of Department (${newDeptCode})`,
            status: 'Active',
            created_by: currentUser?.employee_id || 'System',
            created_at: currentTimestamp,
            updated_at: currentTimestamp
          };

          const { error: insertError } = await supabase.from('users').insert(newUserData);
          if (insertError) throw new Error(`Failed to create HOD user: ${insertError.message}`);
          
          hodUserId = newUserId;
          finalHodName = hodData.name.trim();
          finalHodEmpId = empId;
          isNewHodAssigned = true;

        } else if (hodOption === 'existing' && hodData.id) {
          hodUserId = hodData.id;
          finalHodName = hodData.name;
          finalHodEmpId = hodData.employeeId;
          
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({
              role: 'HOD',
              department: newDeptCode,
              title_designation: `Head of Department (${newDeptCode})`,
              updated_at: currentTimestamp
            })
            .eq('user_id', hodUserId);
            
          if (userUpdateError) throw new Error(`Failed to update existing HOD user: ${userUpdateError.message}`);
          isNewHodAssigned = true;
        }
      }

      // If a new HOD was assigned, demote the old HOD
      if (isNewHodAssigned && existingDept.hod_employee_id && existingDept.hod_employee_id !== finalHodEmpId) {
        // Demote old HOD to Faculty
        await supabase
          .from('users')
          .update({
            role: 'Faculty',
            title_designation: 'Faculty member',
            updated_at: currentTimestamp
          })
          .eq('employee_id', existingDept.hod_employee_id);
          
        // Remove old link in junction table
        await supabase
          .from('department_hods')
          .delete()
          .eq('department_id', departmentId);
      }

      // Update Department
      const updatePayload = {
        department_name: updateData.name.trim(),
        department_code: newDeptCode,
        allowed_years: updateData.allowedYears,
        updated_by: currentUser?.employee_id || 'System',
        updated_at: currentTimestamp
      };

      if (isNewHodAssigned) {
        updatePayload.hod_name = finalHodName;
        updatePayload.hod_employee_id = finalHodEmpId;
      }

      const { error: updateError } = await supabase
        .from('departments')
        .update(updatePayload)
        .eq('department_id', departmentId);

      if (updateError) throw new Error(`Failed to update department: ${updateError.message}`);

      // Add new link to junction table
      if (isNewHodAssigned && hodUserId) {
        const linkId = `HOD_LINK_${departmentId}_${hodUserId}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
        await supabase.from('department_hods').insert({
          id: linkId,
          department_id: departmentId,
          user_id: hodUserId,
          assigned_at: currentTimestamp
        });
      }

      return { success: true, department: { department_id: departmentId, ...updatePayload, status: existingDept.status } };
    } catch (error) {
      console.error('Department update error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DepartmentService;
