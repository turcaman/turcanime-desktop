import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(navigator.onLine);

  const handleChange = useCallback(() => {
    setIsConnected(navigator.onLine);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleChange);
    window.addEventListener('offline', handleChange);
    handleChange();
    return () => {
      window.removeEventListener('online', handleChange);
      window.removeEventListener('offline', handleChange);
    };
  }, [handleChange]);

  return { isConnected };
}
