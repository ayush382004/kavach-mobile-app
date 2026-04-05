import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications.jsx';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, requestBrowserPermission } = useNotifications();
  const [open, setOpen] = useState(false);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      markAllRead();
      await requestBrowserPermission();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm font-semibold text-kavach-dark transition hover:bg-orange-50"
      >
        Alerts
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-orange-100 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display font-bold text-kavach-dark">Notifications</div>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl bg-orange-50 p-4 text-sm text-gray-500">No alerts yet.</div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.type === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : item.type === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-kavach-dark">{item.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{item.message}</div>
                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
