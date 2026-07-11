import React, { useState, useEffect } from 'react';
import { Users, Clock, Coffee, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import { presenceService } from '../../services/presence.service';
import { attendanceService } from '../../services/attendance.service';
import { StatsCard } from '../../components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';

export default function AdminAttendanceManagement() {
  const [metrics, setMetrics] = useState(null);
  const [workforce, setWorkforce] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, workforceRes] = await Promise.all([
        presenceService.getDashboardMetrics().catch(() => null),
        presenceService.getWorkforcePresence().catch(() => null)
      ]);
      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (workforceRes?.data) setWorkforce(workforceRes.data);
    } catch (error) {
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Employee',
      accessorKey: 'user',
      cell: (info) => {
        const user = info.getValue();
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.companyEmail}</p>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (info) => {
        const val = info.getValue();
        let badgeColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        if (val === 'Working') badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
        if (val === 'On Break') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
        
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>{val}</span>;
      }
    },
    {
      header: 'Department',
      accessorKey: 'user.department',
      cell: (info) => <span className="text-sm">{info.getValue() || 'N/A'}</span>
    },
    {
      header: 'Timezone',
      accessorKey: 'user.timezone',
      cell: (info) => <span className="text-sm">{info.getValue() || 'UTC'}</span>
    },
    {
      header: 'Last Seen',
      accessorKey: 'lastSeen',
      cell: (info) => <span className="text-sm text-muted-foreground">{new Date(info.getValue()).toLocaleString()}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workforce Overview</h1>
        <p className="text-muted-foreground mt-1">Live metrics of your remote teams.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Working Now" value={metrics?.Working || 0} icon={MonitorPlay} />
        <StatsCard title="On Break" value={metrics?.['On Break'] || 0} icon={Coffee} />
        <StatsCard title="Online" value={(metrics?.Working || 0) + (metrics?.['On Break'] || 0) + (metrics?.Online || 0)} icon={Users} />
        <StatsCard title="Offline" value={metrics?.Offline || 0} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={workforce} 
            searchKey="user.firstName" 
            isLoading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
