import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Sprint, UserRole, User } from '../types';
import { auth } from '../lib/firebase';
import { Plus, Target, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SprintSidebarProps {
  activeSprint: Sprint | null;
  onSelectSprint: (sprint: Sprint) => void;
  userRole: UserRole;
  users: User[];
}

export default function SprintSidebar({ activeSprint, onSelectSprint, userRole, users }: SprintSidebarProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeSprints(setSprints);
    return () => unsubscribe();
  }, []);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    await firebaseService.createSprint({
      name: newSprintName,
      isActive: true,
      createdBy: auth.currentUser?.uid || '',
    });

    setNewSprintName('');
    setShowCreateModal(false);
  };

  const isTeacher = userRole === 'Teacher' || auth.currentUser?.email?.toLowerCase() === 'juanrael@gmail.com';

  return (
    <aside className="w-72 flex flex-col gap-6 shrink-0 h-full">
      {/* Sprints Bento */}
      <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex flex-col min-h-0 shadow-lg shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest">SPRINTAZ / Sprints</h2>
          {isTeacher && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => onSelectSprint(sprint)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeSprint?.id === sprint.id 
                  ? 'bg-indigo-500/10 border-indigo-500/30' 
                  : 'bg-slate-800/20 border-slate-700/50 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold text-sm ${activeSprint?.id === sprint.id ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {sprint.name}
                </span>
                {sprint.isActive && (
                  <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Activo</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 italic">Creado recientemente</p>
            </button>
          ))}
        </div>
      </div>

      {/* Team Bento */}
      <div className="bg-bento-card border border-bento-border rounded-2xl p-5 flex-1 flex flex-col shadow-lg overflow-hidden shrink-0">
        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">Equipo Docente</h2>
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {users.map(user => (
            <div key={user.uid} className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-opacity-20 ${
                user.role === 'Teacher' ? 'bg-orange-500 ring-orange-500 text-white' : 'bg-blue-500 ring-blue-500 text-white'
              }`}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">{user.name}</p>
                <p className={`text-[9px] uppercase font-bold tracking-wider ${
                  user.role === 'Teacher' ? 'text-orange-400' : 'text-blue-400'
                }`}>
                  {user.role === 'Teacher' ? 'Profesor Titular' : 'Colaborador'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bento-card border border-bento-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Nuevo Sprint</h3>
              <form onSubmit={handleCreateSprint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Nombre del Sprint</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ej: Evaluación 1 - Micro"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded-xl outline-none transition-all text-slate-200"
                    value={newSprintName}
                    onChange={(e) => setNewSprintName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-800/50">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/10 active:scale-95 cursor-pointer"
                  >
                    Crear
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
