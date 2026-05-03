import React, { useState, useEffect, useMemo } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Project, User } from '../types';
import { auth } from '../lib/firebase';
import { Plus, FolderOpen, Folder, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectSelectorProps {
  currentUser: User;
  users: User[];
  onSelectProject: (project: Project) => void;
}

export default function ProjectSelector({ currentUser, users, onSelectProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectTeam, setNewProjectTeam] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTeam, setEditTeam] = useState('');

  const isOwnerEmail = auth.currentUser?.email?.toLowerCase() === 'juanrael@gmail.com';
  const isAdmin = currentUser.role === 'Admin' || isOwnerEmail;
  const canManageProjects = isAdmin || currentUser.role === 'Teacher';

  const userTeams = useMemo(
    () =>
      currentUser.teams && currentUser.teams.length > 0
        ? currentUser.teams
        : [currentUser.name],
    [currentUser]
  );

  const allTeamsAcrossUsers = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => (u.teams || []).forEach((t) => set.add(t)));
    userTeams.forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [users, userTeams]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeProjects(setProjects);
    return () => unsubscribe();
  }, []);

  const visibleProjects = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter((p) => p.team && userTeams.includes(p.team));
  }, [projects, userTeams, isAdmin]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectTeam.trim()) return;

    await firebaseService.createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      team: newProjectTeam.trim(),
      createdBy: auth.currentUser?.uid || '',
    });

    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectTeam('');
    setShowCreateModal(false);
  };

  const handleOpenCreate = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectTeam(userTeams[0] || '');
    setShowCreateModal(true);
  };

  const startEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditTeam(project.team || '');
  };

  const cancelEditProject = () => {
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
    setEditTeam('');
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim() || !editTeam.trim()) return;

    await firebaseService.updateProject(editingProject.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      team: editTeam.trim(),
    });

    cancelEditProject();
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      !confirm(
        `¿Eliminar el proyecto "${project.name}"? Los sprints asociados quedarán huérfanos.`
      )
    )
      return;
    await firebaseService.deleteProject(project.id);
  };

  const canEditProject = (project: Project) =>
    isAdmin || project.createdBy === auth.currentUser?.uid;

  const renderTeamPicker = (value: string, onChange: (team: string) => void, idSuffix: string) => (
    <>
      <input
        type="text"
        list={`project-team-suggestions-${idSuffix}`}
        required
        placeholder="Escribe un equipo nuevo o elige uno existente"
        className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={`project-team-suggestions-${idSuffix}`}>
        {allTeamsAcrossUsers.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {allTeamsAcrossUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {allTeamsAcrossUsers.map((t) => {
            const selected = value === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange(t)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-amber-400 border-amber-400 text-bento-ink'
                    : 'bg-white border-bento-border text-bento-mute hover:border-amber-400 hover:text-bento-ink'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">
        Solo los miembros de este equipo verán el proyecto y sus sprints.
      </p>
    </>
  );

  return (
    <div className="h-full bg-white/70 border border-bento-border flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <FolderOpen className="w-12 h-12 md:w-16 md:h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-bento-ink mb-2">
            Selecciona un Proyecto
          </h2>
          <p className="text-bento-mute">
            {isAdmin
              ? 'Comienza seleccionando un proyecto existente o crea uno nuevo'
              : 'Estos son los proyectos de tus equipos'}
          </p>
        </motion.div>

        {visibleProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {visibleProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                <button
                  onClick={() => onSelectProject(project)}
                  className="w-full p-5 bg-white border-2 border-bento-border hover:border-amber-400 hover:bg-amber-50/30 transition-all text-left rounded-xl cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <Folder className="w-6 h-6 text-amber-500 shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1 pr-16">
                      <h3 className="font-bold text-bento-ink truncate text-lg">
                        {project.name}
                      </h3>
                      {project.team ? (
                        <p className="text-xs text-bento-mute flex items-center gap-1 truncate min-w-0 mt-1">
                          <UsersIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{project.team}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-bento-mute italic mt-1">Sin equipo</p>
                      )}
                      {project.description && (
                        <p className="text-sm text-bento-mute line-clamp-2 mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                {canManageProjects && canEditProject(project) && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditProject(project);
                      }}
                      className="p-2 md:p-1.5 bg-white/90 border border-bento-border md:border-transparent hover:bg-amber-100 rounded text-bento-mute hover:text-amber-700 transition-colors cursor-pointer"
                      title="Editar proyecto"
                      aria-label="Editar proyecto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                      className="p-2 md:p-1.5 bg-white/90 border border-bento-border md:border-transparent hover:bg-rose-100 rounded text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar proyecto"
                      aria-label="Eliminar proyecto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          !canManageProjects && (
            <div className="text-center text-bento-mute py-8">
              <p className="text-base font-semibold text-bento-ink/70">
                No hay proyectos para tus equipos.
              </p>
              <p className="text-sm mt-1">
                Pide a un profesor que cree un proyecto para tu equipo.
              </p>
            </div>
          )
        )}

        {canManageProjects && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-6 py-3 bg-bento-ink text-white font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Nuevo Proyecto
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border border-bento-border p-6 w-full max-w-sm shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-lg font-bold mb-4 text-bento-ink">Crear Proyecto</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Desarrollo Web 2024"
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Equipo
                  </label>
                  {renderTeamPicker(newProjectTeam, setNewProjectTeam, 'create')}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    placeholder="Describe brevemente el proyecto..."
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink resize-none h-20"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-3 border-t border-bento-border">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-bold bg-bento-ink text-white hover:bg-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
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
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border border-bento-border p-6 w-full max-w-sm shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-lg font-bold mb-4 text-bento-ink">Editar Proyecto</h3>
              <form onSubmit={handleSaveEditProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Desarrollo Web 2024"
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Equipo
                  </label>
                  {renderTeamPicker(editTeam, setEditTeam, 'edit')}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    placeholder="Describe brevemente el proyecto..."
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink resize-none h-20"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-3 border-t border-bento-border">
                  <button
                    type="button"
                    onClick={cancelEditProject}
                    className="flex-1 px-4 py-2 text-sm font-medium text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-bold bg-bento-ink text-white hover:bg-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
