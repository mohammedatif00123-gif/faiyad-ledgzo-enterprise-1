import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, Filter, MoreHorizontal, Download, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';

export default function EmployeeManagement() {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees');
      setEmployees(res.data.data.employees || res.data.data); 
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;

      if (selectedEmployee) {
        await api.put(`/employees/${selectedEmployee._id}`, payload);
        toast.success('Employee updated successfully!');
      } else {
        const res = await api.post('/employees', payload);
        const generatedPassword = res.data.data?.tempPassword;
        
        toast.success(
          <div>
            Employee created successfully! <br />
            Password: <b>{generatedPassword}</b>
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
      companyEmail: employee.companyEmail,
      department: employee.department || '',
      designation: employee.designation || '',
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (employee) => {
    const isDeactivating = employee.status === 'Active';
    if (window.confirm(`Are you sure you want to ${isDeactivating ? 'deactivate' : 'activate'} ${employee.firstName} ${employee.lastName}?`)) {
      try {
        const newStatus = isDeactivating ? 'Inactive' : 'Active';
        await api.patch(`/employees/${employee._id}/status`, { status: newStatus });
        toast.success(`Employee ${newStatus.toLowerCase()} successfully`);
        fetchEmployees();
      } catch (err) {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (employee) => {
    if (window.confirm(`Are you sure you want to permanently delete ${employee.firstName} ${employee.lastName}?`)) {
      try {
        await api.delete(`/employees/${employee._id}`);
        toast.success('Employee deleted successfully');
        fetchEmployees();
      } catch (err) {
        toast.error('Failed to delete employee');
      }
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'employeeCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.employeeCode || 'N/A'}</span>
    },
    {
      accessorKey: 'name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.profileImage} />
            <AvatarFallback>{row.original.firstName?.charAt(0)}{row.original.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.firstName} {row.original.lastName}</span>
            <span className="text-xs text-muted-foreground">{row.original.companyEmail}</span>
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
      accessorKey: 'designation',
      header: 'Designation',
      cell: ({ row }) => <span className="text-sm">{row.original.designation || 'N/A'}</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'Active';
        return (
          <Badge variant={status === 'Active' ? 'success' : 'secondary'}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
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
              <DropdownMenuItem 
                className={row.original.status === 'Active' ? 'text-secondary' : 'text-primary'} 
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.original); }}
              >
                {row.original.status === 'Active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive font-semibold" 
                onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
              >
                Delete
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
    <div className="flex flex-col space-y-6">
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
          <Button onClick={() => { setSelectedEmployee(null); reset({ firstName: '', lastName: '', companyEmail: '', department: '', designation: '' }); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
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
        pageCount={1}
        pagination={{ pageIndex: 0, pageSize: 10 }}
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
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input id="companyEmail" type="email" placeholder="john.doe@ledgzo.com" {...register('companyEmail', { required: 'Email is required' })} className={errors.companyEmail ? 'border-red-500' : ''} />
                  {errors.companyEmail && <p className="text-xs text-red-500">{errors.companyEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input id="password" type="text" placeholder={selectedEmployee ? "Leave empty to keep current" : "Leave empty to auto-generate"} {...register('password')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" placeholder="Engineering" {...register('department')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" placeholder="Software Engineer" {...register('designation')} />
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
                <AvatarImage src={selectedEmployee.profileImage} />
                <AvatarFallback className="text-2xl">{selectedEmployee.firstName?.charAt(0)}{selectedEmployee.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
              <p className="text-muted-foreground">{selectedEmployee.companyEmail}</p>
              <Badge className="mt-2" variant={selectedEmployee.status === 'Active' ? 'success' : 'secondary'}>{selectedEmployee.status || 'Active'}</Badge>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Employee Code</span>
                  <span className="font-medium">{selectedEmployee.employeeCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{selectedEmployee.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="font-medium">{selectedEmployee.designation || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{selectedEmployee.role}</span>
                </div>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
