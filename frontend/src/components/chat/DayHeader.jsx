import React from 'react';

export function DayHeader({ date }) {
  if (!date) return null;

  const today = new Date();
  const messageDate = new Date(date);
  
  // Format logic
  let label = '';
  const diffTime = today.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  if (diffDays === 0 && today.getDate() === messageDate.getDate()) {
    label = 'Today';
  } else if (diffDays === 1 || (diffDays === 0 && today.getDate() !== messageDate.getDate())) {
    label = 'Yesterday';
  } else {
    label = messageDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className="flex justify-center my-4">
      <div className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-lg font-medium shadow-sm">
        {label}
      </div>
    </div>
  );
}
