import React, { useEffect, useState, useRef } from 'react';
import { firebaseService } from '../services/firebaseService';
import { requestNotificationPermissionAndToken } from '../lib/firebase';
import { User } from '../types';
import { X, ImageIcon, User as UserIcon, Upload, Bell } from 'lucide-react';
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
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error'>(user.fcmToken ? 'success' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setPhotoURL(user.photoURL || '');
      setError(null);
      setPushStatus(user.fcmToken ? 'success' : 'idle');
    }
  }, [isOpen, user]);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    setError(null);
    try {
      const token = await requestNotificationPermissionAndToken();
      if (token) {
        await firebaseService.updateUserFCMToken(user.uid, token);
        setPushStatus('success');
        onSaved({ ...user, fcmToken: token });
      } else {
        setError('No se pudo obtener el permiso o el token de notificaciones.');
        setPushStatus('error');
      }
    } catch (e) {
      setError('Error al activar notificaciones push.');
      setPushStatus('error');
    } finally {
      setEnablingPush(false);
    }
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
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

            <h3 className="text-xl font-bold tracking-tight mb-1 text-bento-ink">Editar Perfil</h3>
            <p className="text-sm text-bento-mute mb-6">Actualiza tu nombre y foto de perfil.</p>

            <div className="flex justify-center mb-6">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Vista previa"
                  className="w-24 h-24 rounded-full border-2 border-amber-300 object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-amber-400 text-bento-ink flex items-center justify-center font-bold text-2xl border-2 border-amber-300">
                  {(name || user.name || '?')[0]}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  Nombre
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    required
                    className="w-full pl-11 pr-5 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all font-medium text-bento-ink"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  O pega URL de foto
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-bento-mute absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full pl-11 pr-5 py-3 bg-white border-2 border-bento-border focus:border-amber-400 rounded-xl outline-none transition-all font-medium text-bento-ink text-sm"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">Enlace público a una imagen.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  Email
                </label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-bento-border text-bento-mute rounded-xl text-sm font-mono">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest mb-1.5 ml-1">
                  Notificaciones Push
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={enablingPush || pushStatus === 'success'}
                    className={`flex-1 px-4 py-3 border-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      pushStatus === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                        : 'bg-white border-bento-border hover:border-amber-400 text-bento-ink'
                    }`}
                  >
                    <Bell className={`w-4 h-4 ${pushStatus === 'success' ? 'text-emerald-500' : 'text-bento-mute'}`} />
                    {enablingPush ? 'Activando...' : pushStatus === 'success' ? 'Notificaciones activas' : 'Activar en este dispositivo'}
                  </button>
                </div>
                <p className="text-[10px] text-bento-mute italic mt-1.5 ml-1">
                  {pushStatus === 'success' 
                    ? 'Este dispositivo está listo para recibir alertas aunque la app esté cerrada.' 
                    : 'Necesario para recibir alertas en el móvil con la app cerrada.'}
                </p>
              </div>

              {error && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-bento-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-sm font-semibold text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-bento-ink text-white text-sm font-bold rounded-xl shadow-md hover:bg-black active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
