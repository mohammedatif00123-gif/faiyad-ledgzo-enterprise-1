import React from 'react';
import { cn } from "../../lib/utils";
import { Ghost } from 'lucide-react';

function EmptyState({ className, icon: Icon = Ghost, title = "No data found", description, action }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
