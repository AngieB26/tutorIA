// Combobox visual moderno para búsqueda y selección
import React, { useState } from 'react';

export function Combobox({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (v: string) => void, placeholder?: string }) {
  const [query, setQuery] = useState('');
  
  // Filtrar elementos undefined/null y validar que sean strings
  const validOptions = options.filter(o => o != null && typeof o === 'string' && o.trim() !== '');
  
  const filtered = query
    ? validOptions.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : validOptions;
  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none shadow-none text-gray-800 placeholder-gray-400"
        style={{ boxShadow: 'none', outline: 'none' }}
        placeholder={placeholder || ''}
        value={query || value}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setQuery(value)}
        autoComplete="off"
      />
      {filtered.length > 0 && query && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-none max-h-40 overflow-auto outline-none" style={{ boxShadow: 'none', outline: 'none', borderColor: '#d1d5db' }}>
          {filtered.map(option => (
            <li
              key={option}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-100 ${option === value ? 'bg-blue-50 font-semibold text-gray-900' : 'text-gray-800'}`}
              onMouseDown={() => {
                onChange(option);
                setQuery('');
              }}
              style={{ boxShadow: 'none', outline: 'none' }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
