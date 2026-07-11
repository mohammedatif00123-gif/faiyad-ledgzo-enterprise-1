import React, { useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

export default function MentionDropdown({ users = [], query = '', onSelect, position, selectedIndex }) {
  const containerRef = useRef(null);

  // Filter users based on query
  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(query.toLowerCase()) || 
    user.lastName.toLowerCase().includes(query.toLowerCase()) ||
    user.designation?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5); // Max 5 results

  useEffect(() => {
    // Auto-scroll to selected index
    if (containerRef.current) {
      const activeEl = containerRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (filteredUsers.length === 0) return null;

  return (
    <div 
      className="absolute z-50 bg-background border rounded-lg shadow-xl overflow-hidden w-64 animate-in fade-in zoom-in duration-150"
      style={{
        bottom: position.bottom ? `${position.bottom}px` : 'auto',
        top: position.top ? `${position.top}px` : 'auto',
        left: `${position.left}px`
      }}
    >
      <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b">
        People matching "{query}"
      </div>
      <ul ref={containerRef} className="max-h-[240px] overflow-y-auto p-1">
        {filteredUsers.map((user, index) => (
          <li
            key={user._id}
            onClick={() => onSelect(user)}
            onMouseEnter={() => {}} // Could dispatch hover state to parent
            className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors ${index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            <Avatar 
              src={user.avatar} 
              fallback={user.firstName?.[0]} 
              className="w-8 h-8 shrink-0" 
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </span>
              {user.designation && (
                <span className="text-[10px] text-muted-foreground truncate opacity-80">
                  {user.designation}
                </span>
              )}
            </div>
            {user.role === 'admin' && (
              <Badge variant="outline" className="ml-auto text-[8px] py-0 px-1">Admin</Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
