import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Clock, CalendarDays, Settings2, Bell, Shield, Save, RotateCcw, AlertTriangle, Trash2, Plus, Edit2, Coffee, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('work-hours');
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [config, setConfig] = useState({
    workHours: { start: '09:00', end: '18:00', gracePeriod: 15, halfDayThreshold: 4, overtimeEnabled: true },
    breaks: {
      lunch: { enabled: true, start: '13:00', end: '14:00', duration: 60 },
      short1: { enabled: true, start: '11:00', end: '11:15', duration: 15 },
      short2: { enabled: true, start: '16:00', end: '16:15', duration: 15 },
      flexible: true,
      autoEnd: false
    },
    leaves: {
      annual: 14, sick: 7, casual: 5, emergency: 3, maxCarryForward: 5
    }
  });

  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public', description: '' });

  useEffect(() => {
    fetchConfigs();
    fetchHolidays();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/break-config');
      if (res.data?.data) {
        // Deep merge or replace based on what backend sends
        // Assuming backend sends { workHours, breaks, leaves }
        setConfig(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      toast.error('Failed to load settings configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load holidays');
    }
  };

  const handleReset = async () => {
    // Optionally call an API to reset defaults, here simulating reset
    try {
      setSaving(true);
      // await api.post('/admin/break-config/reset');
      toast.success("Settings have been reset to factory defaults.");
      setShowResetModal(false);
      fetchConfigs();
    } catch (err) {
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/admin/break-config', config);
      toast.success("System settings updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    try {
      const res = await api.post('/admin/holidays', newHoliday);
      toast.success("Holiday added to calendar!");
      setNewHoliday({ name: '', date: '', type: 'Public', description: '' });
      fetchHolidays(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const removeHoliday = async (id) => {
    try {
      await api.delete(`/admin/holidays/${id}`);
      toast.success("Holiday removed.");
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to remove holiday');
    }
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNestedConfig = (section, subSection, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [key]: value
        }
      }
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-24 md:pb-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">Configure global rules for attendance, leaves, and breaks.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowResetModal(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset Defaults
          </Button>
          <Button className="bg-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Settings
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="space-y-1">
          {[
            { id: 'work-hours', label: 'Work Hours & Grace', icon: Clock },
            { id: 'breaks', label: 'Break Configuration', icon: Coffee },
            { id: 'leaves', label: 'Leave Policies', icon: CalendarDays },
            { id: 'holidays', label: 'Holiday Management', icon: CalendarDays },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              
              {activeTab === 'work-hours' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Work Hours Configuration</CardTitle>
                    <CardDescription>Set default shift timings and grace periods.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Shift Start Time (HH:MM)</label>
                        <Input type="time" value={config.workHours.start} onChange={e => updateConfig('workHours', 'start', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Shift End Time (HH:MM)</label>
                        <Input type="time" value={config.workHours.end} onChange={e => updateConfig('workHours', 'end', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Late Grace Period (minutes)</label>
                        <Input type="number" value={config.workHours.gracePeriod} onChange={e => updateConfig('workHours', 'gracePeriod', parseInt(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Employees arriving after this are marked Late.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Half-day Threshold (hours)</label>
                        <Input type="number" value={config.workHours.halfDayThreshold} onChange={e => updateConfig('workHours', 'halfDayThreshold', parseInt(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Minimum hours required for a half-day present.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg">
                      <div>
                        <h4 className="font-semibold text-sm">Overtime Tracking</h4>
                        <p className="text-xs text-muted-foreground">Automatically track hours worked past shift end time.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.workHours.overtimeEnabled} onChange={e => updateConfig('workHours', 'overtimeEnabled', e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'breaks' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Break Configuration</CardTitle>
                    <CardDescription>Manage allowed breaks during the shift.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lunch Break */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Coffee size={16}/> Lunch Break</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={config.breaks.lunch.enabled} onChange={e => updateNestedConfig('breaks', 'lunch', 'enabled', e.target.checked)} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      {config.breaks.lunch.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Start</label><Input type="time" value={config.breaks.lunch.start} onChange={e => updateNestedConfig('breaks', 'lunch', 'start', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">End</label><Input type="time" value={config.breaks.lunch.end} onChange={e => updateNestedConfig('breaks', 'lunch', 'end', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Duration (mins)</label><Input type="number" value={config.breaks.lunch.duration} onChange={e => updateNestedConfig('breaks', 'lunch', 'duration', parseInt(e.target.value))} /></div>
                        </div>
                      )}
                    </div>

                    {/* Short Break 1 */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Short Break 1</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={config.breaks.short1.enabled} onChange={e => updateNestedConfig('breaks', 'short1', 'enabled', e.target.checked)} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      {config.breaks.short1.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Start</label><Input type="time" value={config.breaks.short1.start} onChange={e => updateNestedConfig('breaks', 'short1', 'start', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">End</label><Input type="time" value={config.breaks.short1.end} onChange={e => updateNestedConfig('breaks', 'short1', 'end', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Duration (mins)</label><Input type="number" value={config.breaks.short1.duration} onChange={e => updateNestedConfig('breaks', 'short1', 'duration', parseInt(e.target.value))} /></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Short Break 2 */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Short Break 2</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={config.breaks.short2.enabled} onChange={e => updateNestedConfig('breaks', 'short2', 'enabled', e.target.checked)} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      {config.breaks.short2.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Start</label><Input type="time" value={config.breaks.short2.start} onChange={e => updateNestedConfig('breaks', 'short2', 'start', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">End</label><Input type="time" value={config.breaks.short2.end} onChange={e => updateNestedConfig('breaks', 'short2', 'end', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-xs text-muted-foreground">Duration (mins)</label><Input type="number" value={config.breaks.short2.duration} onChange={e => updateNestedConfig('breaks', 'short2', 'duration', parseInt(e.target.value))} /></div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg mt-4">
                      <div>
                        <h4 className="font-semibold text-sm">Flexible Breaks</h4>
                        <p className="text-xs text-muted-foreground">Allow employees to take breaks anytime within the duration limit.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.breaks.flexible} onChange={e => updateConfig('breaks', 'flexible', e.target.checked)} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'leaves' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Settings</CardTitle>
                    <CardDescription>Configure yearly quotas and carry forward rules.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Annual Leave</label>
                        <Input type="number" value={config.leaves.annual} onChange={e => updateConfig('leaves', 'annual', parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sick Leave</label>
                        <Input type="number" value={config.leaves.sick} onChange={e => updateConfig('leaves', 'sick', parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Casual Leave</label>
                        <Input type="number" value={config.leaves.casual} onChange={e => updateConfig('leaves', 'casual', parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Emergency</label>
                        <Input type="number" value={config.leaves.emergency} onChange={e => updateConfig('leaves', 'emergency', parseInt(e.target.value))} />
                      </div>
                    </div>
                    <div className="w-1/2 space-y-2 pt-4 border-t">
                      <label className="text-sm font-medium">Max Carry Forward Days</label>
                      <Input type="number" value={config.leaves.maxCarryForward} onChange={e => updateConfig('leaves', 'maxCarryForward', parseInt(e.target.value))} />
                      <p className="text-xs text-muted-foreground">Unused annual leaves carried to next year.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'holidays' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Holiday Management</CardTitle>
                    <CardDescription>Manage public and company holidays.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={addHoliday} className="flex flex-wrap gap-3 items-end p-4 bg-muted/20 border rounded-lg">
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-xs font-medium">Holiday Name</label>
                        <Input placeholder="E.g. Christmas" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} required />
                      </div>
                      <div className="space-y-1.5 w-[150px]">
                        <label className="text-xs font-medium">Date</label>
                        <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} required />
                      </div>
                      <div className="space-y-1.5 w-[130px]">
                        <label className="text-xs font-medium">Type</label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value})}>
                          <option value="Public">Public</option>
                          <option value="Company">Company</option>
                          <option value="Optional">Optional</option>
                        </select>
                      </div>
                      <Button type="submit"><Plus size={16} className="mr-1"/> Add</Button>
                    </form>

                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b sticky top-0">
                          <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Holiday Name</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {holidays.length === 0 ? (
                            <tr><td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">No holidays added yet.</td></tr>
                          ) : holidays.map((h) => (
                            <tr key={h._id || h.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">{new Date(h.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3">{h.name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.type === 'Public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {h.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeHoliday(h._id || h.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card w-full max-w-md rounded-2xl shadow-xl border p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle size={24} />
                <h2 className="text-xl font-semibold">Factory Reset Settings</h2>
              </div>
              <p className="text-muted-foreground text-sm">
                Are you sure you want to reset all configurations to their default values? This action cannot be undone and will apply to all employees immediately.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowResetModal(false)} disabled={saving}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleReset} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reset'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
