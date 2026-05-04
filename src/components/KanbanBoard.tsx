import { useState, useEffect, useMemo, type DragEvent } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, Sprint, User, TaskStatus, SprintStatus, Project } from '../types';
import { Plus, MoreHorizontal, Calendar, Trash2, Pencil, ArrowLeft, MessageSquare, Link as LinkIcon, Bell, CornerDownRight, Lock, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CreateTaskModal from './CreateTaskModal';
import MoveTaskModal from './MoveTaskModal';
import { flattenStatuses, colorForStatus, defaultSprintStatuses } from '../lib/sprintStatuses';
import { useConfirmDialog } from './ConfirmDialog';

interface KanbanBoardProps {
  sprint: Sprint;
  project: Project;
  currentUser: User;
  users: User[];
  activeTask: Task | null;
  onSetActiveTask: (task: Task | null) => void;
  onBack?: () => void;
}

interface ColumnConfig extends SprintStatus {
  tint: string;
  tintSoft: string;
  ink: string;
  countDot: string;
  parentId?: string;
  parentName?: string;
}

// Legacy palette for the four built-in statuses (matches the original look).
const LEGACY_STATUS_COLORS: Record<string, { tint: string; tintSoft: string; ink: string; countDot: string }> = {
  'backlog':     { tint: 'var(--color-col-backlog)',  tintSoft: 'var(--color-col-backlog-soft)',  ink: '#a64a52', countDot: '#E58997' },
  'todo':        { tint: 'var(--color-col-todo)',     tintSoft: 'var(--color-col-todo-soft)',     ink: '#8a6a18', countDot: '#E5C36A' },
  'in_progress': { tint: 'var(--color-col-doing)',    tintSoft: 'var(--color-col-doing-soft)',    ink: '#3a4292', countDot: '#7E89D8' },
  'done':        { tint: 'var(--color-col-done)',     tintSoft: 'var(--color-col-done-soft)',     ink: '#2f6f4d', countDot: '#62B58A' },
};

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

export default function KanbanBoard({ sprint, project, currentUser, users, activeTask, onSetActiveTask, onBack }: KanbanBoardProps) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus>('todo');
  const [movingTask, setMovingTask] = useState<Task | null>(null);

  const columns = useMemo<ColumnConfig[]>(() => {
    const statuses = sprint.statuses && sprint.statuses.length > 0
      ? sprint.statuses
      : defaultSprintStatuses();

    const parentNameById = new Map<string, string>();
    statuses.forEach(p => parentNameById.set(p.id, p.name));

    const flat = flattenStatuses(statuses);

    return flat.map(status => {
      const legacy = LEGACY_STATUS_COLORS[status.id];
      const palette = colorForStatus(status.color);
      return {
        id: status.id,
        name: status.name,
        color: status.color,
        order: status.order,
        parentId: status.parentId,
        parentName: status.parentId ? parentNameById.get(status.parentId) : undefined,
        tint: legacy?.tint ?? palette.tint,
        tintSoft: legacy?.tintSoft ?? palette.tintSoft,
        ink: legacy?.ink ?? palette.ink,
        countDot: legacy?.countDot ?? palette.countDot,
      };
    });
  }, [sprint.statuses]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeTasks(sprint.id, setTasks);
    return () => unsubscribe();
  }, [sprint.id]);

  const isClosed = !!sprint.isClosed;

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (isClosed) return;
    if (task.status === newStatus) return;

    const updates: Partial<Task> = { status: newStatus };
    const statusConfig = (sprint.statuses || []).find(s => s.id === newStatus);
    const newLabel = statusConfig?.name || newStatus;
    let message = `Tarea "${task.name}" movida a ${newLabel}`;

    if (newStatus === 'in_progress') {
      updates.assignedTo = currentUser.uid;
      message = `🚀 @${currentUser.name} ha comenzado: ${task.name}`;
    } else if (newStatus === 'done') {
      updates.finishedBy = currentUser.uid;
      message = `✅ @${currentUser.name} ha terminado: ${task.name}`;
    }

    await firebaseService.updateTask(task.id, updates);

    const recipients = new Set<string>();
    const projectTeam = project.team;
    if (projectTeam) {
      users.forEach(u => {
        if (u.uid === currentUser.uid) return;
        const uTeams = u.teams && u.teams.length > 0 ? u.teams : [u.name];
        if (uTeams.includes(projectTeam)) recipients.add(u.uid);
      });
    }
    if (task.createdBy && task.createdBy !== currentUser.uid) {
      recipients.add(task.createdBy);
    }
    await Promise.all(
      Array.from(recipients).map(uid => firebaseService.createNotification(uid, message))
    );

    const matchingAlerts = (task.emailAlerts || []).filter(a => a.status === newStatus);
    if (matchingAlerts.length > 0) {
      const notificationMsg = `📌 La tarea "${task.name}" llegó a ${newLabel}`;

      await Promise.all(
        matchingAlerts.map(a => {
          if (a.email.startsWith('@')) {
            const userId = a.email.slice(1);
            return firebaseService.createNotification(userId, notificationMsg);
          } else {
            const subject = `[SPRINTAZ] ${task.name} → ${newLabel}`;
            console.log(`Email alert would be sent to ${a.email} with subject: ${subject}`);
            return Promise.resolve();
          }
        })
      );
    }
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
    if (isClosed) return;
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      await handleStatusChange(task, newStatus);
    }
  };

  const handleDelete = async (task: Task) => {
    if (isClosed) return;
    const confirmed = await confirm({
      title: 'Eliminar tarea',
      message: `¿Eliminar la tarea "${task.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    await firebaseService.deleteTask(task.id);
  };

  const handleEdit = (task: Task) => {
    if (isClosed) return;
    onSetActiveTask(task);
  };

  const canModify = (task: Task) => {
    if (isClosed) return false;
    return currentUser.role === 'Admin' || currentUser.role === 'Teacher' || task.createdBy === currentUser.uid;
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const remaining = daysUntil(sprint.endDate);
  const range = formatRange(sprint.startDate, sprint.endDate);

  return (
    <>
    <div className="h-full flex flex-col">
      <header className="grid grid-cols-[auto_1fr_auto] items-center mb-6 px-2 gap-2">
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
            <span
              className={`w-2.5 h-2.5 rounded-full ${isClosed ? 'bg-slate-400' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}
            />
            <span>{sprint.name}</span>
          </h2>
          {(range || remaining !== null || isClosed) && (
            <div className="mt-1 flex items-center gap-2 justify-center text-xs text-bento-mute flex-wrap">
              {range && <span className="font-medium">{range}</span>}
              {isClosed ? (
                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Cerrado
                </span>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </div>

        <div className="justify-self-end flex items-center gap-2">
          {!isClosed && (
            <button
              onClick={() => {
                setPendingStatus(columns[0]?.id || 'todo');
                setShowCreateModal(true);
              }}
              className="bg-bento-ink hover:bg-black text-white px-3 md:px-4 py-2 text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          )}
          <span className="text-xs md:text-sm font-semibold text-bento-ink/70 px-3 py-2 bg-white/70 border border-bento-border">
            {tasks.length} Tareas
          </span>
        </div>
      </header>

      <div
        className="flex-1 flex md:grid gap-3 md:gap-4 h-full min-h-0 overflow-x-auto snap-x snap-mandatory md:snap-none pb-2 md:pb-0"
        style={{
          gridTemplateColumns:
            columns.length <= 4
              ? `repeat(${columns.length}, minmax(0, 1fr))`
              : `repeat(${columns.length}, minmax(220px, 1fr))`,
        }}
      >
        {columns.map((column) => {
          const count = getTasksByStatus(column.id).length;
          const isSub = !!column.parentId;
          return (
            <div
              key={column.id}
              className={`flex flex-col min-h-0 overflow-hidden shrink-0 w-[85vw] sm:w-[70vw] md:w-auto snap-center ${isSub ? 'md:border-l-2' : ''}`}
              style={{
                backgroundColor: column.tintSoft,
                ...(isSub ? { borderLeftColor: column.countDot } : {}),
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div
                className="relative px-4 md:px-5 py-3 flex flex-col items-center justify-center gap-0.5"
                style={{ backgroundColor: column.tint }}
              >
                {isSub && column.parentName && (
                  <div
                    className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest opacity-70"
                    style={{ color: column.ink }}
                  >
                    <CornerDownRight className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[10rem]">{column.parentName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-bold tracking-tight"
                    style={{ color: column.ink }}
                  >
                    {column.name}
                  </h3>
                  <span
                    className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: column.countDot }}
                  >
                    {count}
                  </span>
                </div>
                {!isClosed && (
                  <button
                    onClick={() => {
                      setPendingStatus(column.id);
                      setShowCreateModal(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/40 transition-colors cursor-pointer"
                    style={{ color: column.ink }}
                    aria-label={`Añadir a ${column.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
                <AnimatePresence initial={false}>
                  {getTasksByStatus(column.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      column={column}
                      columns={columns}
                      canModify={canModify(task)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onDelete={() => handleDelete(task)}
                      onEdit={() => handleEdit(task)}
                      onMoveToSprint={() => setMovingTask(task)}
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
        isOpen={showCreateModal || activeTask !== null}
        onClose={() => {
          setShowCreateModal(false);
          onSetActiveTask(null);
        }}
        sprintId={sprint.id}
        initialStatus={pendingStatus}
        currentUser={currentUser}
        users={users}
        editingTask={activeTask}
        statusOptions={columns.map(({ id, name }) => ({ id, name }))}
      />

      <MoveTaskModal
        isOpen={movingTask !== null}
        onClose={() => setMovingTask(null)}
        task={movingTask}
        currentProject={project}
      />
    </div>
    {confirmDialog}
    </>
  );
}

interface TaskCardProps {
  key?: any;
  task: Task;
  users: User[];
  column: ColumnConfig;
  columns: ColumnConfig[];
  canModify: boolean;
  onDragStart: (e: DragEvent) => void;
  onStatusChange: (status: TaskStatus) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onEdit: () => void;
  onMoveToSprint: () => void;
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TaskCard({ task, users, column, columns, canModify, onDragStart, onStatusChange, onDelete, onEdit, onMoveToSprint }: TaskCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const assignedUser = users.find(u => u.uid === task.assignedTo);
  const finishedByUser = users.find(u => u.uid === task.finishedBy);

  const isDone = task.status === 'done';

  // Use task color if set, otherwise pick a deterministic pastel based on task id
  const noteColor = task.color || NOTE_COLORS[task.id ? task.id.charCodeAt(0) % NOTE_COLORS.length : 0];
  const ink = noteTextColor(noteColor);
  const isDark = ink === '#FFFFFF';
  const noteBg = hexToRgba(noteColor, 0.82);

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

  const commentCount = task.comments?.length || 0;
  const links = task.links || [];
  const alertCount = task.emailAlerts?.length || 0;

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
        backgroundColor: noteBg,
        color: ink,
        zIndex: showOptions ? 50 : 'auto',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
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
        <div className="flex items-center gap-1 shrink-0 relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 transition-all cursor-pointer opacity-70 hover:opacity-100"
            style={{ color: ink }}
            aria-label="Mover a otra columna"
            title="Mover"
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
                  className="absolute right-0 top-7 w-40 bg-white border border-bento-border shadow-xl z-20 overflow-hidden"
                  style={{ color: '#1F2937' }}
                >
                  {columns.filter(c => c.id !== task.status).map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        onStatusChange(col.id);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border-b border-bento-border last:border-b-0 cursor-pointer"
                    >
                      → {col.name}
                    </button>
                  ))}
                  {canModify && (
                    <button
                      onClick={() => {
                        onMoveToSprint();
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-amber-600 hover:bg-amber-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      Mover a Sprint
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

      {links.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {links.slice(0, 3).map(l => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              className="flex items-center gap-1.5 text-[11px] font-medium underline decoration-dotted truncate hover:opacity-100"
              style={{ color: ink, opacity: 0.9 }}
              title={l.url}
            >
              <LinkIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{l.title}</span>
            </a>
          ))}
          {links.length > 3 && (
            <span className="text-[10px] italic" style={{ color: ink, opacity: 0.7 }}>
              + {links.length - 3} más
            </span>
          )}
        </div>
      )}

      <div
        className="mt-3 pt-2 flex items-center justify-between gap-2 border-t"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium min-w-0" style={{ color: ink, opacity: 0.85 }}>
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" />
            {dateStr || `${task.weight} pts`}
          </span>
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0" title={`${commentCount} comentario${commentCount === 1 ? '' : 's'}`}>
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}
          {alertCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0" title={`${alertCount} alerta${alertCount === 1 ? '' : 's'} por email`}>
              <Bell className="w-3 h-3" />
              {alertCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canModify && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                className="p-1 hover:bg-black/10 transition-all cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: ink }}
                aria-label="Editar tarea"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                className="p-1 hover:bg-rose-500/20 transition-all cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: ink }}
                aria-label="Eliminar tarea"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {assignedUser && (
            assignedUser.photoURL ? (
              <img
                src={assignedUser.photoURL}
                alt={assignedUser.name}
                referrerPolicy="no-referrer"
                title={`Asignada: ${assignedUser.name}`}
                className="h-5 w-5 rounded-full object-cover shadow-sm ml-1 border border-white/60"
              />
            ) : (
              <div
                className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold shadow-sm ml-1"
                style={{ backgroundColor: column.countDot }}
                title={`Asignada: ${assignedUser.name}`}
              >
                {assignedUser.name[0]}
              </div>
            )
          )}
          {finishedByUser && !assignedUser && (
            finishedByUser.photoURL ? (
              <img
                src={finishedByUser.photoURL}
                alt={finishedByUser.name}
                referrerPolicy="no-referrer"
                title={`Hecho por: ${finishedByUser.name}`}
                className="h-5 w-5 rounded-full object-cover shadow-sm ml-1 border border-white/60"
              />
            ) : (
              <div
                className="h-5 w-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold shadow-sm bg-emerald-500 ml-1"
                title={`Hecho por: ${finishedByUser.name}`}
              >
                {finishedByUser.name[0]}
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

