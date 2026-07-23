import React from 'react';
import { WifiOff } from 'lucide-react';

interface NoConnectionOverlayProps {
  visible: boolean;
}

export const NoConnectionOverlay: React.FC<NoConnectionOverlayProps> = ({
  visible,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0f0f11] animate-fade-in select-none pointer-events-auto">
      <div className="flex flex-col items-center gap-5 px-8 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-800/80 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-neutral-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-neutral-400">
            Sin conexión
          </p>
          <p className="text-sm text-neutral-500">
            Conectate a internet para continuar
          </p>
        </div>
      </div>
    </div>
  );
};
