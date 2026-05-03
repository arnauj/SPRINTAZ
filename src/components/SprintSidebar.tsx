import { useMemo } from 'react';
import { firebaseService } from '../services/firebaseService';
import { UserRole, User } from '../types';
import { auth } from '../lib/firebase';
import { Trash2, Shield } from 'lucide-react';
import { useConfirmDialog } from './ConfirmDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Administrador',
  Teacher: 'Profesor Titular',
  Collaborator: 'Colaborador',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  Admin: { bg: 'bg-rose-400', text: 'text-rose-600' },
  Teacher: { bg: 'bg-amber-400', text: 'text-amber-600' },
  Collaborator: { bg: 'bg-sky-400', text: 'text-sky-600' },
};

interface SprintSidebarProps {
  currentUser: User;
  users: User[];
}

export default function SprintSidebar({ currentUser, users }: SprintSidebarProps) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const userTeams = useMemo(
    () =>
      currentUser.teams && currentUser.teams.length > 0
        ? currentUser.teams
        : [currentUser.name],
    [currentUser]
  );

  const isOwnerEmail = auth.currentUser?.email?.toLowerCase() === 'juanrael@gmail.com';
  const isAdmin = currentUser.role === 'Admin' || isOwnerEmail;

  const handleDeleteUser = async (target: User) => {
    const confirmed = await confirm({
      title: 'Eliminar usuario',
      message: `¿Eliminar al usuario "${target.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;
    await firebaseService.deleteUser(target.uid);
  };

  const handleChangeRole = async (target: User, newRole: UserRole) => {
    if (target.role === newRole) return;
    await firebaseService.updateUserRole(target.uid, newRole);
  };

  const teamMembers = users.filter(u => {
    const uTeams = u.teams && u.teams.length > 0 ? u.teams : [u.name];
    return uTeams.some(t => userTeams.includes(t));
  });

  return (
    <>
    <aside className="w-64 flex flex-col gap-4 shrink-0 h-full">
      <div className="bg-white border border-bento-border p-5 flex-1 flex flex-col shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase text-bento-mute tracking-widest">Equipo</h2>
          {isAdmin && (
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-rose-500">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar py-1">
          {teamMembers.length === 0 && (
            <p className="text-[11px] text-bento-mute italic text-center py-3">
              Sin compañeros en tus equipos.
            </p>
          )}
          {teamMembers.map(u => {
            const colors = ROLE_COLORS[u.role] || ROLE_COLORS.Collaborator;
            const isSelf = u.uid === auth.currentUser?.uid;
            return (
              <div key={u.uid} className="flex items-center gap-3 group pl-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${colors.bg} text-white`}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    u.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-bento-ink truncate">{u.name}</p>
                  {isAdmin && !isSelf ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                      className={`text-[9px] uppercase font-bold tracking-wider bg-transparent border-none outline-none cursor-pointer ${colors.text} hover:opacity-80`}
                    >
                      <option value="Admin">Administrador</option>
                      <option value="Teacher">Profesor Titular</option>
                      <option value="Collaborator">Colaborador</option>
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
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-100 rounded text-bento-mute hover:text-rose-500 transition-all cursor-pointer shrink-0"
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
    </aside>
    {confirmDialog}
    </>
  );
}
