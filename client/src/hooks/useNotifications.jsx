import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { weatherAPI } from '../utils/api.js';
import { useAuth } from './useAuth.jsx';
import { SOCKET_URL } from '../utils/runtime.js';
const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const addNotification = (notification) => {
    const item = {
      id: notification.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: notification.createdAt || new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications((prev) => [item, ...prev].slice(0, 20));

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(item.title || 'Kavach update', { body: item.message || '' });
      } catch {
        // Ignore browser notification errors.
      }
    }
  };

  useEffect(() => {
    if (!user?._id || user.role !== 'user') {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      return undefined;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const walletEvent = `wallet_update_${user._id}`;
    socket.on(walletEvent, (payload) => {
      const title =
        payload.category === 'withdrawal'
          ? 'Money transferred'
          : payload.alert
            ? 'Coverage alert'
            : payload.category === 'topup'
              ? 'Money added'
              : payload.payout
                ? 'Claim payout received'
                : 'Wallet update';

      addNotification({
        title,
        message: payload.message || 'Your wallet was updated.',
        type: payload.alert ? 'warning' : 'success',
      });
    });

    return () => socket.disconnect();
  }, [user?._id, user?.role]);

  useEffect(() => {
    if (!user?._id || user.role !== 'user' || !user?.lastLocation?.lat || !user?.lastLocation?.lng) {
      return undefined;
    }

    let cancelled = false;

    const checkHeatwave = async () => {
      try {
        const { data } = await weatherAPI.getHeatwave({
          lat: user.lastLocation.lat,
          lng: user.lastLocation.lng,
          city: user.city,
        });

        if (cancelled || !data?.isHeatwave) return;

        const dedupeKey = `heatwave:${user._id}:${new Date().toISOString().slice(0, 13)}`;
        if (sessionStorage.getItem(dedupeKey)) return;
        sessionStorage.setItem(dedupeKey, '1');

        addNotification({
          title: 'Heatwave alert',
          message: `Heatwave conditions may be building near ${data.city || user.city}. Current temperature is ${data.temperature}C.`,
          type: 'warning',
        });
      } catch {
        // Weather polling is best effort.
      }
    };

    checkHeatwave();
    const interval = window.setInterval(checkHeatwave, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?._id, user?.role, user?.lastLocation?.lat, user?.lastLocation?.lng, user?.city]);

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, requestBrowserPermission }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
}
