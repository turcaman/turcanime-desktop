import { useState, useEffect } from 'react';

export function useNetworkStatus(): { isConnected: boolean | null } {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const off = window.electronAPI.network.onChanged((isOnline: boolean) => {
      setIsConnected(isOnline);
    });
    window.electronAPI.network.check().then((isOnline: boolean) => {
      setIsConnected(isOnline);
    }).catch((): void => undefined);
    return off;
  }, []);

  return { isConnected };
}
