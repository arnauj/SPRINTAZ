import React, { useState, useEffect, useMemo } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Sprint, SprintStatus, Task, User, Project } from '../types';
import { auth } from '../lib/firebase';
import {
  Plus,
  Trash2,
  Pencil,
  Users as UsersIcon,
  ChevronLeft,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SprintStatusEditor from './SprintStatusEditor';
import { colorForStatus, defaultSprintStatuses, flattenStatuses } from '../lib/sprintStatuses';

interface SprintListProps {
  project: Project;
  projects: Project[];
  currentUser: User;
  onSelectSprint: (sprint: Sprint) => void;
  onChangeProject: () => void;
}

export default function SprintList({
  project,
  projects,
  currentUser,
  onSelectSprint,
  onChangeProject,
}: SprintListProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintStatuses, setNewSprintStatuses] = useState<SprintStatus[]>(defaultSprintStatuses());
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editName, setEditName] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editStatuses, setEditStatuses] = useState<SprintStatus[]>(defaultSprintStatuses());
  const [tasksBySprintId, setTasksBySprintId] = useState<Record<string, Task[]>>({});

  const userTeams = useMemo(
    () =>
      currentUser.teams && currentUser.teams.length > 0
        ? currentUser.teams
        : [currentUser.name],
    [currentUser]
  );

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeSprints(project.id, setSprints);
    return () => unsubscribe();
  }, [project.id]);

  const isOwnerEmail =
    auth.currentUser?.email?.toLowerCase() === 'juanrael@gmail.com';
  const isAdmin = currentUser.role === 'Admin' || isOwnerEmail;
  const canManageSprints = isAdmin || currentUser.role === 'Teacher';

  const availableProjects = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter((p) => p.team && userTeams.includes(p.team));
  }, [projects, userTeams, isAdmin]);

  useEffect(() => {
    if (sprints.length === 0) {
      setTasksBySprintId({});
      return;
    }

    const sprintIds = sprints.map((sprint) => sprint.id);
    setTasksBySprintId((prev) => {
      const next: Record<string, Task[]> = {};
      sprintIds.forEach((id: string) => {
        next[id] = prev[id] || [];
      });
      return next;
    });

    const unsubscribes = sprints.map((sprint) =>
      firebaseService.subscribeTasks(sprint.id, (tasks) => {
        setTasksBySprintId((prev) => ({
          ...prev,
          [sprint.id]: tasks,
        }));
      })
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [sprints]);

  const handleOpenCreate = () => {
    setNewSprintName('');
    setNewSprintStatuses(defaultSprintStatuses());
    setShowCreateModal(true);
  };

  const sanitizeStatuses = (statuses: SprintStatus[]): SprintStatus[] => {
    return statuses
      .filter(s => s.name && s.name.trim().length > 0)
      .map((s, i) => ({
        id: s.id,
        name: s.name.trim(),
        color: s.color || 'slate',
        order: i,
        ...(s.substatus && s.substatus.length > 0
          ? {
              substatus: s.substatus
                .filter(sub => sub.name && sub.name.trim().length > 0)
                .map((sub, j) => ({
                  id: sub.id,
                  name: sub.name.trim(),
                  color: sub.color || s.color || 'slate',
                  order: j,
                })),
            }
          : {}),
      }));
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;

    const statuses = sanitizeStatuses(newSprintStatuses);
    if (statuses.length === 0) return;

    await firebaseService.createSprint({
      name: newSprintName.trim(),
      projectId: project.id,
      isActive: true,
      statuses,
      createdBy: auth.currentUser?.uid || '',
    });

    setNewSprintName('');
    setNewSprintStatuses(defaultSprintStatuses());
    setShowCreateModal(false);
  };

  const startEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setEditName(sprint.name);
    setEditProjectId(sprint.projectId);
    setEditStatuses(
      sprint.statuses && sprint.statuses.length > 0
        ? sprint.statuses
        : defaultSprintStatuses()
    );
  };

  const cancelEditSprint = () => {
    setEditingSprint(null);
    setEditName('');
    setEditProjectId('');
    setEditStatuses(defaultSprintStatuses());
  };

  const handleSaveEditSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSprint || !editName.trim() || !editProjectId) return;

    const statuses = sanitizeStatuses(editStatuses);
    if (statuses.length === 0) return;

    await firebaseService.updateSprint(editingSprint.id, {
      name: editName.trim(),
      projectId: editProjectId,
      statuses,
    });

    cancelEditSprint();
  };

  const handleDeleteSprint = async (sprint: Sprint) => {
    if (
      !confirm(
        `¿Eliminar el sprint "${sprint.name}"? Las tareas asociadas quedarán huérfanas.`
      )
    )
      return;
    await firebaseService.deleteSprint(sprint.id);
  };

  return (
    <div className="h-full bg-white/70 border border-bento-border flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-5 md:mb-6 gap-3 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onChangeProject}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-bento-mute hover:text-bento-ink transition-colors cursor-pointer shrink-0"
            aria-label="Cambiar proyecto"
            title="Cambiar proyecto"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Layers className="w-6 h-6 md:w-7 md:h-7 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-bold text-bento-mute tracking-widest">
              Proyecto{project.team ? ` · ${project.team}` : ''}
            </p>
            <h2 className="text-lg md:text-2xl font-bold text-bento-ink truncate leading-tight">
              {project.name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onChangeProject}
            className="hidden md:inline-flex px-3 py-2 text-xs font-semibold uppercase tracking-wider text-bento-mute hover:text-bento-ink border border-bento-border hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            Cambiar proyecto
          </button>
          {canManageSprints && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-bento-ink text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Sprint</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-xs font-bold uppercase text-bento-mute tracking-widest">
          Sprints del proyecto
        </h3>
        <span className="text-[10px] uppercase font-bold text-bento-mute tracking-widest">
          {sprints.length} {sprints.length === 1 ? 'sprint' : 'sprints'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        {sprints.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-bento-mute gap-3 text-center py-12">
            <UsersIcon className="w-12 h-12 text-amber-300" />
            <p className="text-base font-semibold text-bento-ink/70">
              Aún no hay sprints en este proyecto.
            </p>
            {canManageSprints && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-bento-ink text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Crear primer sprint
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {sprints.map((sprint) => (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectSprint(sprint)}
                className="group p-4 md:p-5 bg-white border-2 border-bento-border hover:border-amber-400 hover:bg-amber-50/30 transition-all rounded-xl cursor-pointer relative"
              >
                <div className={`flex items-start gap-2 mb-3 min-w-0 ${canManageSprints ? 'pr-20' : ''}`}>
                  {sprint.isActive && (
                    <span className="mt-0.5 text-[9px] bg-emerald-400 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter shrink-0">
                      Activo
                    </span>
                  )}
                  <h3 className="font-bold text-bento-ink text-base md:text-lg leading-tight break-words min-w-0">
                    {sprint.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {flattenStatuses(sprint.statuses && sprint.statuses.length > 0 ? sprint.statuses : defaultSprintStatuses()).map(status => {
                    const palette = colorForStatus(status.color);
                    const count = (tasksBySprintId[sprint.id] || []).filter(task => task.status === status.id).length;
                    return (
                      <span
                        key={status.id}
                        className="inline-flex items-center gap-1.5 max-w-full rounded-full border px-2 py-1 text-[10px] font-bold leading-none"
                        style={{
                          backgroundColor: palette.tintSoft,
                          borderColor: palette.tint,
                          color: palette.ink,
                        }}
                        title={`${status.name}: ${count} tareas`}
                      >
                        <span className="truncate">{status.name}</span>
                        <span
                          className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] text-white"
                          style={{ backgroundColor: palette.countDot }}
                        >
                          {count}
                        </span>
                      </span>
                    );
                  })}
                </div>
                {canManageSprints && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditSprint(sprint);
                      }}
                      className="p-2 md:p-1.5 bg-white/90 border border-bento-border md:border-transparent hover:bg-amber-100 rounded text-bento-mute hover:text-amber-700 transition-colors cursor-pointer"
                      title="Editar sprint"
                      aria-label="Editar sprint"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSprint(sprint);
                      }}
                      className="p-2 md:p-1.5 bg-white/90 border border-bento-border md:border-transparent hover:bg-rose-100 rounded text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
                      title="Eliminar sprint"
                      aria-label="Eliminar sprint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
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
              className="bg-white border border-bento-border p-6 w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-lg font-bold mb-4 text-bento-ink">
                Nuevo Sprint
              </h3>
              <p className="text-xs text-bento-mute mb-4 -mt-2">
                en proyecto <span className="font-semibold text-bento-ink">{project.name}</span>
                {project.team && (
                  <> · equipo <span className="font-semibold text-bento-ink">{project.team}</span></>
                )}
              </p>
              <form onSubmit={handleCreateSprint} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Nombre del sprint
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Evaluación 1 - Micro"
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink"
                    value={newSprintName}
                    onChange={(e) => setNewSprintName(e.target.value)}
                  />
                </div>
                <SprintStatusEditor
                  value={newSprintStatuses}
                  onChange={setNewSprintStatuses}
                />
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
                    Crear sprint
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingSprint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border border-bento-border p-6 w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-lg font-bold mb-4 text-bento-ink">
                Editar Sprint
              </h3>
              <form onSubmit={handleSaveEditSprint} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Nombre del sprint
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ej: Evaluación 1 - Micro"
                    className="w-full px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-bento-mute uppercase mb-1.5 tracking-widest">
                    Proyecto
                  </label>
                  <div className="relative">
                    <FolderOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bento-mute pointer-events-none" />
                    <select
                      required
                      value={editProjectId}
                      onChange={(e) => setEditProjectId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink appearance-none cursor-pointer"
                    >
                      {availableProjects.length === 0 && (
                        <option value="" disabled>
                          No hay proyectos disponibles
                        </option>
                      )}
                      {availableProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.team ? ` · ${p.team}` : ''}
                        </option>
                      ))}
                      {/* Keep current value visible even if it's not in availableProjects */}
                      {!availableProjects.some((p) => p.id === editProjectId) && editProjectId && (
                        <option value={editProjectId}>{`(actual)`}</option>
                      )}
                    </select>
                  </div>
                  <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">
                    Cambiar el proyecto traslada el sprint al equipo del nuevo proyecto.
                  </p>
                </div>
                <SprintStatusEditor
                  value={editStatuses}
                  onChange={setEditStatuses}
                />
                <div className="flex gap-3 pt-3 border-t border-bento-border">
                  <button
                    type="button"
                    onClick={cancelEditSprint}
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
