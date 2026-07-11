import React, { useEffect, useState } from 'react';
import { HomePage } from './renderer/pages/HomePage';
import { useUserInitializationStore } from './renderer/stores/userIndex';
import { sessionManager } from './renderer/services/session';
import { Skeleton } from './renderer/components/ui/Skeleton';

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await sessionManager.initialize();
      await initialize();
      sessionManager.refreshSession().catch(() => {});
      setReady(true);
    };
    init();
  }, [initialize]);

  if (!ready || !isInitialized) {
    return (
      <div className="h-screen w-screen bg-[#0f0f11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-48 h-4 rounded" />
          <Skeleton className="w-32 h-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0f0f11]">
      <HomePage />
    </div>
  );
};

export default App;
