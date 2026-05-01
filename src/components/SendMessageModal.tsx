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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-bento-card border-2 border-bento-border rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <h3 className="text-2xl font-bold tracking-tight mb-2 text-white">Enviar mensaje</h3>
            <p className="text-sm text-slate-500 mb-6">Notifica a todos los miembros de un equipo.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Equipo destinatario
                </label>
                <div className="relative">
                  <UsersIcon className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    required
                    className="w-full pl-11 pr-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-200 appearance-none cursor-pointer"
                  >
                    {availableTeams.length === 0 && <option value="">Sin equipos</option>}
                    {availableTeams.map(t => (
                      <option key={t} value={t} className="bg-slate-800">{t}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1.5 ml-1">
                  {recipients.length} {recipients.length === 1 ? 'destinatario' : 'destinatarios'} (sin contarte)
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Mensaje
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escribe tu mensaje..."
                  className="w-full px-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all resize-none text-sm text-slate-300"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="text-[10px] text-slate-600 italic mt-1.5 ml-1">{message.length}/500</p>
              </div>

              {sentCount !== null && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl px-4 py-2">
                  Mensaje enviado a {sentCount} {sentCount === 1 ? 'persona' : 'personas'}.
                </p>
              )}

              <div className="flex gap-4 pt-4 border-t-2 border-slate-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || recipients.length === 0 || !message.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
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
