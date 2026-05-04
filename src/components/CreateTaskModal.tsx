import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, TaskStatus, User, TaskComment, TaskLink, TaskEmailAlert } from '../types';
import { X, Bell, Link as LinkIcon, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatusOption {
  id: TaskStatus;
  name: string;
}

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: '#A8E6C9', label: 'Verde' },
  { value: '#FBE89D', label: 'Amarillo' },
  { value: '#F7CD7A', label: 'Ámbar' },
  { value: '#FBB380', label: 'Naranja' },
  { value: '#F7B6BC', label: 'Rosa' },
  { value: '#F08585', label: 'Rojo' },
  { value: '#2F4FCF', label: 'Azul' },
];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function genId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string;
  initialStatus: TaskStatus;
  currentUser: User;
  users: User[];
  editingTask?: Task | null;
  statusOptions: StatusOption[];
}

export default function CreateTaskModal({ isOpen, onClose, sprintId, initialStatus, currentUser, users, editingTask, statusOptions }: CreateTaskModalProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(5);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');

  const [links, setLinks] = useState<TaskLink[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [emailAlerts, setEmailAlerts] = useState<TaskEmailAlert[]>([]);
  const [alertUserId, setAlertUserId] = useState('');
  const [alertStatus, setAlertStatus] = useState<TaskStatus>('done');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(initialStatus);

  const isEditMode = !!editingTask;

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setName(editingTask.name);
        setWeight(editingTask.weight || 5);
        setDescription(editingTask.description || '');
        setColor(editingTask.color || null);
        setComments(editingTask.comments || []);
        setLinks(editingTask.links || []);
        setEmailAlerts(editingTask.emailAlerts || []);
        setTaskStatus(editingTask.status || initialStatus);
      } else {
        setName('');
        setWeight(5);
        setDescription('');
        setColor(null);
        setComments([]);
        setLinks([]);
        setEmailAlerts([]);
        setTaskStatus(initialStatus);
      }
      setNewComment('');
      setLinkTitle('');
      setLinkUrl('');
      setAlertUserId('');
      setAlertStatus('done');
    }
  }, [isOpen, editingTask, initialStatus]);

  const getStatusLabel = (status: TaskStatus) => statusOptions.find(s => s.id === status)?.name || status;

  const addComment = () => {
    const text = newComment.trim();
    if (!text) return;
    setComments(prev => [
      ...prev,
      { id: genId(), text, authorId: currentUser.uid, authorName: currentUser.name, createdAt: Date.now() },
    ]);
    setNewComment('');
  };

  const removeComment = (id: string) => setComments(prev => prev.filter(c => c.id !== id));

  const addLink = () => {
    const t = linkTitle.trim();
    const u = linkUrl.trim();
    if (!t || !u) return;
    const safeUrl = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    setLinks(prev => [...prev, { id: genId(), title: t, url: safeUrl }]);
    setLinkTitle('');
    setLinkUrl('');
  };

  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l.id !== id));

  const addAlert = () => {
    if (!alertUserId) return;
    const user = users.find(u => u.uid === alertUserId);
    if (!user) return;
    setEmailAlerts(prev => [...prev, { id: genId(), status: alertStatus, email: `@${user.uid}` }]);
    setAlertUserId('');
  };

  const removeAlert = (id: string) => setEmailAlerts(prev => prev.filter(a => a.id !== id));

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
          comments,
          links,
          emailAlerts,
          status: taskStatus,
        });
      } else {
        await firebaseService.createTask({
          name,
          description,
          weight,
          status: taskStatus,
          sprintId,
          createdBy: currentUser.uid,
          ...(color ? { color } : {}),
          ...(comments.length ? { comments } : {}),
          ...(links.length ? { links } : {}),
          ...(emailAlerts.length ? { emailAlerts } : {}),
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const customColorActive = color !== null && !COLOR_OPTIONS.some(o => o.value === color);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            className="bg-white w-full max-w-3xl shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-bento-mute z-10"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-4 sm:px-8 pt-7 pb-6">
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
                        Peso: <span className="text-bento-ink">{weight}</span>
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
                      <select
                        value={taskStatus}
                        onChange={(e) => setTaskStatus(e.target.value)}
                        className="px-3 py-2 bg-slate-100 border-2 border-bento-border focus:border-amber-400 rounded-lg text-xs font-semibold text-bento-ink min-w-[120px] text-center"
                      >
                        {statusOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
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
                      <label
                        title="Color personalizado"
                        className={`relative w-7 h-7 rounded-full cursor-pointer transition-all overflow-hidden border-2 border-dashed ${
                          customColorActive ? 'ring-2 ring-offset-2 ring-bento-ink scale-110 border-transparent' : 'border-bento-border hover:scale-110'
                        }`}
                        style={customColorActive ? { backgroundColor: color! } : { background: 'conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)' }}
                      >
                        <input
                          type="color"
                          value={customColorActive ? color! : '#ffffff'}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          aria-label="Elegir color personalizado"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="#hex"
                        value={customColorActive ? color! : ''}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (HEX_RE.test(v)) setColor(v.toLowerCase());
                          else if (v === '') setColor(null);
                          else setColor(v);
                        }}
                        className="w-24 px-2 py-1.5 text-xs font-mono bg-white border border-bento-border focus:border-amber-400 rounded-lg outline-none text-bento-ink"
                      />
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Comentarios {comments.length > 0 && <span className="text-bento-ink">({comments.length})</span>}
                    </label>
                    {comments.length > 0 && (
                      <div className="mb-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                        {comments.map(c => (
                          <div key={c.id} className="bg-slate-50 border border-bento-border rounded-lg px-3 py-2 flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase font-bold tracking-widest text-bento-mute">{c.authorName}</p>
                              <p className="text-sm text-bento-ink break-words">{c.text}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeComment(c.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-500 cursor-pointer shrink-0"
                              title="Quitar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe un comentario…"
                        className="flex-1 min-w-0 px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addComment();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="w-11 h-11 rounded-xl bg-bento-ink text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-all active:scale-95 shrink-0"
                        title="Añadir comentario"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> Enlaces {links.length > 0 && <span className="text-bento-ink">({links.length})</span>}
                    </label>
                    {links.length > 0 && (
                      <div className="mb-2 flex flex-col gap-1.5">
                        {links.map(l => (
                          <div key={l.id} className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-sky-600 shrink-0" />
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm font-medium text-sky-700 truncate hover:underline"
                              title={l.url}
                            >
                              {l.title}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeLink(l.id)}
                              className="p-1 hover:bg-white rounded text-rose-500 cursor-pointer shrink-0"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        type="text"
                        placeholder="Título del enlace"
                        className="col-span-2 sm:col-span-1 min-w-0 px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                      <input
                        type="url"
                        placeholder="https://…"
                        className="min-w-0 px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={addLink}
                        disabled={!linkTitle.trim() || !linkUrl.trim()}
                        className="w-11 h-11 rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-all active:scale-95 shrink-0"
                        title="Añadir enlace"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-bento-mute uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Notificar a {emailAlerts.length > 0 && <span className="text-bento-ink">({emailAlerts.length})</span>}
                    </label>
                    {emailAlerts.length > 0 && (
                      <div className="mb-2 flex flex-col gap-1.5">
                        {emailAlerts.map(a => {
                          const notifyUser = users.find(u => u.uid === a.email.replace('@', ''));
                          return (
                            <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                              <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="flex-1 text-sm text-amber-900 truncate">
                                <span className="font-semibold">{getStatusLabel(a.status)}</span>
                                <span className="opacity-70"> → {notifyUser?.name || a.email}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAlert(a.id)}
                                className="p-1 hover:bg-white rounded text-rose-500 cursor-pointer shrink-0"
                                title="Quitar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <div className="col-span-2 sm:col-span-1 min-w-0">
                        <p className="text-[10px] text-bento-mute mb-1">Cuando llegue a</p>
                        <select
                          value={alertStatus}
                          onChange={(e) => setAlertStatus(e.target.value as TaskStatus)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        >
                          {statusOptions.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-bento-mute mb-1">Notificar a</p>
                        <select
                          value={alertUserId}
                          onChange={(e) => setAlertUserId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-sm text-bento-ink"
                        >
                          <option value="">Selecciona miembro</option>
                          {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addAlert}
                        disabled={!alertUserId}
                        className="w-11 h-11 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-all active:scale-95 shrink-0"
                        title="Añadir notificación"
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
