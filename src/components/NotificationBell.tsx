import { useState, useEffect, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import type { Notification as AppNotification } from '../types';
import { Bell, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    seenIdsRef.current = new Set();
    initializedRef.current = false;
    const unsubscribe = firebaseService.subscribeNotifications(userId, (incoming) => {
      setNotifications(incoming);
      if (!initializedRef.current) {
        incoming.forEach(n => seenIdsRef.current.add(n.id));
        initializedRef.current = true;
        return;
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        incoming.forEach(n => {
          if (!seenIdsRef.current.has(n.id) && !n.read) {
            try {
              new Notification('SPRINTAZ', {
                body: n.message,
                tag: n.id,
              });
            } catch (e) {
              console.warn('Browser Notification failed:', e);
            }
          }
          seenIdsRef.current.add(n.id);
        });
      } else {
        incoming.forEach(n => seenIdsRef.current.add(n.id));
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 bg-white border border-bento-border hover:bg-slate-50 relative transition-all cursor-pointer active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-bento-ink" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-500 border border-white text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed md:absolute left-2 right-2 md:left-auto md:right-0 top-16 md:mt-3 w-auto md:w-96 bg-white border border-bento-border shadow-xl z-[1001] overflow-hidden max-h-[70vh] md:max-h-[28rem]"
            >
              <div className="px-4 py-3 md:py-3 border-b border-bento-border flex items-center justify-between bg-slate-50 sticky top-0">
                <span className="text-sm md:text-xs font-bold uppercase tracking-widest text-bento-ink">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] md:text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>

              <div className="max-h-[60vh] md:max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-bento-mute">
                    <CheckCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm italic font-medium">Bandeja de entrada vacía</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-4 py-4 md:py-3 border-b border-bento-border hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-amber-50' : 'bg-white'}`}
                    >
                      <p className={`text-base md:text-sm leading-snug break-words ${!notif.read ? 'text-bento-ink font-semibold' : 'text-slate-700'}`}>{notif.message}</p>
                      <p className="text-[11px] md:text-[10px] text-bento-mute mt-2 font-mono uppercase">
                        {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Recién ahora'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
