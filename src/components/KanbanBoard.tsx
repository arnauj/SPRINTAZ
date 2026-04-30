import { useState, useEffect, type DragEvent } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, Sprint, User, TaskStatus } from '../types';
import { Plus, MoreHorizontal, CheckCircle2, Clock, Inbox, PlayCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CreateTaskModal from './CreateTaskModal';

interface KanbanBoardProps {
  sprint: Sprint;
  currentUser: User;
  users: User[];
}

interface ColumnConfig {
  id: TaskStatus;
  label: string;
  icon: any;
  bgClass: string;
  borderClass: string;
  headerBg: string;
  headerText: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    label: 'Reserva',
    icon: Inbox,
    bgClass: 'bg-slate-500/[0.06]',
    borderClass: 'border-slate-500/20',
    headerBg: 'bg-slate-500/15',
    headerText: 'text-slate-300',
    cardBg: 'bg-slate-800/40',
    cardBorder: 'border-slate-600/30',
    accentText: 'text-slate-400',
  },
  {
    id: 'todo',
    label: 'Por hacer',
    icon: Clock,
    bgClass: 'bg-amber-500/[0.08]',
    borderClass: 'border-amber-500/25',
    headerBg: 'bg-amber-500/20',
    headerText: 'text-amber-200',
    cardBg: 'bg-amber-500/10',
    cardBorder: 'border-amber-500/20',
    accentText: 'text-amber-300',
  },
  {
    id: 'in_progress',
    label: 'En curso',
    icon: PlayCircle,
    bgClass: 'bg-indigo-500/[0.08]',
    borderClass: 'border-indigo-500/25',
    headerBg: 'bg-indigo-500/20',
    headerText: 'text-indigo-200',
    cardBg: 'bg-indigo-500/10',
    cardBorder: 'border-indigo-500/30',
    accentText: 'text-indigo-300',
  },
  {
    id: 'done',
    label: 'Hecho',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-500/[0.06]',
    borderClass: 'border-emerald-500/20',
    headerBg: 'bg-emerald-500/20',
    headerText: 'text-emerald-200',
    cardBg: 'bg-emerald-500/[0.07]',
    cardBorder: 'border-emerald-500/20',
    accentText: 'text-emerald-300',
  },
];

export default function KanbanBoard({ sprint, currentUser, users }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus>('todo');

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

    // Notify creator
    if (task.createdBy !== currentUser.uid) {
      await firebaseService.createNotification(task.createdBy, message);
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

  const canDelete = (task: Task) => {
    return currentUser.role === 'Teacher' || task.createdBy === currentUser.uid;
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between mb-8 px-2">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Tablero Kanban</h3>
          <p className="text-sm text-slate-500">Gestión de tareas en tiempo real.</p>
        </div>
        <button
          onClick={() => {
            setPendingStatus('todo');
            setShowCreateModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </header>

      <div className="flex-1 grid grid-cols-4 gap-4 h-full min-h-0">
        {COLUMNS.map((column) => {
          const Icon = column.icon;
          const count = getTasksByStatus(column.id).length;
          return (
            <div
              key={column.id}
              className={`flex flex-col min-h-0 rounded-2xl border ${column.borderClass} ${column.bgClass} backdrop-blur-sm overflow-hidden`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`${column.headerBg} px-4 py-3 border-b ${column.borderClass} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${column.headerText}`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${column.headerText}`}>
                    {column.label}
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/20 ${column.headerText}`}>
                  {count}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto custom-scrollbar">
                <AnimatePresence initial={false}>
                  {getTasksByStatus(column.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      column={column}
                      canDelete={canDelete(task)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onDelete={() => handleDelete(task)}
                    />
                  ))}
                </AnimatePresence>
                {count === 0 && (
                  <div className={`text-center py-8 text-xs italic ${column.accentText} opacity-50`}>
                    Sin tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateTaskModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        sprintId={sprint.id}
        initialStatus={pendingStatus}
        currentUser={currentUser}
      />
    </div>
  );
}

interface TaskCardProps {
  key?: any;
  task: Task;
  users: User[];
  column: ColumnConfig;
  canDelete: boolean;
  onDragStart: (e: DragEvent) => void;
  onStatusChange: (status: TaskStatus) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

function TaskCard({ task, users, column, canDelete, onDragStart, onStatusChange, onDelete }: TaskCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const assignedUser = users.find(u => u.uid === task.assignedTo);
  const finishedByUser = users.find(u => u.uid === task.finishedBy);

  const isDoing = task.status === 'in_progress';
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`p-3 rounded-xl border transition-all group relative cursor-move shadow-sm hover:shadow-md ${column.cardBg} ${column.cardBorder} hover:border-opacity-60`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h5 className={`font-semibold text-sm leading-snug text-slate-100 ${isDone ? 'line-through opacity-60' : ''}`}>
          {task.name}
        </h5>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded text-slate-300 transition-all cursor-pointer"
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
                  className="absolute right-0 top-8 w-36 bg-bento-card border border-bento-border rounded-xl shadow-2xl z-20 overflow-hidden"
                >
                  {COLUMNS.filter(c => c.id !== task.status).map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        onStatusChange(col.id);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 border-b border-bento-border cursor-pointer"
                    >
                      → {col.label}
                    </button>
                  ))}
                  {canDelete && (
                    <button
                      onClick={() => {
                        onDelete();
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-red-400 hover:text-white hover:bg-red-600/80 cursor-pointer flex items-center gap-2"
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
        <p className="text-xs text-slate-300/70 mb-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className={`mt-3 pt-2 border-t ${column.cardBorder} flex items-center justify-between gap-2`}>
        {isDoing && assignedUser ? (
          <>
            <span className={`text-[9px] uppercase font-bold tracking-wide ${column.accentText}`}>
              Hace: {assignedUser.name}
            </span>
            <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
              {assignedUser.name[0]}
            </div>
          </>
        ) : isDone && finishedByUser ? (
          <>
            <span className={`text-[9px] uppercase font-bold tracking-wide ${column.accentText}`}>
              Hecho por: {finishedByUser.name}
            </span>
            <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
              {finishedByUser.name[0]}
            </div>
          </>
        ) : (
          <>
            <span className={`text-[10px] font-mono uppercase tracking-tight ${column.accentText} opacity-80`}>
              {task.weight} PTS
            </span>
            <div className={`h-1.5 w-1.5 rounded-full ${column.accentText} opacity-50`}></div>
          </>
        )}
      </div>
    </motion.div>
  );
}
