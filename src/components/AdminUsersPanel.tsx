import React, { useState, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User, UserRole } from '../types';
import { X, Shield, Trash2, Pencil, Search, ImageIcon, User as UserIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Administrador',
  Teacher: 'Profesor Titular',
  Collaborator: 'Colaborador',
};

const ROLE_COLORS: Record<UserRole, { bg: string; chipBg: string; chipText: string; chipBorder: string }> = {
  Admin: { bg: 'bg-rose-400', chipBg: 'bg-rose-50', chipText: 'text-rose-700', chipBorder: 'border-rose-200' },
  Teacher: { bg: 'bg-amber-400', chipBg: 'bg-amber-50', chipText: 'text-amber-700', chipBorder: 'border-amber-200' },
  Collaborator: { bg: 'bg-sky-400', chipBg: 'bg-sky-50', chipText: 'text-sky-700', chipBorder: 'border-sky-200' },
};

interface AdminUsersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;
}

interface EditState {
  user: User;
  name: string;
  photoURL: string;
  role: UserRole;
  teams: string[];
}

export default function AdminUsersPanel({ isOpen, onClose, users, currentUserId }: AdminUsersPanelProps) {
  const [editingState, setEditingState] = useState<EditState | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newTeamInput, setNewTeamInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (u: User) => {
    setEditingState({
      user: u,
      name: u.name,
      photoURL: u.photoURL || '',
      role: u.role,
      teams: u.teams && u.teams.length > 0 ? [...u.teams] : [u.name],
    });
    setNewTeamInput('');
  };

  const addTeam = () => {
    const t = newTeamInput.trim();
    if (!t || !editingState) return;
    if (editingState.teams.includes(t)) {
      setNewTeamInput('');
      return;
    }
    setEditingState({ ...editingState, teams: [...editingState.teams, t] });
    setNewTeamInput('');
  };

  const removeTeam = (team: string) => {
    if (!editingState) return;
    if (editingState.teams.length <= 1) {
      setError('El usuario debe tener al menos un equipo.');
      return;
    }
    setEditingState({ ...editingState, teams: editingState.teams.filter(t => t !== team) });
  };

  const cancelEdit = () => {
    setEditingState(null);
    setError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file || !editingState) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor elige una imagen válida.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await firebaseService.uploadUserPhoto(editingState.user.uid, file);
      setEditingState({ ...editingState, photoURL: url });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message || 'Error al subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingState) return;
    if (!editingState.name.trim()) return;
    if (editingState.teams.length === 0) {
      setError('El usuario debe tener al menos un equipo.');
      return;
    }
    setSavingUid(editingState.user.uid);
    try {
      await firebaseService.updateUser(editingState.user.uid, {
        name: editingState.name.trim(),
        photoURL: editingState.photoURL.trim() || '',
        role: editingState.role,
        teams: editingState.teams,
      });
      cancelEdit();
    } finally {
      setSavingUid(null);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.uid === currentUserId) return;
    if (!confirm(`¿Eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`)) return;
    await firebaseService.deleteUser(u.uid);
  };

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const isSelfEditing = editingState && editingState.user.uid === currentUserId;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/30 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            className="bg-white border border-bento-border w-full max-w-3xl shadow-xl relative flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 md:px-8 py-5 border-b border-bento-border flex items-center justify-between gap-4 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-bento-ink truncate">Administración de Usuarios</h3>
                  <p className="text-[10px] md:text-xs text-bento-mute uppercase tracking-widest font-bold">Solo administradores</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-bento-mute" />
              </button>
            </div>

            <div className="px-6 md:px-8 py-4 border-b border-bento-border bg-slate-50/60">
              <div className="relative">
                <Search className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-11 pr-5 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-bento-mute uppercase font-bold tracking-widest mt-3">
                {filtered.length} {filtered.length === 1 ? 'usuario' : 'usuarios'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col gap-3">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-bento-mute">
                  <p className="text-sm italic">Sin resultados.</p>
                </div>
              )}
              {filtered.map((u) => {
                const isSelf = u.uid === currentUserId;
                const colors = ROLE_COLORS[u.role] || ROLE_COLORS.Collaborator;
                return (
                  <div key={u.uid} className="border border-bento-border bg-bento-card-hover p-4 transition-all">
                    <div className="flex items-center gap-4">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.name}
                          className="w-12 h-12 rounded-full border border-bento-border object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full ${colors.bg} text-white flex items-center justify-center font-bold shrink-0`}>
                          {u.name.substring(0, 2).toUpperCase() || '?'}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-bento-ink truncate">
                          {u.name}
                          {isSelf && <span className="text-amber-600 ml-2 text-[10px] uppercase tracking-widest">(Tú)</span>}
                        </p>
                        <p className="text-xs text-bento-mute truncate font-mono">{u.email}</p>
                      </div>

                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-lg border ${colors.chipBorder} ${colors.chipText} ${colors.chipBg} shrink-0`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(u.teams && u.teams.length > 0 ? u.teams : [u.name]).map(t => (
                        <span key={t} className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-bento-border flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="px-3 py-1.5 text-[11px] uppercase font-bold tracking-widest text-bento-ink bg-white border border-bento-border hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="px-3 py-1.5 text-[11px] uppercase font-bold tracking-widest text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {editingState && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 20 }}
                    className="bg-white border border-bento-border p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar relative"
                  >
                    <button
                      onClick={cancelEdit}
                      className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                      aria-label="Cerrar"
                    >
                      <X className="w-5 h-5 text-bento-mute" />
                    </button>

                    <h3 className="text-xl font-bold tracking-tight mb-6 text-bento-ink pr-8">Editar usuario</h3>

                    <div className="flex justify-center mb-6">
                      {editingState.photoURL ? (
                        <img
                          src={editingState.photoURL}
                          alt="Vista previa"
                          className="w-20 h-20 rounded-full border-2 border-amber-300 object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-amber-400 text-bento-ink flex items-center justify-center font-bold text-xl border-2 border-amber-300">
                          {(editingState.name || '?')[0]}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                          Nombre
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Nombre"
                            className="w-full pl-11 pr-5 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink font-medium"
                            value={editingState.name}
                            onChange={(e) => setEditingState({ ...editingState, name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                          Foto de perfil
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex-1 px-4 py-3 bg-white border-2 border-bento-border hover:border-amber-400 rounded-xl outline-none transition-all font-medium text-bento-ink text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Subiendo...' : 'Subir'}
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                            disabled={uploading}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                          O pega URL
                        </label>
                        <div className="relative">
                          <ImageIcon className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            placeholder="https://..."
                            className="w-full pl-11 pr-5 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink text-sm"
                            value={editingState.photoURL}
                            onChange={(e) => setEditingState({ ...editingState, photoURL: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                          Rol
                        </label>
                        <select
                          value={editingState.role}
                          onChange={(e) => setEditingState({ ...editingState, role: e.target.value as UserRole })}
                          disabled={!!isSelfEditing}
                          className="w-full px-4 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink cursor-pointer font-medium disabled:opacity-50"
                        >
                          <option value="Admin">Administrador</option>
                          <option value="Teacher">Profesor Titular</option>
                          <option value="Collaborator">Colaborador</option>
                        </select>
                        {isSelfEditing && <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">No puedes cambiar tu propio rol.</p>}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                          Equipos
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                          {editingState.teams.length === 0 && (
                            <span className="text-[10px] text-bento-mute italic">Sin equipos asignados.</span>
                          )}
                          {editingState.teams.map(t => (
                            <span
                              key={t}
                              className="text-[10px] uppercase font-bold tracking-widest pl-2 pr-1 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() => removeTeam(t)}
                                className="p-0.5 hover:bg-rose-100 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                aria-label={`Quitar ${t}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Añadir equipo..."
                            className="flex-1 px-4 py-2.5 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all text-bento-ink text-sm"
                            value={newTeamInput}
                            onChange={(e) => setNewTeamInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTeam();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={addTeam}
                            disabled={!newTeamInput.trim()}
                            className="px-4 py-2.5 bg-bento-ink hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Añadir
                          </button>
                        </div>
                        <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">
                          Solo el administrador puede asignar varios equipos a un usuario.
                        </p>
                      </div>

                      {error && (
                        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
                          {error}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-bento-border mt-6">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 py-3 text-sm font-semibold text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={savingUid === editingState.user.uid}
                        className="flex-1 py-3 bg-bento-ink text-white text-sm font-bold rounded-xl shadow-md hover:bg-black active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {savingUid === editingState.user.uid ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
