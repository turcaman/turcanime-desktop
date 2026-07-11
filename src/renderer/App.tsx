import React, { useEffect, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { useUserInitializationStore } from './stores/userIndex';
import { useUIStore } from './stores/uiStore';
import { Skeleton } from './components/ui/Skeleton';

const App: React.FC = () => {
  const initialize = useUserInitializationStore((s) => s.initialize);
  const isInitialized = useUserInitializationStore((s) => s.isInitialized);
  const triggerSessionRefresh = useUIStore((s) => s.triggerSessionRefresh);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      triggerSessionRefresh();
      setInitialized(true);
    };
    init();
  }, [initialize, triggerSessionRefresh]);

  if (!initialized || !isInitialized) {
    return (
      <div className="h-screen w-screen bg-[#0f0f11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-48 h-4 rounded" />
          <Skeleton className="w-32 h-3 rounded" />
        </div>
      </div>
    );
  }

  return <HomePage />;
};

export default App;
