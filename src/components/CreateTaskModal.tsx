import React, { useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { TaskStatus, User } from '../types';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  initialStatus: TaskStatus;
  currentUser: User;
}

export default function CreateTaskModal({ isOpen, onClose, sprintId, initialStatus, currentUser }: CreateTaskModalProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(1);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await firebaseService.createTask({
        name,
        description,
        weight,
        status: initialStatus,
        sprintId,
        createdBy: currentUser.uid
      });
      setName('');
      setWeight(1);
      setDescription('');
      onClose();
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
            className="bg-bento-card border border-bento-border rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <h3 className="text-2xl font-bold tracking-tight mb-8 text-white">Nueva Tarea</h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Preparar presentación macro"
                  autoFocus
                  required
                  className="w-full px-5 py-3 bg-slate-800 border border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Peso (Esfuerzo)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-5 py-3 bg-slate-800 border border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium font-mono text-indigo-400"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Estado</label>
                  <div className="w-full px-5 py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center h-full">
                    {STATUS_LABELS[initialStatus]}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                <textarea
                  placeholder="Detalles de la tarea..."
                  rows={4}
                  className="w-full px-5 py-3 bg-slate-800 border border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all resize-none text-sm text-slate-300"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Añadiendo...' : 'Listo'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
