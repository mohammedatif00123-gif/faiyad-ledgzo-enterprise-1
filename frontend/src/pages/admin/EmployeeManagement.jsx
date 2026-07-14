import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, Filter, MoreHorizontal, Download, Loader2, Key } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';

// Custom hook for debouncing search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [employeeToReset, setEmployeeToReset] = useState(null);
  const [customPassword, setCustomPassword] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/employees', { 
        params: { page, limit, search: debouncedSearch } 
      });
      const data = res.data?.data || res.data;
      setEmployees(Array.isArray(data) ? data : (data.employees || []));
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, debouncedSearch]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;

      if (selectedEmployee) {
        await api.put(`/admin/employees/${selectedEmployee._id || selectedEmployee.id}`, payload);
        toast.success('Employee updated successfully!');
      } else {
        const res = await api.post('/admin/employees', payload);
        const generatedPassword = res.data?.data?.tempPassword;
        
        toast.success(
          <div>
            Employee created successfully! <br />
            {generatedPassword && <>Password: <b>{generatedPassword}</b></>}
          </div>,
          { duration: 10000 }
        );
      }
      setModalOpen(false);
      setSelectedEmployee(null);
      reset({});
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || employee.companyEmail,
      department: employee.department || '',
      position: employee.position || employee.designation || '',
      role: employee.role || 'Employee'
    });
    setModalOpen(true);
  };

  const handleDeactivate = async (employee) => {
    const isDeactivating = (employee.status !== 'Inactive' && employee.status !== 'Deactivated');
    
    let reason = '';
    if (isDeactivating) {
      reason = window.prompt(`Please provide a reason for deactivating ${employee.firstName} ${employee.lastName}:`);
      if (reason === null) return; // User cancelled
      if (!reason.trim()) {
        toast.error('Reason is required to deactivate.');
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to reactivate ${employee.firstName}?`)) return;
    }

    try {
      await api.put(`/admin/employees/${employee._id || employee.id}/deactivate`, { 
        deactivate: isDeactivating,
        reason 
      });
      toast.success(`Employee ${isDeactivating ? 'deactivated' : 'reactivated'} successfully`);
      fetchEmployees();
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openResetPasswordModal = (employee) => {
    setEmployeeToReset(employee);
    setGeneratedPassword(null);
    setCustomPassword('');
    setResetModalOpen(true);
  };

  const confirmResetPassword = async () => {
    try {
      const payload = customPassword.trim() ? { customPassword: customPassword.trim() } : {};
      const res = await api.put(`/admin/employees/${employeeToReset._id || employeeToReset.id}/reset-password`, payload);
      const newPassword = res.data?.data?.tempPassword || res.data?.tempPassword;
      setGeneratedPassword(newPassword);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'employeeCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.employeeCode || row.original.id || 'N/A'}</span>
    },
    {
      accessorKey: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.profileImage || row.original.profilePhoto} />
            <AvatarFallback>{row.original.firstName?.charAt(0)}{row.original.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.firstName} {row.original.lastName}</span>
            <span className="text-xs text-muted-foreground">{row.original.email || row.original.companyEmail}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => <span className="text-sm">{row.original.department || 'N/A'}</span>
    },
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => <span className="text-sm">{row.original.position || row.original.designation || 'N/A'}</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'Active';
        const isActive = (status === 'Active' || status === 'online');
        return (
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const isActive = (row.original.status !== 'Inactive' && row.original.status !== 'Deactivated');
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedEmployee(row.original); setDrawerOpen(true); }}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(row.original); }}>
                Edit Employee
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openResetPasswordModal(row.original); }}>
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={isActive ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'} 
                onClick={(e) => { e.stopPropagation(); handleDeactivate(row.original); }}
              >
                {isActive ? 'Deactivate' : 'Reactivate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  const handleRowClick = (row) => {
    setSelectedEmployee(row);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">Manage your organization's employees, roles, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => { setSelectedEmployee(null); reset({ firstName: '', lastName: '', email: '', department: '', position: '', role: 'Employee' }); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={employees} 
        pageCount={totalPages}
        pagination={{ pageIndex: page - 1, pageSize: limit }}
        onRowClick={handleRowClick}
        isLoading={loading}
      />

      <Modal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) { setSelectedEmployee(null); reset({}); }}}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</ModalTitle>
            <ModalDescription>
              {selectedEmployee ? 'Update employee details.' : 'Fill in the details to create a new employee account.'}
            </ModalDescription>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" {...register('firstName', { required: 'First name is required' })} className={errors.firstName ? 'border-red-500' : ''} />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" {...register('lastName', { required: 'Last name is required' })} className={errors.lastName ? 'border-red-500' : ''} />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@ledgzo.com" {...register('email', { required: 'Email is required' })} className={errors.email ? 'border-red-500' : ''} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input id="password" type="text" placeholder={selectedEmployee ? "Leave empty to keep current" : "Leave empty to auto-generate"} {...register('password')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" {...register('department', { required: 'Required' })}>
                    <option value="">Select Dept</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" placeholder="Software Engineer" {...register('position', { required: 'Required' })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">System Role</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" {...register('role')}>
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedEmployee ? 'Save Changes' : 'Create Employee'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {drawerOpen && selectedEmployee && (
        <Modal open={drawerOpen} onOpenChange={setDrawerOpen}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Employee Profile</ModalTitle>
            </ModalHeader>
            <div className="py-4 flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={selectedEmployee.profileImage || selectedEmployee.profilePhoto} />
                <AvatarFallback className="text-2xl">{selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
              <p className="text-muted-foreground">{selectedEmployee.email || selectedEmployee.companyEmail}</p>
              
              <div className="flex gap-2 mt-2">
                <Badge variant={selectedEmployee.status !== 'Inactive' && selectedEmployee.status !== 'Deactivated' ? 'success' : 'secondary'}>
                  {selectedEmployee.status || 'Active'}
                </Badge>
                <Badge variant="outline" className="capitalize">{selectedEmployee.role || 'Employee'}</Badge>
              </div>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Employee Code</span>
                  <span className="font-medium">{selectedEmployee.employeeCode || selectedEmployee.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{selectedEmployee.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-medium">{selectedEmployee.position || selectedEmployee.designation || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Joining Date</span>
                  <span className="font-medium">{selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              <div className="w-full mt-6 grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/admin/attendance');
                    // In a real app we'd pass state to pre-filter by this employee
                  }}
                >
                  View Attendance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/admin/leaves');
                  }}
                >
                  Leave History
                </Button>
              </div>
              <div className="w-full mt-4">
                <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeactivate(selectedEmployee)}>
                  {selectedEmployee.status !== 'Inactive' && selectedEmployee.status !== 'Deactivated' ? 'Deactivate Account' : 'Reactivate Account'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Password Reset Modal */}
      <Modal open={resetModalOpen} onOpenChange={(open) => { setResetModalOpen(open); if(!open) { setGeneratedPassword(null); setEmployeeToReset(null); setCustomPassword(''); } }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Reset Password</ModalTitle>
            <ModalDescription>
              {generatedPassword 
                ? `Password has been reset for ${employeeToReset?.firstName} ${employeeToReset?.lastName}.`
                : `Are you sure you want to reset the password for ${employeeToReset?.firstName} ${employeeToReset?.lastName}?`
              }
            </ModalDescription>
          </ModalHeader>
          
          <div className="py-4 space-y-4">
            {generatedPassword ? (
              <div className="bg-green-50 text-green-900 border border-green-200 rounded-lg p-6 text-center space-y-4">
                <p className="text-sm font-medium text-green-700 uppercase tracking-wide">New Generated Password</p>
                <div className="flex items-center justify-center gap-3">
                  <Key className="w-6 h-6 text-green-600" />
                  <span className="text-3xl font-bold tracking-wider font-mono bg-white px-4 py-2 rounded shadow-sm border border-green-100">
                    {generatedPassword}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Please copy this password and share it securely with the employee. They will be forced to change it upon their next login.
                </p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  This action will invalidate their current password immediately. They will be prompted to change it when they sign in next.
                </p>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="customPassword">Set Custom Password (Optional)</Label>
                  <Input 
                    id="customPassword" 
                    type="text" 
                    placeholder="Leave blank to auto-generate" 
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          
          <ModalFooter>
            {generatedPassword ? (
              <Button onClick={() => setResetModalOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmResetPassword}>Reset Password</Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
