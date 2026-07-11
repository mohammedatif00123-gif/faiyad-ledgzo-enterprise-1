import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Users, UserCheck, UserMinus, UserPlus, Calendar } from 'lucide-react';
import { StatsCard } from '../../components/ui/StatsCard';

const DEFAULT_WIDGETS = [
  { id: 'total-emp', title: 'Total Employees', value: '1,248', icon: Users, trend: 'up', trendValue: '+12%' },
  { id: 'online-emp', title: 'Online Employees', value: '843', icon: UserCheck, trend: 'up', trendValue: '+5%' },
  { id: 'active-emp', title: 'Active Employees', value: '1,200', icon: UserCheck },
  { id: 'inactive-emp', title: 'Inactive Employees', value: '48', icon: UserMinus, trend: 'down', trendValue: '-2%' },
  { id: 'new-emp', title: 'New This Month', value: '24', icon: UserPlus, trend: 'up', trendValue: '+18%' },
  { id: 'attendance', title: 'Avg. Attendance', value: '94%', icon: Calendar },
];

function SortableWidget({ id, widget }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
      <StatsCard {...widget} />
    </div>
  );
}

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem('adminDashboardLayout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length === DEFAULT_WIDGETS.length) {
          return parsed.map(p => DEFAULT_WIDGETS.find(w => w.id === p.id));
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_WIDGETS;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('adminDashboardLayout', JSON.stringify(newArray.map(w => ({ id: w.id }))));
        return newArray;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Drag and drop cards to personalize your layout.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => (
              <SortableWidget key={widget.id} id={widget.id} widget={widget} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Chart Placeholders */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-center h-80">
          <p className="text-muted-foreground">Attendance Analytics Chart Placeholder</p>
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-center h-80">
          <p className="text-muted-foreground">Recent Activity Feed Placeholder</p>
        </div>
      </div>
    </div>
  );
}
