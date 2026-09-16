import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutRow {
  action: string;
  keys: string[];
}

const GLOBAL_ROWS: ShortcutRow[] = [
  { action: 'Ir a Buscar y enfocar', keys: ['Ctrl', 'K'] },
  { action: 'Inicio / Buscar / Ajustes', keys: ['Ctrl', '1 · 2 · 3'] },
  { action: 'Volver atrás', keys: ['Retroceso'] },
];

const PLAYER_ROWS: ShortcutRow[] = [
  { action: 'Reproducir / Pausar', keys: ['Espacio', 'K'] },
  { action: 'Retroceder 10 s', keys: ['←', 'J'] },
  { action: 'Adelantar 10 s', keys: ['→', 'L'] },
  { action: 'Episodio anterior / siguiente', keys: ['P', 'N'] },
  { action: 'Subir / Bajar volumen', keys: ['↑', '↓'] },
  { action: 'Silenciar / Activar sonido', keys: ['M'] },
  { action: 'Pantalla completa', keys: ['F'] },
  { action: 'Salir de pantalla completa', keys: ['Esc'] },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="rounded border border-neutral-700 bg-neutral-800/80 px-1.5 py-0.5 text-[11px] text-neutral-300 font-mono">
    {children}
  </kbd>
);

const ShortcutList: React.FC<{ rows: ShortcutRow[] }> = ({ rows }) => (
  <div className="divide-y divide-neutral-800/60">
    {rows.map(({ action, keys }) => (
      <div
        key={action}
        className="flex items-center justify-between gap-3 py-2.5"
      >
        <span className="text-sm text-neutral-200">{action}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {keys.map((key, idx) => (
            <React.Fragment key={key}>
              {idx > 0 && <span className="text-[11px] text-neutral-500">+</span>}
              <Kbd>{key}</Kbd>
            </React.Fragment>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const ShortcutsSection: React.FC = () => {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div>
      <h2 className="text-[11px] font-medium text-neutral-300 uppercase tracking-[0.14em] mb-3">
        Atajos de teclado
      </h2>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-neutral-800/70 bg-neutral-900/50 hover:bg-neutral-800/60 transition-colors"
      >
        <Keyboard className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm text-neutral-200">Ver atajos de teclado</span>
          <span className="text-[11px] text-neutral-400 mt-0.5">
            Navegación y controles del reproductor
          </span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Atajos de teclado"
            className="relative w-full max-w-md bg-neutral-900 rounded-xl border border-neutral-800/70 shadow-lg shadow-black/40 overflow-hidden animate-fade-in"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">
                  Atajos de teclado
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Navegá más rápido con el teclado
                </p>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em] pb-2">
                Global
              </p>
              <ShortcutList rows={GLOBAL_ROWS} />
              <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em] py-2 mt-4">
                Reproductor
              </p>
              <ShortcutList rows={PLAYER_ROWS} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};