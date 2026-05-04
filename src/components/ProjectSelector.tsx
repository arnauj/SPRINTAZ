import React, { useState, useEffect, useMemo, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Project, Sprint, SprintState, Task, User } from '../types';
import { auth } from '../lib/firebase';
import { Download, Plus, FolderOpen, Folder, Pencil, Trash2, Upload, Users as UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProjectSprintStateEditor from './ProjectSprintStateEditor';
import { defaultProjectSprintStates, defaultSprintStatuses } from '../lib/sprintStatuses';
import { useConfirmDialog } from './ConfirmDialog';

interface ProjectSelectorProps {
  currentUser: User;
  users: User[];
  onSelectProject: (project: Project) => void;
}

interface ProjectExportSprint {
  sprint: Sprint;
  tasks: Task[];
}

interface ProjectExportData {
  version: 1;
  exportedAt: string;
  project: Project;
  sprints: ProjectExportSprint[];
}

export default function ProjectSelector({ currentUser, users, onSelectProject }: ProjectSelectorProps) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ title: string; message: string } | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectTeam, setNewProjectTeam] = useState('');
  const [newSprintStates, setNewSprintStates] = useState<SprintState[]>(() => defaultProjectSprintStates());
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editSprintStates, setEditSprintStates] = useState<SprintState[]>(() => defaultProjectSprintStates());

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

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeAllSprints(setSprints);
    return () => unsubscribe();
  }, []);

  const sprintCountsByProject = useMemo(() => {
    return sprints.reduce<Record<string, number>>((counts, sprint) => {
      if (!sprint.projectId) return counts;
      counts[sprint.projectId] = (counts[sprint.projectId] || 0) + 1;
      return counts;
    }, {});
  }, [sprints]);

  const sanitizeSprintStates = (states: Project['sprintStates']) => {
    const sanitized = (states || [])
      .filter(state => state.name && state.name.trim().length > 0)
      .map((state, order) => ({
        id: state.id,
        name: state.name.trim(),
        color: state.color || 'slate',
        order,
      }));
    return sanitized.length > 0 ? sanitized : defaultProjectSprintStates();
  };

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
      sprintStates: sanitizeSprintStates(newSprintStates),
      createdBy: auth.currentUser?.uid || '',
    });

    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectTeam('');
    setNewSprintStates(defaultProjectSprintStates());
    setShowCreateModal(false);
  };

  const handleOpenCreate = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectTeam(userTeams[0] || '');
    setNewSprintStates(defaultProjectSprintStates());
    setShowCreateModal(true);
  };

  const startEditProject = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditTeam(project.team || '');
    setEditSprintStates(
      project.sprintStates && project.sprintStates.length > 0
        ? project.sprintStates
        : defaultProjectSprintStates()
    );
  };

  const cancelEditProject = () => {
    setEditingProject(null);
    setEditName('');
    setEditDescription('');
    setEditTeam('');
    setEditSprintStates(defaultProjectSprintStates());
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim() || !editTeam.trim()) return;

    await firebaseService.updateProject(editingProject.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      team: editTeam.trim(),
      sprintStates: sanitizeSprintStates(editSprintStates),
    });

    cancelEditProject();
  };

  const handleDeleteProject = async (project: Project) => {
    const confirmed = await confirm({
      title: 'Eliminar proyecto',
      message: `¿Eliminar el proyecto "${project.name}"? Los sprints asociados quedarán huérfanos.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    await firebaseService.deleteProject(project.id);
  };

  const canEditProject = (project: Project) =>
    isAdmin || project.createdBy === auth.currentUser?.uid;

  const downloadJson = (filename: string, data: ProjectExportData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeFilename = (name: string) =>
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'proyecto';

  const handleExportProject = async (project: Project) => {
    const projectSprints = await firebaseService.getSprintsByProject(project.id);
    const exportedSprints = await Promise.all(
      projectSprints.map(async (sprint) => ({
        sprint,
        tasks: await firebaseService.getTasksBySprint(sprint.id),
      }))
    );

    downloadJson(`${safeFilename(project.name)}.sprintaz.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      sprints: exportedSprints,
    });
  };

  const sanitizeImportedProject = (project: Partial<Project>) => ({
    name: `${project.name || 'Proyecto importado'} (importado)`,
    description: project.description || undefined,
    team: project.team && project.team.trim() ? project.team.trim() : userTeams[0] || currentUser.name,
    sprintStates: sanitizeSprintStates(project.sprintStates),
    createdBy: auth.currentUser?.uid || '',
  });

  const sanitizeImportedSprint = (sprint: Partial<Sprint>, projectId: string) => ({
    name: sprint.name || 'Sprint importado',
    projectId,
    isActive: sprint.isActive ?? true,
    isClosed: false,
    stateId: sprint.stateId || defaultProjectSprintStates()[0].id,
    statuses: sprint.statuses && sprint.statuses.length > 0 ? sprint.statuses : defaultSprintStatuses(),
    createdBy: auth.currentUser?.uid || '',
  });

  const sanitizeImportedTask = (task: Partial<Task>, sprintId: string) => {
    const currentUid = auth.currentUser?.uid || '';
    const status = task.status || 'backlog';
    const importedTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      sprintId,
      name: task.name || 'Tarea importada',
      description: task.description || '',
      weight: typeof task.weight === 'number' ? task.weight : 0,
      status,
      createdBy: currentUid,
      comments: task.comments || [],
      links: task.links || [],
      emailAlerts: task.emailAlerts || [],
    };
    if (task.color) importedTask.color = task.color;
    if (status === 'in_progress') importedTask.assignedTo = task.assignedTo || currentUid;
    else if (task.assignedTo) importedTask.assignedTo = task.assignedTo;
    if (status === 'done') importedTask.finishedBy = task.finishedBy || currentUid;
    else if (task.finishedBy) importedTask.finishedBy = task.finishedBy;
    return importedTask;
  };

  const handleImportProject = async (file: File) => {
    setIsImporting(true);
    try {
      const parsed = JSON.parse(await file.text()) as Partial<ProjectExportData>;
      if (!parsed.project || !Array.isArray(parsed.sprints)) {
        throw new Error('El archivo no tiene el formato esperado de SPRINTAZ.');
      }

      const newProjectId = await firebaseService.createProject(sanitizeImportedProject(parsed.project));
      if (!newProjectId) throw new Error('No se pudo crear el proyecto importado.');

      let importedTasks = 0;
      for (const item of parsed.sprints) {
        const newSprintId = await firebaseService.createSprint(
          sanitizeImportedSprint(item.sprint || {}, newProjectId)
        );
        if (!newSprintId) continue;

        for (const task of item.tasks || []) {
          await firebaseService.createTask(sanitizeImportedTask(task, newSprintId));
          importedTasks += 1;
        }
      }

      setImportNotice({
        title: 'Proyecto importado',
        message: `Se importaron ${parsed.sprints.length} sprints y ${importedTasks} tareas.`,
      });
    } catch (error) {
      setImportNotice({
        title: 'No se pudo importar',
        message: error instanceof Error ? error.message : 'El archivo no se pudo leer.',
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportProject(file);
  };

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
    <>
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
                    <div className="relative shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      <Folder className="w-7 h-7 text-amber-500" />
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-bento-ink px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                        {sprintCountsByProject[project.id] || 0}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pr-10 md:pr-28">
                      <h3 className="font-bold text-bento-ink truncate text-base md:text-lg">
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
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportProject(project);
                    }}
                    className="p-2 md:p-1.5 bg-white/90 border border-bento-border md:border-transparent hover:bg-sky-100 rounded text-bento-mute hover:text-sky-700 transition-colors cursor-pointer"
                    title="Exportar proyecto"
                    aria-label="Exportar proyecto"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {canManageProjects && canEditProject(project) && (
                    <>
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
                    </>
                  )}
                </div>
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-bento-border text-bento-ink font-semibold rounded-xl hover:bg-amber-50 hover:border-amber-400 transition-colors cursor-pointer disabled:opacity-50 text-sm md:text-base"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? 'Importando...' : 'Importar Proyecto'}
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-bento-ink text-white font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer text-sm md:text-base"
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
              className="bg-white border border-bento-border p-6 w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
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
                <ProjectSprintStateEditor
                  value={newSprintStates}
                  onChange={setNewSprintStates}
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
              className="bg-white border border-bento-border p-6 w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
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
                <ProjectSprintStateEditor
                  value={editSprintStates}
                  onChange={setEditSprintStates}
                />
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
    <AnimatePresence>
      {importNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="w-full max-w-sm bg-white border border-bento-border shadow-xl p-5"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-bold text-bento-ink">{importNotice.title}</h3>
            <p className="mt-2 text-sm text-bento-mute leading-relaxed">{importNotice.message}</p>
            <div className="flex justify-end pt-4 mt-4 border-t border-bento-border">
              <button
                type="button"
                onClick={() => setImportNotice(null)}
                className="px-4 py-2 text-sm font-bold bg-bento-ink text-white hover:bg-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    {confirmDialog}
    </>
  );
}
