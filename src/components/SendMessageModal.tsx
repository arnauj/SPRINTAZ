import React, { useEffect, useMemo, useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';
import { X, Send, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
}

export default function SendMessageModal({ isOpen, onClose, currentUser, users }: SendMessageModalProps) {
  const userTeams = useMemo(
    () => (currentUser.teams && currentUser.teams.length > 0 ? currentUser.teams : [currentUser.name]),
    [currentUser]
  );

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => (u.teams && u.teams.length > 0 ? u.teams : [u.name]).forEach(t => set.add(t)));
    userTeams.forEach(t => set.add(t));
    return Array.from(set).sort();
  }, [users, userTeams]);

  const isAdmin = currentUser.role === 'Admin';
  const availableTeams = isAdmin ? allTeams : userTeams;

  const [team, setTeam] = useState(availableTeams[0] || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTeam(availableTeams[0] || '');
      setMessage('');
      setSentCount(null);
    }
  }, [isOpen, availableTeams]);

  const recipients = useMemo(() => {
    if (!team) return [];
    return users.filter(u => {
      if (u.uid === currentUser.uid) return false;
      const uTeams = u.teams && u.teams.length > 0 ? u.teams : [u.name];
      return uTeams.includes(team);
    });
  }, [users, team, currentUser.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !message.trim() || recipients.length === 0) return;
    setSubmitting(true);
    try {
      const formatted = `📣 ${currentUser.name} → ${team}: ${message.trim()}`;
      await Promise.all(
        recipients.map(r => firebaseService.createNotification(r.uid, formatted))
      );
      setSentCount(recipients.length);
      setMessage('');
      setTimeout(() => onClose(), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            className="bg-white border border-bento-border rounded-3xl p-8 w-full max-w-md shadow-xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-bento-mute" />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1 text-bento-ink">Enviar mensaje</h3>
            <p className="text-sm text-bento-mute mb-6">Notifica a todos los miembros de un equipo.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  Equipo destinatario
                </label>
                <div className="relative">
                  <UsersIcon className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    required
                    className="w-full pl-11 pr-5 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all font-medium text-bento-ink appearance-none cursor-pointer"
                  >
                    {availableTeams.length === 0 && <option value="">Sin equipos</option>}
                    {availableTeams.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">
                  {recipients.length} {recipients.length === 1 ? 'destinatario' : 'destinatarios'} (sin contarte)
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  Mensaje
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escribe tu mensaje..."
                  className="w-full px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all resize-none text-sm text-bento-ink"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">{message.length}/500</p>
              </div>

              {sentCount !== null && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                  Mensaje enviado a {sentCount} {sentCount === 1 ? 'persona' : 'personas'}.
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-bento-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-semibold text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || recipients.length === 0 || !message.trim()}
                  className="flex-1 py-3 bg-bento-ink text-white text-sm font-bold rounded-xl shadow-md hover:bg-black active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
