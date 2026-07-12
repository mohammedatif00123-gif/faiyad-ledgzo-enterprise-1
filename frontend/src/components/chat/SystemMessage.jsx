import React from 'react';

export function SystemMessage({ message }) {
  return (
    <div className="flex justify-center my-4 w-full">
      <div className="bg-[var(--ent-border)] text-[var(--font-xs)] text-[var(--ent-text-secondary)] px-4 py-1.5 rounded-full shadow-sm max-w-[80%] text-center">
        {message.content}
      </div>
    </div>
  );
}
