import { useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { auth } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { User, Sprint, Project } from './types';
import {
  LogOut,
  Layers,
  Shield,
  Send,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import SprintSidebar from './components/SprintSidebar';
import SprintList from './components/SprintList';
import KanbanBoard from './components/KanbanBoard';
import NotificationBell from './components/NotificationBell';
import ProfileEditModal from './components/ProfileEditModal';
import AdminUsersPanel from './components/AdminUsersPanel';
import SendMessageModal from './components/SendMessageModal';
import ProjectSelector from './components/ProjectSelector';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const didAutoSelectProject = useRef(false);

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

        if (userData.role === 'Admin' || userData.role === 'Teacher') {
          await firebaseService.migrateOrphanSprintsToProject('Epyca', firebaseUser.uid)
            .catch(err => console.warn('Sprint migration skipped:', err));
        }
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
    didAutoSelectProject.current = false;
    const unsubscribe = firebaseService.subscribeProjects((projects) => {
      if (didAutoSelectProject.current) return;
      if (projects.length === 0) return;
      didAutoSelectProject.current = true;
      const epycaProject = projects.find(p => p.name === 'Epyca');
      setActiveProject(epycaProject || projects[0]);
    });
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
            <p className="text-bento-mute">Gestiona tus proyectos, sprints y tareas de forma ágil y colaborativa.</p>
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
      <header className="relative z-50 h-14 md:h-16 flex items-center justify-between px-2 md:px-5 bg-white/80 backdrop-blur border border-bento-border shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => {
              setActiveSprint(null);
              setActiveProject(null);
              didAutoSelectProject.current = true;
            }}
            className="h-8 w-8 md:h-9 md:w-9 bg-bento-ink rounded-lg flex items-center justify-center font-bold text-white shrink-0 hover:bg-black transition-colors cursor-pointer"
            title="SPRINTAZ"
            aria-label="Inicio"
          >
            Z
          </button>
          <h1 className="text-base font-bold tracking-tight shrink-0 hidden sm:block">SPRINTAZ</h1>
          {activeProject ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
              <ChevronRight className="w-4 h-4 text-bento-mute shrink-0 hidden sm:block" />
              <button
                onClick={() => {
                  setActiveSprint(null);
                  setActiveProject(null);
                  didAutoSelectProject.current = true;
                }}
                className="flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded transition-colors cursor-pointer min-w-0"
                title="Cambiar de proyecto"
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">{activeProject.name}</span>
              </button>
            </div>
          ) : (
            <span className="text-[9px] uppercase font-semibold text-bento-mute tracking-widest hidden md:inline">· CIFP Zonzamas</span>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          {(user.role === 'Admin' || user.role === 'Teacher') && (
            <button
              onClick={() => setShowSendMessage(true)}
              className="p-1.5 md:p-2 bg-white border border-bento-border hover:bg-slate-50 rounded-xl transition-all cursor-pointer active:scale-95"
              aria-label="Enviar mensaje al equipo"
              title="Enviar mensaje al equipo"
            >
              <Send className="w-4 h-4 text-bento-ink" />
            </button>
          )}
          <NotificationBell userId={user.uid} />

          <div className="flex items-center gap-1 md:gap-3 md:border-l md:pl-4 border-bento-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-bento-ink leading-none">{user.name}</p>
              <p className="text-[10px] uppercase font-bold text-amber-600 mt-1 tracking-tight">{user.role}</p>
            </div>
            <button
              onClick={() => setShowProfileModal(true)}
              className="rounded-full transition-all hover:ring-2 hover:ring-amber-400 cursor-pointer shrink-0"
              title="Editar perfil"
            >
              {user.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-bento-border" alt={user.name} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-amber-400 text-bento-ink flex items-center justify-center font-bold text-sm border border-bento-border">
                  {user.name[0]}
                </div>
              )}
            </button>
            {user.role === 'Admin' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="p-1.5 md:p-2 hover:bg-slate-100 rounded-xl text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
                title="Administrar usuarios"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => signOut(auth)}
              className="p-1.5 md:p-2 hover:bg-slate-100 rounded-xl text-bento-mute hover:text-rose-500 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-3 md:gap-4 min-h-0 relative">
        <main className="flex-1 min-w-0 flex flex-col">
          <AnimatePresence mode="wait">
            {activeProject ? (
              activeSprint ? (
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
                <motion.div
                  key={activeProject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="h-full"
                >
                  <SprintList
                    project={activeProject}
                    currentUser={user}
                    users={users}
                    onSelectSprint={setActiveSprint}
                    onChangeProject={() => {
                      setActiveSprint(null);
                      setActiveProject(null);
                      didAutoSelectProject.current = true;
                    }}
                  />
                </motion.div>
              )
            ) : (
              <ProjectSelector
                currentUser={user}
                onSelectProject={(project) => {
                  didAutoSelectProject.current = true;
                  setActiveProject(project);
                }}
              />
            )}
          </AnimatePresence>
        </main>

        {activeProject && !activeSprint && (
          <div className="hidden lg:flex">
            <SprintSidebar currentUser={user} users={users} />
          </div>
        )}
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
