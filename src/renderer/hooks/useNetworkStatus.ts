import { useState, useEffect } from 'react';

export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const off = window.electronAPI.network.onChanged((isOnline: boolean) => {
      setIsConnected(isOnline);
    });
    window.electronAPI.network.check().then((isOnline: boolean) => {
      setIsConnected(isOnline);
    });
    return off;
  }, []);

  return { isConnected };
}
