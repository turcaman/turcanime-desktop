import React from 'react';
import { Info } from 'lucide-react';
import { useUpdateStore } from '../../stores/updateStore';

export const AboutSection: React.FC = () => {
  const currentVersion = useUpdateStore((s) => s.currentVersion);

  return (
    <div>
      <h2 className="text-[11px] font-medium text-neutral-300 uppercase tracking-[0.14em] mb-3">Acerca de</h2>
      <div className="rounded-lg border border-neutral-800/70 bg-neutral-900/50">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Info className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <div className="flex flex-col items-start">
            <span className="text-sm text-neutral-300">Versión {currentVersion ?? '—'}</span>
            <span className="text-[11px] text-neutral-400 mt-0.5">Turcanime Desktop</span>
          </div>
        </div>
      </div>
    </div>
  );
};
