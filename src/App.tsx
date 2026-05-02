import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { auth } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { User, Sprint } from './types';
import {
  LogOut,
  Layers,
  Menu,
  X,
  Shield,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import SprintSidebar from './components/SprintSidebar';
import KanbanBoard from './components/KanbanBoard';
import NotificationBell from './components/NotificationBell';
import ProfileEditModal from './components/ProfileEditModal';
import AdminUsersPanel from './components/AdminUsersPanel';
import SendMessageModal from './components/SendMessageModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isOwnerEmail = firebaseUser.email?.toLowerCase() === 'juanrael@gmail.com';
        let userData = await firebaseService.getUser(firebaseUser.uid);
        if (!userData) {
          const defaultName = firebaseUser.displayName || 'Anonymous';
          const newUser: User = {
            uid: firebaseUser.uid,
            name: defaultName,
            email: firebaseUser.email || '',
            role: isOwnerEmail ? 'Admin' : 'Collaborator',
            photoURL: firebaseUser.photoURL || undefined,
            teams: [defaultName],
          };
          await firebaseService.createUser(newUser);
          userData = newUser;
        } else {
          let needsUpdate = false;
          if (isOwnerEmail && userData.role !== 'Admin') {
            userData.role = 'Admin';
            needsUpdate = true;
          }
          if (!userData.teams || userData.teams.length === 0) {
            userData.teams = [userData.name];
            if (isOwnerEmail) {
              needsUpdate = true;
            }
          }
          if (needsUpdate) {
            await firebaseService.createUser(userData);
          }
        }
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firebaseService.subscribeUsers(setUsers);
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bento-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bento-bg text-bento-ink p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="space-y-4">
            <Layers className="w-16 h-16 mx-auto text-amber-500" />
            <h1 className="text-4xl font-bold tracking-tight">SPRINTAZ</h1>
            <p className="text-bento-mute">Sistema de Planificación Rápida e Iterativa para Nuevas Tareas Ágiles del Zonzamas.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-bento-ink text-white font-medium py-3 px-4 rounded-xl hover:bg-black transition-colors cursor-pointer shadow-md"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Continuar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bento-bg text-bento-ink font-sans overflow-hidden p-3 md:p-5 gap-3 md:gap-4 flex-col">
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-5 bg-white/80 backdrop-blur border border-bento-border shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-xl text-bento-ink transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="h-8 w-8 md:h-9 md:w-9 bg-bento-ink rounded-lg flex items-center justify-center font-bold text-white shrink-0">Z</div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold tracking-tight truncate">SPRINTAZ</h1>
            <p className="text-[9px] uppercase font-semibold text-bento-mute tracking-widest mt-0.5">CIFP Zonzamas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {(user.role === 'Admin' || user.role === 'Teacher') && (
            <button
              onClick={() => setShowSendMessage(true)}
              className="p-2 bg-white border border-bento-border hover:bg-slate-50 rounded-xl transition-all cursor-pointer active:scale-95"
              aria-label="Enviar mensaje al equipo"
              title="Enviar mensaje al equipo"
            >
              <Send className="w-4 h-4 text-bento-ink" />
            </button>
          )}
          <NotificationBell userId={user.uid} />

          <div className="flex items-center gap-2 md:gap-3 md:border-l md:pl-4 border-bento-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-bento-ink leading-none">{user.name}</p>
              <p className="text-[10px] uppercase font-bold text-amber-600 mt-1 tracking-tight">{user.role}</p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="rounded-full transition-all hover:ring-2 hover:ring-amber-400 cursor-pointer"
              title="Editar perfil"
            >
              {user.photoURL ? (
                <img src={user.photoURL} className="w-9 h-9 rounded-full border border-bento-border" alt={user.name} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-400 text-bento-ink flex items-center justify-center font-bold text-sm border border-bento-border">
                  {user.name[0]}
                </div>
              )}
            </button>
            {user.role === 'Admin' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="p-2 hover:bg-slate-100 rounded-xl text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
                title="Administrar usuarios"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-slate-100 rounded-xl text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-3 md:gap-4 min-h-0 relative">
        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed left-0 top-0 bottom-0 z-50 p-3 md:hidden flex flex-col gap-3"
              >
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="self-end p-2 bg-white border border-bento-border hover:bg-slate-50 rounded-xl text-bento-ink transition-colors cursor-pointer shadow-sm"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
                <SprintSidebar
                  activeSprint={activeSprint}
                  onSelectSprint={(sprint) => {
                    setActiveSprint(sprint);
                    setSidebarOpen(false);
                  }}
                  currentUser={user}
                  users={users}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar — hidden when a sprint is open to give room to the board */}
        {!activeSprint && (
          <div className="hidden md:flex">
            <SprintSidebar
              activeSprint={activeSprint}
              onSelectSprint={setActiveSprint}
              currentUser={user}
              users={users}
            />
          </div>
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          <AnimatePresence mode="wait">
            {activeSprint ? (
              <motion.div
                key={activeSprint.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <KanbanBoard
                  sprint={activeSprint}
                  currentUser={user}
                  users={users}
                  onBack={() => setActiveSprint(null)}
                />
              </motion.div>
            ) : (
              <div className="h-full bg-white/70 border border-bento-border flex flex-col items-center justify-center text-bento-mute gap-4 p-6 text-center">
                <Layers className="w-12 h-12 md:w-16 md:h-16 text-amber-300" />
                <p className="text-base md:text-lg font-semibold text-bento-ink/70">Selecciona un proyecto del panel para abrir su tablero</p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden mt-2 px-4 py-2 bg-bento-ink hover:bg-black text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Ver sprints
                </button>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <footer className="h-9 md:h-10 bg-white/70 backdrop-blur border border-bento-border flex items-center px-3 md:px-5 gap-2 md:gap-4 shrink-0">
        <div className="flex items-center gap-2 text-amber-600 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Sistema</span>
        </div>
        <p className="text-[10px] md:text-xs text-bento-mute flex-1 truncate">
          <span className="hidden sm:inline">Conectado como </span>
          <span className="text-bento-ink font-semibold">{user.email}</span>
          <span className="hidden md:inline"> · Lanzarote, Canarias</span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-mono text-bento-mute uppercase tracking-tighter hidden md:inline">Live</span>
        </div>
      </footer>

      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSaved={(updated) => setUser(updated)}
      />

      {user.role === 'Admin' && (
        <AdminUsersPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          users={users}
          currentUserId={user.uid}
        />
      )}

      {(user.role === 'Admin' || user.role === 'Teacher') && (
        <SendMessageModal
          isOpen={showSendMessage}
          onClose={() => setShowSendMessage(false)}
          currentUser={user}
          users={users}
        />
      )}
    </div>
  );
}
