import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TITLES: Record<string, string> = {
  confirm: 'Actualización disponible',
  downloading: 'Descargando',
  installing: 'Instalando',
  error: 'No se pudo actualizar',
};

export const UpdateModal: React.FC = () => {
  const phase = useUpdateStore((s) => s.phase);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const assetSize = useUpdateStore((s) => s.assetSize);
  const installMode = useUpdateStore((s) => s.installMode);
  const progress = useUpdateStore((s) => s.progress);
  const errorMessage = useUpdateStore((s) => s.errorMessage);
  const closeUpdate = useUpdateStore((s) => s.closeUpdate);
  const confirmUpdate = useUpdateStore((s) => s.confirmUpdate);
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
      <>
        <p className="text-sm text-neutral-300">
          Versión {updateAvailable} disponible
          {assetSize != null && ` · ${formatSize(assetSize)}`}
        </p>
        <p className="text-xs text-neutral-400 mt-1.5">
          {installMode === 'appimage'
            ? 'Se descarga y se aplica sola. La app se reinicia al terminar.'
            : 'Se descarga y se abre el instalador para que completes la actualización.'}
        </p>
      </>
    );
    actions = (
      <div className="flex">
        <button
          onClick={closeUpdate}
          className="flex-1 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800/60 transition-colors"
        >
          Cancelar
        </button>
        <div className="w-px bg-neutral-800/60" />
        <button
          ref={primaryRef}
          onClick={() => { void confirmUpdate(); }}
          className="flex-1 py-2.5 text-sm text-purple-400 font-medium hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
        >
          Actualizar
        </button>
      </div>
    );
  } else if (phase === 'downloading') {
    body = (
      <>
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-[width] duration-200"
            style={{ width: `${Math.round((pct ?? 0.02) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400 mt-2.5">
          {pct != null
            ? `${Math.round(pct * 100)}% · ${formatSize(progress.receivedBytes)} de ${formatSize(total ?? 0)}`
            : `${formatSize(progress.receivedBytes)} descargados`}
        </p>
      </>
    );
    actions = (
      <button
        onClick={cancelDownload}
        className="w-full py-2.5 text-sm text-neutral-300 hover:bg-neutral-800/60 transition-colors"
      >
        Cancelar
      </button>
    );
  } else if (phase === 'installing') {
    body = (
      <p className="text-sm text-neutral-300">
        {installMode === 'appimage'
          ? 'Aplicando la actualización y reiniciando…'
          : 'Abriendo el instalador…'}
      </p>
    );
  } else {
    body = (
      <p className="text-sm text-neutral-300 break-words">
        {errorMessage ?? 'Ocurrió un error inesperado.'}
      </p>
    );
    actions = (
      <div className="flex">
        <button
          onClick={closeUpdate}
          className="flex-1 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800/60 transition-colors"
        >
          Cerrar
        </button>
        <div className="w-px bg-neutral-800/60" />
        <button
          ref={primaryRef}
          onClick={() => { void confirmUpdate(); }}
          className="flex-1 py-2.5 text-sm text-purple-400 font-medium hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
        >
          Reintentar
        </button>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in ${dismissible ? '' : 'pointer-events-none'}`}
        onClick={closeUpdate}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[phase]}
        className="relative w-full max-w-sm bg-neutral-900 rounded-xl border border-neutral-800/70 shadow-lg shadow-black/40 overflow-hidden animate-fade-in"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60">
          <h3 className="text-sm font-semibold text-neutral-200">
            {TITLES[phase]}
          </h3>
          {dismissible && (
            <button
              onClick={closeUpdate}
              aria-label="Cerrar"
              className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70"
            >
              <X className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        <div className="p-4">{body}</div>

        {actions != null && (
          <div className="border-t border-neutral-800/60 -mx-4 -mb-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
