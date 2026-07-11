import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Calendar, Clock, MessageSquare, Video, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmployeeDashboard() {
  const { user } = useSelector(state => state.auth);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
            <AvatarImage src={user?.profileImage} />
            <AvatarFallback className="text-2xl">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{getGreeting()}, {user?.firstName}!</h1>
            <p className="text-muted-foreground">Here is what's happening today.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto">
            <Clock className="mr-2 h-4 w-4" />
            Clock In
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Your current assignment and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                <p className="font-semibold">{user?.employeeCode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="font-semibold">{user?.department || 'Unassigned'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Designation</p>
                <p className="font-semibold">{user?.designation || 'Unassigned'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold">Online</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2">
              View Full Profile
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions / Attendance Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance & Leave</CardTitle>
            <CardDescription>Your recent time logs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
            <div className="rounded-full bg-secondary p-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Attendance module is not activated yet.</p>
            <Button variant="link">Request Leave <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </CardContent>
        </Card>

        {/* Notifications / Meetings Placeholder */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Meetings and reminders</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
            <div className="rounded-full bg-secondary p-3">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">You have no upcoming meetings today.</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Chats Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Communications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40 space-y-4 text-center">
          <div className="rounded-full bg-secondary p-3">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No recent messages in your inbox.</p>
        </CardContent>
      </Card>
    </div>
  );
}
