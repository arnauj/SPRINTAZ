import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, TaskStatus, User } from '../types';
import { X, Check, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const COLOR_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Sin color' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#6366f1', label: 'Índigo' },
  { value: '#a855f7', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
];

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  initialStatus: TaskStatus;
  currentUser: User;
  editingTask?: Task | null;
}

export default function CreateTaskModal({ isOpen, onClose, sprintId, initialStatus, currentUser, editingTask }: CreateTaskModalProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(1);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('#6366f1');
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editingTask;

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setName(editingTask.name);
        setWeight(editingTask.weight);
        setDescription(editingTask.description || '');
        setColor(editingTask.color || null);
        
        // Si el color de la tarea no está en los presets, lo ponemos como custom
        if (editingTask.color && !COLOR_OPTIONS.find(opt => opt.value === editingTask.color)) {
          setCustomColor(editingTask.color);
        }
      } else {
        setName('');
        setWeight(1);
        setDescription('');
        setColor(null);
      }
    }
  }, [isOpen, editingTask]);

  const isCustomColorActive = color !== null && !COLOR_OPTIONS.find(opt => opt.value === color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (editingTask) {
        await firebaseService.updateTask(editingTask.id, {
          name,
          description,
          weight,
          color: color || '',
        });
      } else {
        await firebaseService.createTask({
          name,
          description,
          weight,
          status: initialStatus,
          sprintId,
          createdBy: currentUser.uid,
          ...(color ? { color } : {}),
        });
      }
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
            className="bg-bento-card border-2 border-bento-border rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <h3 className="text-2xl font-bold tracking-tight mb-8 text-white">
              {isEditMode ? 'Editar Tarea' : 'Nueva Tarea'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Preparar presentación macro"
                  autoFocus
                  required
                  className="w-full px-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-200"
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
                    className="w-full px-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium font-mono text-indigo-400"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Estado</label>
                  <div className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center h-full">
                    {STATUS_LABELS[editingTask?.status || initialStatus]}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((opt) => {
                    const isSelected = color === opt.value;
                    return (
                      <button
                        key={opt.value || 'none'}
                        type="button"
                        onClick={() => setColor(opt.value)}
                        title={opt.label}
                        className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-110 ${
                          isSelected ? 'border-white shadow-lg scale-110' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: opt.value || 'transparent' }}
                      >
                        {opt.value === null ? (
                          <Ban className="w-4 h-4 text-slate-500" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : null}
                      </button>
                    );
                  })}

                  <div className="relative">
                    <input
                      type="color"
                      id="customColor"
                      className="sr-only"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setColor(e.target.value);
                      }}
                    />
                    <label
                      htmlFor="customColor"
                      className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-110 ${
                        isCustomColorActive ? 'border-white shadow-lg scale-110' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: customColor }}
                      title="Color personalizado"
                    >
                      {isCustomColorActive && <Check className="w-4 h-4 text-white" />}
                      {!isCustomColorActive && <div className="w-4 h-4 rounded-full border border-white/20 bg-gradient-to-br from-white/10 to-transparent" />}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                <textarea
                  placeholder="Detalles de la tarea..."
                  rows={4}
                  className="w-full px-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all resize-none text-sm text-slate-300"
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
                  {submitting ? 'Guardando...' : isEditMode ? 'Guardar' : 'Listo'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
