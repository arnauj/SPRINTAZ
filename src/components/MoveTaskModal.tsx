import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { Task, Sprint, Project } from '../types';
import { X, ArrowRightLeft, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MoveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentProject: Project;
}

export default function MoveTaskModal({ isOpen, onClose, task, currentProject }: MoveTaskModalProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setSelectedSprintId(null);
      setLoading(true);
      firebaseService.getSprintsByProject(currentProject.id)
        .then(allSprints => {
          setSprints(allSprints.filter(s => s.id !== task.sprintId && !s.isClosed));
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, task, currentProject.id]);

  const handleMove = async () => {
    if (!task || !selectedSprintId) return;
    setSubmitting(true);
    console.log('Moving task', task.id, 'to sprint', selectedSprintId);
    try {
      await firebaseService.updateTask(task.id, { 
        sprintId: selectedSprintId
      });
      console.log('Task updated successfully');
      onClose();
    } catch (e) {
      console.error('Error moving task:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            className="bg-white border border-bento-border p-8 w-full max-w-md shadow-xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-bento-mute" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-bento-ink">Mover Tarea</h3>
                <p className="text-sm text-bento-mute truncate max-w-[280px]">"{task.name}"</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-bento-mute">Selecciona el sprint de destino:</p>
              
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sprints.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-bento-border rounded-xl">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-bento-mute">No hay otros sprints activos disponibles en este proyecto.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {sprints.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSprintId(s.id)}
                      disabled={submitting}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedSprintId === s.id 
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' 
                        : 'border-bento-border hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${selectedSprintId === s.id ? 'text-amber-700' : 'text-bento-ink'}`}>{s.name}</span>
                        {selectedSprintId === s.id && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-bento-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-sm font-semibold text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleMove}
                disabled={submitting || !selectedSprintId}
                className="flex-1 py-3 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Moviendo...' : 'Confirmar Movimiento'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
