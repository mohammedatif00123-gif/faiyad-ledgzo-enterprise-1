import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';
import api from '../../services/api';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) {
      try {
        const res = await api.get(`/search?q=${val}`);
        setResults(res.data.data);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md hidden md:block">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search everywhere..."
          className="w-full bg-muted/50 pl-9 focus-visible:bg-background"
          value={query}
          onChange={handleSearch}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
      </div>

      {isOpen && results && (
        <div className="absolute top-full mt-1 w-full bg-card border rounded-md shadow-lg z-50 p-2">
          {results.users?.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-bold text-muted-foreground mb-1">Users</div>
              {results.users.map(u => (
                <div key={u._id} className="text-sm p-1.5 hover:bg-muted rounded cursor-pointer truncate">
                  {u.firstName} {u.lastName}
                </div>
              ))}
            </div>
          )}
          {results.conversations?.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-bold text-muted-foreground mb-1">Channels</div>
              {results.conversations.map(c => (
                <div key={c._id} className="text-sm p-1.5 hover:bg-muted rounded cursor-pointer truncate">
                  # {c.name}
                </div>
              ))}
            </div>
          )}
          {results.users?.length === 0 && results.conversations?.length === 0 && results.messages?.length === 0 && (
            <div className="text-sm text-muted-foreground p-2 text-center">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
