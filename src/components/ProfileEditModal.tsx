import React, { useEffect, useState, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import { User } from '../types';
import { X, ImageIcon, User as UserIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSaved: (user: User) => void;
}

export default function ProfileEditModal({ isOpen, onClose, user, onSaved }: ProfileEditModalProps) {
  const [name, setName] = useState(user.name);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setPhotoURL(user.photoURL || '');
      setError(null);
    }
  }, [isOpen, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
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
      const url = await firebaseService.uploadUserPhoto(user.uid, file);
      setPhotoURL(url);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message || 'Error al subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updates: Partial<User> = {
        name: name.trim(),
        photoURL: photoURL.trim() || '',
      };
      await firebaseService.updateUser(user.uid, updates);
      onSaved({ ...user, ...updates });
      onClose();
    } catch (e) {
      setError('No se pudo guardar. Inténtalo de nuevo.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-bento-card border-2 border-bento-border rounded-3xl p-8 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            <h3 className="text-2xl font-bold tracking-tight mb-2 text-white">Editar Perfil</h3>
            <p className="text-sm text-slate-500 mb-6">Actualiza tu nombre y foto de perfil.</p>

            <div className="flex justify-center mb-6">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Vista previa"
                  className="w-24 h-24 rounded-full border-2 border-indigo-500/40 ring-2 ring-indigo-500/10 object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-2xl border-2 border-indigo-500/40">
                  {(name || user.name || '?')[0]}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Nombre
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    required
                    className="w-full pl-11 pr-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-200"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Foto de perfil
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 px-4 py-3 bg-slate-800 border-2 border-slate-700 hover:border-indigo-600 hover:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-300 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  O pega URL de foto
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full pl-11 pr-5 py-3 bg-slate-800 border-2 border-slate-700 focus:border-indigo-600 focus:bg-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-300 text-sm"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-600 italic mt-1.5 ml-1">Enlace público a una imagen.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Email
                </label>
                <div className="w-full px-5 py-3 bg-slate-900 border-2 border-slate-800 text-slate-500 rounded-2xl text-sm font-mono">
                  {user.email}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border-2 border-red-500/30 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-4 pt-4 border-t-2 border-slate-800/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
