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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import SprintSidebar from './components/SprintSidebar';
import KanbanBoard from './components/KanbanBoard';
import NotificationBell from './components/NotificationBell';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userData = await firebaseService.getUser(firebaseUser.uid);
        if (!userData) {
          // New user creation
          const isOwnerEmail = firebaseUser.email?.toLowerCase() === 'juanrael@gmail.com';
          const newUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            role: 'Teacher', // Default to Teacher for this specific user group
            photoURL: firebaseUser.photoURL || undefined
          };
          await firebaseService.createUser(newUser);
          userData = newUser;
        } else if (firebaseUser.email?.toLowerCase() === 'juanrael@gmail.com' && userData.role !== 'Teacher') {
          // Force update for existing owner if role is wrong
          console.log('Elevating user to Teacher role');
          userData.role = 'Teacher';
          await firebaseService.createUser(userData);
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
    if (user) {
      firebaseService.getAllUsers().then(setUsers);
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
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-900 text-white p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8"
        >
          <div className="space-y-4">
            <Layers className="w-16 h-16 mx-auto text-blue-500" />
            <h1 className="text-4xl font-bold font-sans tracking-tight">SPRINTAZ</h1>
            <p className="text-neutral-400">Sistema de Planificación Rápida e Iterativa para Nuevas Tareas Ágiles del Zonzamas.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-4 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Continuar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bento-bg text-slate-200 font-sans overflow-hidden p-3 md:p-6 gap-3 md:gap-6 flex-col">
      <header className="h-16 md:h-20 flex items-center justify-between px-3 md:px-6 bg-bento-card border border-bento-border rounded-2xl shadow-xl shrink-0 gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="h-9 w-9 md:h-10 md:w-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shrink-0">Z</div>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold tracking-tight truncate">
              SPRINTAZ
              {activeSprint && (
                <span className="text-slate-500 font-normal"> / {activeSprint.name}</span>
              )}
            </h1>
            <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">CIFP ZONZAMAS</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 shrink-0">
          <NotificationBell userId={user.uid} />

          <div className="flex items-center gap-2 md:gap-4 md:border-l md:pl-6 border-bento-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-200 leading-none">{user.name}</p>
              <p className="text-[10px] uppercase font-bold text-indigo-400 mt-1 tracking-tight">{user.role}</p>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-indigo-500/30 ring-2 ring-indigo-500/10" alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                {user.name[0]}
              </div>
            )}
            <button
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-3 md:gap-6 min-h-0 relative">
        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
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
                  className="self-end p-2 bg-bento-card hover:bg-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer shadow-lg"
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
                  userRole={user.role}
                  users={users}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <SprintSidebar
            activeSprint={activeSprint}
            onSelectSprint={setActiveSprint}
            userRole={user.role}
            users={users}
          />
        </div>

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
                <KanbanBoard sprint={activeSprint} currentUser={user} users={users} />
              </motion.div>
            ) : (
              <div className="h-full bg-bento-card border border-bento-border rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-4 shadow-lg p-6 text-center">
                <Layers className="w-12 h-12 md:w-16 md:h-16 opacity-10" />
                <p className="text-base md:text-lg font-medium opacity-50">Selecciona un sprint para visualizar el tablero</p>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Ver sprints
                </button>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <footer className="h-10 md:h-12 bg-bento-card border border-bento-border rounded-2xl flex items-center px-3 md:px-6 gap-2 md:gap-4 shadow-inner shrink-0">
        <div className="flex items-center gap-2 text-indigo-400 shrink-0">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Sistema:</span>
        </div>
        <p className="text-[10px] md:text-xs text-slate-400 flex-1 truncate italic">
          <span className="hidden sm:inline">Conectado como </span>
          <span className="text-slate-300 font-bold">{user.email}</span>
          <span className="hidden md:inline"> · Local: Lanzarote, Canarias</span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-tighter hidden md:inline">Live Database Connected</span>
        </div>
      </footer>
    </div>
  );
}