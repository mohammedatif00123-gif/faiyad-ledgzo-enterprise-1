import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

export function MessageTicks({ status }) {
  if (!status) return null;

  if (status === 'sent') {
    return <Check className="w-4 h-4 text-slate-400 inline-block ml-1" />;
  }

  if (status === 'delivered') {
    return <CheckCheck className="w-4 h-4 text-slate-400 inline-block ml-1" />;
  }

  if (status === 'read') {
    return <CheckCheck className="w-4 h-4 text-blue-500 inline-block ml-1" />;
  }

  return null;
}
