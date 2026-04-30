import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, Sprint, User, TaskStatus } from '../types';
import { Plus, MoreHorizontal, User as UserIcon, CheckCircle2, Clock, Inbox, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CreateTaskModal from './CreateTaskModal';

interface KanbanBoardProps {
  sprint: Sprint;
  currentUser: User;
  users: User[];
}

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string; dot: string }[] = [
  { id: 'backlog', label: 'Backlog', icon: Inbox, color: 'text-slate-500', dot: 'bg-slate-500' },
  { id: 'todo', label: 'To Do', icon: Clock, color: 'text-amber-500', dot: 'bg-amber-500' },
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-indigo-500', dot: 'bg-indigo-500' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-500', dot: 'bg-emerald-500' },
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
    let message = `Tarea "${task.name}" movida a ${newStatus}`;

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
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-2 px-2">
              <div className={`h-2 w-2 rounded-full ${column.dot} ${column.id === 'in_progress' ? 'animate-pulse' : ''}`}></div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{column.label}</h3>
              <span className="text-[10px] font-mono text-slate-600 ml-auto">{getTasksByStatus(column.id).length}</span>
            </div>
            
            <div className="bg-bento-card/50 rounded-2xl border border-bento-border p-2 flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              <AnimatePresence initial={false}>
                {getTasksByStatus(column.id).map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users} 
                    onStatusChange={(status) => handleStatusChange(task, status)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
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
  onStatusChange: (status: TaskStatus) => void | Promise<void>;
}

function TaskCard({ task, users, onStatusChange }: TaskCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const assignedUser = users.find(u => u.uid === task.assignedTo);
  const finishedByUser = users.find(u => u.uid === task.finishedBy);

  const isDoing = task.status === 'in_progress';
  const isDone = task.status === 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-3 rounded-xl border transition-all group relative ${
        isDoing 
          ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' 
          : isDone
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-bento-card-hover border-slate-700/50 hover:border-slate-600 shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h5 className={`font-medium text-sm leading-snug ${isDone ? 'text-slate-400 font-normal line-through opacity-70' : 'text-slate-200'}`}>
          {task.name}
        </h5>
        
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded text-slate-500 transition-all cursor-pointer"
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
                  className="absolute right-0 top-8 w-32 bg-bento-card border border-bento-border rounded-xl shadow-2xl z-20 overflow-hidden"
                >
                  {COLUMNS.filter(c => c.id !== task.status).map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        onStatusChange(col.id);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 border-b last:border-0 border-bento-border cursor-pointer"
                    >
                      A {col.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {(isDoing || isDone) ? (
        <div className={`mt-3 pt-2 border-t flex items-center justify-between ${
          isDoing ? 'border-indigo-500/20' : 'border-emerald-500/10'
        }`}>
           <span className={`text-[9px] uppercase font-bold italic tracking-tight ${
             isDoing ? 'text-indigo-400' : 'text-emerald-500 opacity-70'
           }`}>
             {isDoing ? `Doing: ${assignedUser?.name || '...'}` : `Done by: ${finishedByUser?.name || '...'}`}
           </span>
           <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${
             isDoing ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white opacity-60'
           }`}>
             {isDoing ? (assignedUser?.name?.[0] || '?') : (finishedByUser?.name?.[0] || '?')}
           </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{task.weight} PTS</span>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
        </div>
      )}
    </motion.div>
  );
}
