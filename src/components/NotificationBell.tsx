import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Notification } from '../types';
import { Bell, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeNotifications(userId, setNotifications);
    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2.5 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 rounded-xl relative transition-all cursor-pointer shadow-sm active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-indigo-500 border-2 border-bento-card rounded-full shadow-lg" />
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-bento-card border border-bento-border rounded-2xl shadow-2xl z-30 overflow-hidden"
            >
              <div className="p-4 border-b border-bento-border flex items-center justify-between bg-slate-800/10">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full shadow-md">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-slate-600">
                    <CheckCheck className="w-10 h-10 mx-auto mb-3 opacity-10" />
                    <p className="text-sm italic font-medium">Bandeja de entrada vacía</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${!notif.read ? 'bg-indigo-500/5' : ''}`}
                    >
                      <p className={`text-sm leading-snug ${!notif.read ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>{notif.message}</p>
                      <p className="text-[9px] text-slate-600 mt-2 font-mono uppercase">
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
