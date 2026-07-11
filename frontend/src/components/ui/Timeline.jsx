import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

export function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-sm">
        No activities found for this session.
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l-2 border-muted/60 space-y-8 py-4">
      {events.map((event, index) => {
        const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let colorClass = 'bg-blue-500';
        if (event.type.includes('Start') || event.type === 'Present') colorClass = 'bg-emerald-500';
        if (event.type.includes('End') || event.type === 'Offline') colorClass = 'bg-rose-500';
        if (event.type.includes('Break') || event.type === 'Away') colorClass = 'bg-amber-500';

        return (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Timeline Dot */}
            <div className={cn("absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-background", colorClass)} />
            
            <div className="bg-card border shadow-sm rounded-xl p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {event.type}
                  {event.type.includes('Break') && <Badge variant="warning">Break</Badge>}
                </h4>
                <span className="text-xs text-muted-foreground font-medium">{time}</span>
              </div>
              {event.note && (
                <p className="text-xs text-muted-foreground mt-2">{event.note}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
