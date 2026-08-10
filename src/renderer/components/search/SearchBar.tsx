import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Buscar anime...',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="sticky top-0 z-10 px-6 pt-4 pb-3 bg-[#0f0f11]">
      <div className="flex items-center bg-neutral-900 rounded-xl px-4 h-11 ring-1 ring-neutral-800 focus-within:ring-neutral-500/60 focus-within:bg-neutral-800/80 transition-all duration-200">
        <Search className="w-4 h-4 text-neutral-400 flex-shrink-0 mr-3" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-400 outline-none border-none"
        />
        {value.length > 0 && (
          <button
            onClick={onClear}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-neutral-700 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        )}
      </div>
    </div>
  );
};
