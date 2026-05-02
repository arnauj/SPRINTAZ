import React, { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Project, User } from '../types';
import { auth } from '../lib/firebase';
import { Plus, FolderOpen, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectSelectorProps {
  currentUser: User;
  onSelectProject: (project: Project) => void;
}

export default function ProjectSelector({ currentUser, onSelectProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeProjects(setProjects);
    return () => unsubscribe();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    await firebaseService.createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      createdBy: auth.currentUser?.uid || '',
    });

    setNewProjectName('');
    setNewProjectDescription('');
    setShowCreateModal(false);
  };

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
            Comienza seleccionando un proyecto existente o crea uno nuevo
          </p>
        </motion.div>

        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-bento-mute mb-6">
              Aún no hay proyectos. Crea uno para comenzar.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-bento-ink text-white font-semibold px-6 py-3 rounded-xl hover:bg-black transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Proyecto
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {projects.map((project) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectProject(project)}
                className="p-5 bg-white border-2 border-bento-border hover:border-amber-400 hover:bg-amber-50/30 transition-all text-left rounded-xl cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <Folder className="w-6 h-6 text-amber-500 shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-bento-ink truncate text-lg">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-bento-mute line-clamp-2 mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-bento-ink text-white font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border border-bento-border p-6 w-full max-w-sm shadow-xl"
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
    </div>
  );
}
