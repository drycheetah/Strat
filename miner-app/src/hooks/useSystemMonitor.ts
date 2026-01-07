import { useState, useEffect } from 'react';
import type { SystemInfo } from '../types';

export const useSystemMonitor = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    platform: '',
    arch: '',
    cpus: 0,
    totalMemory: 0,
    freeMemory: 0,
    hostname: '',
    cpuUsage: 0,
    memoryUsage: 0,
    temperature: 0,
    power: 0,
  });

  useEffect(() => {
    // Get initial system info
    const getSystemInfo = async () => {
      if (window.electronAPI) {
        const info = await window.electronAPI.getSystemInfo();
        setSystemInfo(prev => ({ ...prev, ...info }));
      } else {
        // Browser fallback
        setSystemInfo(prev => ({
          ...prev,
          platform: navigator.platform,
          cpus: navigator.hardwareConcurrency || 4,
        }));
      }
    };

    getSystemInfo();

    // Update system stats every 2 seconds
    const interval = setInterval(() => {
      // Simulate system monitoring - in production, this would use native APIs
      setSystemInfo(prev => ({
        ...prev,
        cpuUsage: Math.random() * 100,
        memoryUsage: prev.totalMemory > 0
          ? ((prev.totalMemory - prev.freeMemory) / prev.totalMemory) * 100
          : Math.random() * 60,
        temperature: 40 + Math.random() * 40, // 40-80°C
        power: 50 + Math.random() * 200, // 50-250W
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return systemInfo;
};
