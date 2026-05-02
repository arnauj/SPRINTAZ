import { useState, useEffect, type DragEvent } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, Sprint, User, TaskStatus } from '../types';
import { Plus, MoreHorizontal, Calendar, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CreateTaskModal from './CreateTaskModal';

interface KanbanBoardProps {
  sprint: Sprint;
  currentUser: User;
  users: User[];
  onBack?: () => void;
}

interface ColumnConfig {
  id: TaskStatus;
  label: string;
  tint: string;
  tintSoft: string;
  ink: string;
  countDot: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    tint: 'var(--color-col-backlog)',
    tintSoft: 'var(--color-col-backlog-soft)',
    ink: '#a64a52',
    countDot: '#E58997',
  },
  {
    id: 'todo',
    label: 'Aprobadas',
    tint: 'var(--color-col-todo)',
    tintSoft: 'var(--color-col-todo-soft)',
    ink: '#8a6a18',
    countDot: '#E5C36A',
  },
  {
    id: 'in_progress',
    label: 'Doing',
    tint: 'var(--color-col-doing)',
    tintSoft: 'var(--color-col-doing-soft)',
    ink: '#3a4292',
    countDot: '#7E89D8',
  },
  {
    id: 'done',
    label: 'Desplegado',
    tint: 'var(--color-col-done)',
    tintSoft: 'var(--color-col-done-soft)',
    ink: '#2f6f4d',
    countDot: '#62B58A',
  },
];

const NOTE_COLORS = ['#A8E6C9', '#FBE89D', '#F7CD7A', '#FBB380', '#F7B6BC', '#F08585', '#2F4FCF'];

function formatRange(start?: string, end?: string) {
  if (!start && !end) return '';
  const fmt = (s?: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };
  return `${fmt(start)} - ${fmt(end)}`.trim();
}

