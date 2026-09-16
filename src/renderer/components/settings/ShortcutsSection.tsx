import React from 'react';
import { Keyboard } from 'lucide-react';

interface ShortcutRow {
  action: string;
  keys: string[];
}

const GLOBAL_ROWS: ShortcutRow[] = [
  { action: 'Ir a Buscar y enfocar', keys: ['Ctrl/⌘', 'K'] },
  { action: 'Inicio / Buscar / Ajustes', keys: ['Ctrl/⌘', '1 · 2 · 3'] },
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
  <>
    {rows.map(({ action, keys }) => (
      <div
        key={action}
        className="flex items-center justify-between gap-3 px-4 py-2.5"
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
  </>
);

export const ShortcutsSection: React.FC = () => {
  return (
    <div>
      <h2 className="text-[11px] font-medium text-neutral-300 uppercase tracking-[0.14em] mb-3">
        Atajos de teclado
      </h2>
      <div className="rounded-lg border border-neutral-800/70 bg-neutral-900/50 divide-y divide-neutral-800/60 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Keyboard className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-sm text-neutral-300">
            Navegá más rápido con el teclado
          </span>
        </div>
        <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em]">
          Global
        </div>
        <ShortcutList rows={GLOBAL_ROWS} />
        <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-neutral-400 uppercase tracking-[0.14em]">
          Reproductor
        </div>
        <ShortcutList rows={PLAYER_ROWS} />
      </div>
    </div>
  );
};