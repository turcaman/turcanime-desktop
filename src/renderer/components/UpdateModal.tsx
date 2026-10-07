import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';
import type { UpdatePhase } from '../stores/updateStore';

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

type ActivePhase = Exclude<UpdatePhase, 'idle'>;

const TITLE: Record<ActivePhase, string> = {
  confirm: 'Actualizar',
  downloading: 'Descargando',
  installing: 'Preparando instalación',
  error: 'No se pudo actualizar',
};

export const UpdateModal: React.FC = () => {
  const phase = useUpdateStore((s) => s.phase);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const assetSize = useUpdateStore((s) => s.assetSize);
  const installMode = useUpdateStore((s) => s.installMode);
  const progress = useUpdateStore((s) => s.progress);
  const errorMessage = useUpdateStore((s) => s.errorMessage);
  const closeUpdate = useUpdateStore((s) => s.closeUpdate);
  const confirmUpdate = useUpdateStore((s) => s.confirmUpdate);
  const beginDownload = useUpdateStore((s) => s.beginDownload);
  const cancelDownload = useUpdateStore((s) => s.cancelDownload);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Downloading and installing are not interruptible from the backdrop or X.
  const dismissible = phase === 'confirm' || phase === 'error';

  useEffect(() => {
    if (phase === 'idle') return;
    primaryRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!dismissible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeUpdate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissible, closeUpdate]);

  if (phase === 'idle') return null;

  const total = progress.totalBytes ?? assetSize;
  const pct = total != null && total > 0
    ? Math.min(1, progress.receivedBytes / total)
    : null;

  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (phase === 'confirm') {
    body = (
      <div className="space-y-1">
        <p className="text-neutral-200 text-base font-semibold">
          {currentVersion != null && updateAvailable != null
            ? `${currentVersion} → ${updateAvailable}`
            : `Versión ${updateAvailable} disponible`}
        </p>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {installMode === 'appimage'
            ? `Se descarga${assetSize != null ? ` (${formatSize(assetSize)})` : ''} y se aplica sola. La app se reinicia al terminar.`
            : `Se descarga${assetSize != null ? ` (${formatSize(assetSize)})` : ''} y se abre el instalador para que completes la actualización.`}
        </p>
      </div>
    );
    actions = (
      <>
        <button
          onClick={closeUpdate}
          className="flex-1 px-4 py-4 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
        >
          Cancelar
        </button>
        <div className="w-px bg-neutral-800" />
        <button
          ref={primaryRef}
          onClick={() => { void confirmUpdate(); }}
          className="flex-1 px-4 py-4 text-sm text-purple-400 hover:text-purple-300 hover:bg-neutral-800/60 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500/60"
        >
          Actualizar
        </button>
      </>
    );
  } else if (phase === 'downloading') {
    body = (
      <div>
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-purple-500 rounded-full transition-[width] duration-200"
            style={{ width: `${Math.round((pct ?? 0.03) * 100)}%` }}
          />
        </div>
        <p className="text-neutral-500 text-xs mt-2 tabular-nums">
          {pct != null
            ? `${Math.round(pct * 100)}% · ${formatSize(progress.receivedBytes)}`
            : `${formatSize(progress.receivedBytes)} descargados`}
        </p>
      </div>
    );
    actions = (
      <button
        onClick={cancelDownload}
        className="flex-1 px-4 py-4 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
      >
        Cancelar
      </button>
    );
  } else if (phase === 'installing') {
    body = (
      <p className="text-neutral-400 text-sm leading-5">
        {installMode === 'appimage'
          ? 'Aplicando la actualización y reiniciando. No cierres la app.'
          : 'Abriendo el instalador del sistema…'}
      </p>
    );
  } else {
    body = (
      <p className="text-neutral-400 text-sm leading-5">
        {errorMessage ?? 'Ocurrió un error inesperado.'}
      </p>
    );
    actions = (
      <>
        <button
          onClick={closeUpdate}
          className="flex-1 px-4 py-4 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
        >
          Cerrar
        </button>
        <div className="w-px bg-neutral-800" />
        <button
          ref={primaryRef}
          onClick={() => { void beginDownload(); }}
          className="flex-1 px-4 py-4 text-sm text-purple-400 hover:text-purple-300 hover:bg-neutral-800/60 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500/60"
        >
          Reintentar
        </button>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in ${dismissible ? '' : 'pointer-events-none'}`}
        onClick={closeUpdate}
      />
      <div className="relative w-full max-w-xs bg-neutral-900 rounded-xl border border-neutral-800/70 shadow-lg shadow-black/40 overflow-hidden animate-fade-in">
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-white text-xl font-bold">
              {TITLE[phase]}
            </p>
            {dismissible && (
              <button
                onClick={closeUpdate}
                aria-label="Cerrar"
                className="text-neutral-400 hover:text-neutral-200 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {body}
        </div>
        {actions != null ? (
          <div className="flex border-t border-neutral-800 mt-5">
            {actions}
          </div>
        ) : (
          <div className="h-5" />
        )}
      </div>
    </div>
  );
};
