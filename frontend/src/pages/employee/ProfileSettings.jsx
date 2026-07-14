import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { Camera, Save, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import { updateUser } from '../../store/slices/authSlice';
import { AnimatePresence } from 'framer-motion';

export default function ProfileSettings() {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    personalEmail: user?.personalEmail || '',
    emergencyContact: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', formData);
      dispatch(updateUser(res.data.data));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("New passwords don't match");
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully!');
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-1"
        >
          <Card>
            <CardContent className="flex flex-col items-center p-6 space-y-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback className="text-4xl">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera className="text-white" size={32} />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h2>
                <p className="text-muted-foreground text-sm">{user?.designation || 'Employee'}</p>
              </div>
              <div className="w-full pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Emp ID</span>
                  <span className="font-medium">{user?.employeeCode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{user?.department}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-1 md:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input name="firstName" value={formData.firstName} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input name="lastName" value={formData.lastName} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Email (Read Only)</label>
                    <Input value={user?.companyEmail || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Personal Email</label>
                    <Input name="personalEmail" type="email" value={formData.personalEmail} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Emergency Contact</label>
                    <Input name="emergencyContact" placeholder="Name - Phone" value={formData.emergencyContact} onChange={handleChange} />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <Button type="button" variant="outline" disabled={loading} onClick={() => setIsPasswordModalOpen(true)}>
                    Change Password
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" /> 
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Change Password</h2>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <Input 
                    type="password" 
                    name="currentPassword" 
                    value={passwordForm.currentPassword} 
                    onChange={handlePasswordChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input 
                    type="password" 
                    name="newPassword" 
                    value={passwordForm.newPassword} 
                    onChange={handlePasswordChange} 
                    required 
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input 
                    type="password" 
                    name="confirmPassword" 
                    value={passwordForm.confirmPassword} 
                    onChange={handlePasswordChange} 
                    required 
                    minLength={6}
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Changing...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
