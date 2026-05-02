import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, TaskStatus, User } from '../types';
import { X, Bell, Link as LinkIcon, MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Aprobadas',
  in_progress: 'Doing',
  done: 'Desplegado',
};

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: '#A8E6C9', label: 'Verde' },
  { value: '#FBE89D', label: 'Amarillo' },
  { value: '#F7CD7A', label: 'Ámbar' },
  { value: '#FBB380', label: 'Naranja' },
  { value: '#F7B6BC', label: 'Rosa' },
  { value: '#F08585', label: 'Rojo' },
  { value: '#2F4FCF', label: 'Azul' },
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
  const [weight, setWeight] = useState(5);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local-only enhancements: comments, links, alerts. Persisted only when editing
  // an existing task — these are stored as ad-hoc fields on the task document.
  const [comment, setComment] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertStatus, setAlertStatus] = useState<TaskStatus>('done');

  const isEditMode = !!editingTask;

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setName(editingTask.name);
        setWeight(editingTask.weight || 5);
        setDescription(editingTask.description || '');
        setColor(editingTask.color || null);
      } else {
        setName('');
        setWeight(5);
        setDescription('');
        setColor(null);
      }
      setComment('');
      setLinkTitle('');
      setLinkUrl('');
      setAlertEmail('');
      setAlertStatus('done');
    }
  }, [isOpen, editingTask]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-bento-mute"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-8 pt-7 pb-6">
              <h3 className="text-xs font-bold tracking-[0.18em] uppercase text-bento-ink mb-6">
                {isEditMode ? 'Editar Tarea' : 'Nueva Tarea'}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                {/* Left column */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2">Título</label>
                    <input
                      type="text"
                      placeholder="Título de la tarea"
                      autoFocus
                      required
                      className="w-full px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all font-hand text-2xl text-bento-ink"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2">Descripción</label>
                    <textarea
                      placeholder="Detalles de la tarea..."
                      rows={5}
                      className="w-full px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all resize-none text-sm text-bento-ink"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2">
                        Prioridad: <span className="text-bento-ink">{weight}</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2">Estado</label>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-semibold text-bento-ink min-w-[120px] text-center">
                        {STATUS_LABELS[editingTask?.status || initialStatus]}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2">Color</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {COLOR_OPTIONS.map((opt) => {
                        const isSelected = color === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setColor(isSelected ? null : opt.value)}
                            title={opt.label}
                            className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                              isSelected ? 'ring-2 ring-offset-2 ring-bento-ink scale-110' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: opt.value }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Comentarios
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe un comentario…"
                        className="flex-1 px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled
                        className="w-11 h-11 rounded-xl bg-slate-100 text-bento-mute opacity-60 cursor-not-allowed flex items-center justify-center"
                        title="Próximamente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> Enlaces
                    </label>
                    {linkTitle && linkUrl && (
                      <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-sky-600" />
                        <a
                          href={linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm font-medium text-sky-700 truncate"
                        >
                          {linkTitle}
                        </a>
                        <button type="button" className="p-1 hover:bg-white rounded text-sky-600" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLinkTitle(''); setLinkUrl(''); }}
                          className="p-1 hover:bg-white rounded text-rose-500"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        type="text"
                        placeholder="Título del enlace"
                        className="px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                      <input
                        type="url"
                        placeholder="https://…"
                        className="px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled
                        className="w-11 h-11 rounded-xl bg-sky-100 text-sky-600 opacity-70 cursor-not-allowed flex items-center justify-center"
                        title="Próximamente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Alertas por Email
                    </label>
                    {alertEmail && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-600" />
                        <span className="flex-1 text-sm text-amber-900">
                          <span className="font-semibold">{STATUS_LABELS[alertStatus]}</span>
                          <span className="opacity-70"> → {alertEmail}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAlertEmail('')}
                          className="p-1 hover:bg-white rounded text-rose-500"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div>
                        <p className="text-[10px] text-bento-mute mb-1">Cuando llegue a</p>
                        <select
                          value={alertStatus}
                          onChange={(e) => setAlertStatus(e.target.value as TaskStatus)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        >
                          {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] text-bento-mute mb-1">Avisar a</p>
                        <input
                          type="email"
                          placeholder="email@dominio.com"
                          className="w-full px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                          value={alertEmail}
                          onChange={(e) => setAlertEmail(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        disabled
                        className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 opacity-70 cursor-not-allowed flex items-center justify-center"
                        title="Próximamente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end items-center gap-3 pt-4 mt-2 border-t border-bento-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-bento-ink text-white text-sm font-bold rounded-xl shadow-md hover:bg-black active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
