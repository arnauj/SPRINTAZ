import React, { useState, useEffect, useMemo } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Sprint, UserRole, User } from '../types';
import { auth } from '../lib/firebase';
import { Plus, Trash2, Shield, Users as UsersIcon, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Administrador',
  Teacher: 'Profesor Titular',
  Collaborator: 'Colaborador',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  Admin: { bg: 'bg-red-500 ring-red-500', text: 'text-red-400' },
  Teacher: { bg: 'bg-orange-500 ring-orange-500', text: 'text-orange-400' },
  Collaborator: { bg: 'bg-blue-500 ring-blue-500', text: 'text-blue-400' },
};

interface SprintSidebarProps {
  activeSprint: Sprint | null;
  onSelectSprint: (sprint: Sprint | null) => void;
  currentUser: User;
  users: User[];
}

export default function SprintSidebar({ activeSprint, onSelectSprint, currentUser, users }: SprintSidebarProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintTeam, setNewSprintTeam] = useState('');
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState('');

  const userTeams = useMemo(() => currentUser.teams && currentUser.teams.length > 0 ? currentUser.teams : [currentUser.name], [currentUser]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeSprints(setSprints);
    return () => unsubscribe();
  }, []);

  const isOwnerEmail = auth.currentUser?.email?.toLowerCase() === 'juanrael@gmail.com';
  const isAdmin = currentUser.role === 'Admin' || isOwnerEmail;
  const canManageSprints = isAdmin || currentUser.role === 'Teacher';

  const allTeamsAcrossUsers = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => (u.teams || []).forEach(t => set.add(t)));
    userTeams.forEach(t => set.add(t));
    return Array.from(set).sort();
  }, [users, userTeams]);

  const visibleSprints = useMemo(() => {
    if (isAdmin) return sprints;
    return sprints.filter(s => !s.team || userTeams.includes(s.team));
  }, [sprints, userTeams, isAdmin]);

  const handleOpenCreate = () => {
    setNewSprintName('');
    setNewSprintTeam(userTeams[0] || '');
    setShowCreateModal(true);
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim() || !newSprintTeam.trim()) return;

    await firebaseService.createSprint({
      name: newSprintName.trim(),
      team: newSprintTeam.trim(),
      isActive: true,
      createdBy: auth.currentUser?.uid || '',
    });

    setNewSprintName('');
    setNewSprintTeam('');
    setShowCreateModal(false);
  };

  const startEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setEditName(sprint.name);
    setEditTeam(sprint.team || '');
  };

  const cancelEditSprint = () => {
    setEditingSprint(null);
    setEditName('');
    setEditTeam('');
  };

  const handleSaveEditSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprint || !editName.trim() || !editTeam.trim()) return;

    await firebaseService.updateSprint(editingSprint.id, {
      name: editName.trim(),
      team: editTeam.trim(),
    });

    cancelEditSprint();
  };

  const handleDeleteUser = async (target: User) => {
    if (!confirm(`¿Eliminar al usuario "${target.name}"? Esta acción no se puede deshacer.`)) return;
    await firebaseService.deleteUser(target.uid);
  };

  const handleDeleteSprint = async (sprint: Sprint) => {
    if (!confirm(`¿Eliminar el sprint "${sprint.name}"? Las tareas asociadas quedarán huérfanas.`)) return;
    await firebaseService.deleteSprint(sprint.id);
    if (activeSprint?.id === sprint.id) {
      onSelectSprint(null);
    }
  };

  const handleChangeRole = async (target: User, newRole: UserRole) => {
    if (target.role === newRole) return;
    await firebaseService.updateUserRole(target.uid, newRole);
  };

  return (
    <aside className="w-72 flex flex-col gap-6 shrink-0 h-full">
      {/* Sprints Bento */}
      <div className="bg-bento-card border-2 border-bento-border rounded-2xl p-5 flex flex-col min-h-0 shadow-lg shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest">SPRINTAZ / Sprints</h2>
          {canManageSprints && (
            <button
              onClick={handleOpenCreate}
              className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
          {visibleSprints.length === 0 && (
            <p className="text-[11px] text-slate-500 italic px-1 py-3 text-center">
              {isAdmin ? 'No hay sprints aún.' : 'No hay sprints en tus equipos.'}
            </p>
          )}
          {visibleSprints.map((sprint) => (
            <div
              key={sprint.id}
              onClick={() => onSelectSprint(sprint)}
              className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer group ${
                activeSprint?.id === sprint.id
                  ? 'bg-indigo-500/10 border-indigo-500/40'
                  : 'bg-slate-800/20 border-slate-700/50 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex justify-between items-center mb-1 gap-2">
                <span className={`font-bold text-sm truncate ${activeSprint?.id === sprint.id ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {sprint.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {sprint.isActive && (
                    <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Activo</span>
                  )}
                  {canManageSprints && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditSprint(sprint);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-indigo-500/20 rounded text-slate-500 hover:text-indigo-400 transition-all cursor-pointer"
                        title="Editar sprint"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSprint(sprint);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Eliminar sprint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {sprint.team ? (
                <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                  <UsersIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{sprint.team}</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-600 italic">Sin equipo</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team Bento */}
      <div className="bg-bento-card border-2 border-bento-border rounded-2xl p-5 flex-1 flex flex-col shadow-lg overflow-hidden shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Equipo</h2>
          {isAdmin && (
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-red-400">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar py-3">
          {users
            .filter(u => {
              const uTeams = u.teams && u.teams.length > 0 ? u.teams : [u.name];
              return uTeams.some(t => userTeams.includes(t));
            })
            .map(u => {
            const colors = ROLE_COLORS[u.role] || ROLE_COLORS.Collaborator;
            const isSelf = u.uid === auth.currentUser?.uid;
            return (
              <div key={u.uid} className="flex items-center gap-3 group pl-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-opacity-20 ${colors.bg} text-white`}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    u.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-200 truncate">{u.name}</p>
                  {isAdmin && !isSelf ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                      className={`text-[9px] uppercase font-bold tracking-wider bg-transparent border-none outline-none cursor-pointer ${colors.text} hover:opacity-80`}
                    >
                      <option value="Admin" className="bg-slate-800">Administrador</option>
                      <option value="Teacher" className="bg-slate-800">Profesor Titular</option>
                      <option value="Collaborator" className="bg-slate-800">Colaborador</option>
                    </select>
                  ) : (
                    <p className={`text-[9px] uppercase font-bold tracking-wider ${colors.text}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </p>
                  )}
                </div>
                {isAdmin && !isSelf && (
                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer shrink-0"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bento-card border-2 border-bento-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Nuevo Sprint</h3>
              <form onSubmit={handleCreateSprint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Nombre del Sprint</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Evaluación 1 - Micro"
                    className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded-xl outline-none transition-all text-slate-200"
                    value={newSprintName}
                    onChange={(e) => setNewSprintName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Equipo</label>
                  <input
                    type="text"
                    list="team-suggestions"
                    required
                    placeholder="Ej: 1ºDAW"
                    className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded-xl outline-none transition-all text-slate-200"
                    value={newSprintTeam}
                    onChange={(e) => setNewSprintTeam(e.target.value)}
                  />
                  <datalist id="team-suggestions">
                    {allTeamsAcrossUsers.map(t => <option key={t} value={t} />)}
                  </datalist>
                  <p className="text-[10px] text-slate-500 italic mt-1.5 ml-1">
                    Solo los miembros de este equipo verán el sprint.
                  </p>
                </div>
                <div className="flex gap-3 pt-4 border-t-2 border-slate-800/50">
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

      <AnimatePresence>
        {editingSprint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bento-card border-2 border-bento-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Editar Sprint</h3>
              <form onSubmit={handleSaveEditSprint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Nombre del Sprint</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Evaluación 1 - Micro"
                    className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded-xl outline-none transition-all text-slate-200"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-widest">Equipo</label>
                  <input
                    type="text"
                    list="edit-team-suggestions"
                    required
                    placeholder="Ej: 1ºDAW"
                    className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 focus:bg-slate-900 rounded-xl outline-none transition-all text-slate-200"
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                  />
                  <datalist id="edit-team-suggestions">
                    {allTeamsAcrossUsers.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div className="flex gap-3 pt-4 border-t-2 border-slate-800/50">
                  <button
                    type="button"
                    onClick={cancelEditSprint}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/10 active:scale-95 cursor-pointer"
                  >
                    Guardar
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
