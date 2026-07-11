import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  Present: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Late: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Half Day': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Absent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  Leave: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  Holiday: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  Weekend: 'bg-muted/50 text-muted-foreground border-transparent'
};

export function Calendar({ attendanceData = [], currentMonth, onPrevMonth, onNextMonth }) {
  // Simple calendar rendering logic for demo purposes
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-foreground">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={onPrevMonth} className="p-2 hover:bg-muted rounded-full transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={onNextMonth} className="p-2 hover:bg-muted rounded-full transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {blanks.map(blank => (
          <div key={`blank-${blank}`} className="aspect-square p-2 rounded-xl" />
        ))}
        {days.map(day => {
          // Check for attendance record
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = attendanceData.find(a => a.attendanceDate === dateStr);
          
          let status = 'Absent';
          const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          if (dateObj.getDay() === 0 || dateObj.getDay() === 6) status = 'Weekend';
          
          if (record) status = record.attendanceStatus;

          const colorClass = STATUS_COLORS[status] || STATUS_COLORS.Absent;

          return (
            <motion.div 
              key={day}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "aspect-square rounded-xl p-2 border flex flex-col items-center justify-center relative cursor-pointer hover:opacity-80 transition-opacity",
                colorClass
              )}
            >
              <span className="text-sm font-semibold">{day}</span>
              {record?.overtimeHours > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-background" title="Overtime logged" />
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t justify-center">
        {Object.entries(STATUS_COLORS).map(([status, classes]) => (
          <div key={status} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <div className={cn("w-3 h-3 rounded-full border", classes.split(' ')[0], classes.split(' ')[3])} />
            {status}
          </div>
        ))}
      </div>
    </div>
  );
}