function daysUntil(end?: string): number | null {
  if (!end) return null;
  const d = new Date(end);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function KanbanBoard({ sprint, currentUser, users, onBack }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus>('todo');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeTasks(sprint.id, setTasks);
    return () => unsubscribe();
  }, [sprint.id]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    const updates: Partial<Task> = { status: newStatus };
    let message = `Tarea "${task.name}" movida a ${COLUMNS.find(c => c.id === newStatus)?.label}`;

    if (newStatus === 'in_progress') {
      updates.assignedTo = currentUser.uid;
      message = `🚀 @${currentUser.name} ha comenzado: ${task.name}`;
    } else if (newStatus === 'done') {
      updates.finishedBy = currentUser.uid;
      message = `✅ @${currentUser.name} ha terminado: ${task.name}`;
    }

    await firebaseService.updateTask(task.id, updates);

    const recipients = new Set<string>();
    if (sprint.team) {
      users.forEach(u => {
        if (u.uid === currentUser.uid) return;
        const uTeams = u.teams && u.teams.length > 0 ? u.teams : [u.name];
        if (uTeams.includes(sprint.team!)) recipients.add(u.uid);
      });
    }
    if (task.createdBy && task.createdBy !== currentUser.uid) {
      recipients.add(task.createdBy);
    }
    await Promise.all(
      Array.from(recipients).map(uid => firebaseService.createNotification(uid, message))
    );
  };

  const handleDragStart = (e: DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      await handleStatusChange(task, newStatus);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`¿Eliminar la tarea "${task.name}"? Esta acción no se puede deshacer.`)) return;
    await firebaseService.deleteTask(task.id);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  const canModify = (task: Task) => {
    return currentUser.role === 'Admin' || currentUser.role === 'Teacher' || task.createdBy === currentUser.uid;
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const remaining = daysUntil(sprint.endDate);
  const range = formatRange(sprint.startDate, sprint.endDate);

  return (
    <div className="h-full flex flex-col">
      <header className="grid grid-cols-3 items-center mb-6 px-2 gap-2">
        <div className="justify-self-start">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-bento-ink/70 hover:text-bento-ink transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sprint</span>
            </button>
          )}
        </div>

        <div className="justify-self-center text-center">
          <h2 className="text-base md:text-xl font-bold text-bento-ink flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>{sprint.name}</span>
          </h2>
          {(range || remaining !== null) && (
            <div className="mt-1 flex items-center gap-2 justify-center text-xs text-bento-mute">
              {range && <span className="font-medium">{range}</span>}
              {remaining !== null && remaining >= 0 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  Faltan {remaining} días
                </span>
              )}
              {remaining !== null && remaining < 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
                  Vencido
                </span>
              )}
            </div>
          )}
        </div>

        <div className="justify-self-end flex items-center gap-2">
          <button
            onClick={() => {
              setPendingStatus('todo');
              setShowCreateModal(true);
            }}
            className="bg-bento-ink hover:bg-black text-white px-3 md:px-4 py-2 text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
          <span className="text-xs md:text-sm font-semibold text-bento-ink/70 px-3 py-2 bg-white/70 border border-bento-border">
            {tasks.length} Tareas
          </span>
        </div>
      </header>

      <div className="flex-1 flex md:grid md:grid-cols-4 gap-3 md:gap-4 h-full min-h-0 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none pb-2 md:pb-0">
        {COLUMNS.map((column) => {
          const count = getTasksByStatus(column.id).length;
          return (
            <div
              key={column.id}
              className="flex flex-col min-h-0 overflow-hidden shrink-0 w-[85vw] sm:w-[70vw] md:w-auto snap-center"
              style={{ backgroundColor: column.tintSoft }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div
                className="relative px-5 py-3 flex items-center justify-center"
                style={{ backgroundColor: column.tint }}
              >
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-bold tracking-tight"
                    style={{ color: column.ink }}
                  >
                    {column.label}
                  </h3>
                  <span
                    className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: column.countDot }}
                  >
                    {count}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPendingStatus(column.id);
                    setShowCreateModal(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/40 transition-colors cursor-pointer"
                  style={{ color: column.ink }}
                  aria-label={`Añadir a ${column.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
                <AnimatePresence initial={false}>
                  {getTasksByStatus(column.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      column={column}
                      canModify={canModify(task)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onDelete={() => handleDelete(task)}
                      onEdit={() => handleEdit(task)}
                    />
                  ))}
                </AnimatePresence>
                {count === 0 && (
                  <div className="text-center py-10 text-xs italic text-bento-ink/30">
                    Sin tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateTaskModal
        isOpen={showCreateModal || editingTask !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
        }}
        sprintId={sprint.id}
        initialStatus={pendingStatus}
        currentUser={currentUser}
        editingTask={editingTask}
      />
    </div>
  );
}

interface TaskCardProps {
  key?: any;
  task: Task;
  users: User[];
  column: ColumnConfig;
  canModify: boolean;
  onDragStart: (e: DragEvent) => void;
  onStatusChange: (status: TaskStatus) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onEdit: () => void;
}

function noteTextColor(bg: string): string {
  // Simple luminance check
  const hex = bg.replace('#', '');
  if (hex.length !== 6) return '#1F2937';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1F2937' : '#FFFFFF';
}

function TaskCard({ task, users, column, canModify, onDragStart, onStatusChange, onDelete, onEdit }: TaskCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const assignedUser = users.find(u => u.uid === task.assignedTo);
  const finishedByUser = users.find(u => u.uid === task.finishedBy);

  const isDone = task.status === 'done';

  // Use task color if set, otherwise pick a deterministic pastel based on task id
  const noteColor = task.color || NOTE_COLORS[task.id ? task.id.charCodeAt(0) % NOTE_COLORS.length : 0];
  const ink = noteTextColor(noteColor);
  const isDark = ink === '#FFFFFF';

  // Deterministic slight rotation per card for the realistic postit feel
  const rotation = (() => {
    if (!task.id) return 0;
    let hash = 0;
    for (let i = 0; i < task.id.length; i++) {
      hash = (hash * 31 + task.id.charCodeAt(i)) | 0;
    }
    return (((Math.abs(hash) % 11) - 5) * 0.6);
  })();

  const dateStr = task.createdAt?.toDate
    ? (() => {
        const d = task.createdAt.toDate();
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      })()
    : '';

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      initial={{ opacity: 0, y: 10, rotate: rotation }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, rotate: 0 }}
      style={{
        backgroundColor: noteColor,
        color: ink,
        zIndex: showOptions ? 50 : 'auto',
      }}
      className="sticky-note cursor-move group p-4 pt-5"
    >
      <span className="note-tape" />

      <div className="flex items-start gap-2 mb-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
            borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.08)',
          }}
          title={`Peso ${task.weight}`}
        >
          {task.weight}
        </div>
        <h5
          className={`flex-1 min-w-0 font-bold text-sm leading-snug pt-0.5 ${isDone ? 'line-through opacity-70' : ''}`}
          style={{ color: ink }}
        >
          {task.name}
        </h5>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100"
            style={{ color: ink }}
            aria-label="Opciones de tarea"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showOptions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-3 top-10 w-40 bg-white border border-bento-border shadow-xl z-20 overflow-hidden"
                  style={{ color: '#1F2937' }}
                >
                  {canModify && (
                    <button
                      onClick={() => {
                        onEdit();
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border-b border-bento-border cursor-pointer flex items-center gap-2"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                  {COLUMNS.filter(c => c.id !== task.status).map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        onStatusChange(col.id);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border-b border-bento-border cursor-pointer"
                    >
                      → {col.label}
                    </button>
                  ))}
                  {canModify && (
                    <button
                      onClick={() => {
                        onDelete();
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {task.description && (
        <p
          className="text-[11px] mt-1.5 line-clamp-2 leading-relaxed"
          style={{ color: ink, opacity: 0.75 }}
        >
          {task.description}
        </p>
      )}

      <div
        className="mt-3 pt-2 flex items-center justify-between gap-2 border-t"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: ink, opacity: 0.85 }}>
          <Calendar className="w-3 h-3" />
          {dateStr || `${task.weight} pts`}
        </div>

        <div className="flex items-center gap-2">
          {assignedUser && (
            <div
              className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold shadow-sm"
              style={{ backgroundColor: column.countDot }}
              title={`Asignada: ${assignedUser.name}`}
            >
              {assignedUser.name[0]}
            </div>
          )}
          {finishedByUser && !assignedUser && (
            <div
              className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold shadow-sm bg-emerald-500"
              title={`Hecho por: ${finishedByUser.name}`}
            >
              {finishedByUser.name[0]}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

