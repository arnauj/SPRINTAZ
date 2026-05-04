import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  type AuthError
} from 'firebase/auth';
import { auth, onForegroundMessage } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { User, Sprint, Project } from './types';
import {
  LogOut,
  Layers,
  Shield,
  Send,
  ChevronRight,
  FolderOpen,
  Mail,
  Lock,
  UserPlus,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPath, parsePath } from './lib/router';

import SprintSidebar from './components/SprintSidebar';
import SprintList from './components/SprintList';
import KanbanBoard from './components/KanbanBoard';
import NotificationBell from './components/NotificationBell';
import ProfileEditModal from './components/ProfileEditModal';
import AdminUsersPanel from './components/AdminUsersPanel';
import SendMessageModal from './components/SendMessageModal';
import ProjectSelector from './components/ProjectSelector';

type AuthMode = 'choose' | 'signin' | 'signup';

function authErrorMessage(err: unknown): string {
  const code = (err as AuthError)?.code || '';
  switch (code) {
    case 'auth/invalid-email': return 'Email no válido.';
    case 'auth/missing-password': return 'Introduce una contraseña.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/email-already-in-use': return 'Ese email ya está registrado. Inicia sesión.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o contraseña incorrectos.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Prueba más tarde.';
    case 'auth/network-request-failed': return 'Sin conexión. Revisa tu red.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente. Permite popups e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'Este método de inicio de sesión no está habilitado en Firebase.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase Auth.';
    default:
      return (err as Error)?.message || 'No se pudo completar la operación.';
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigationState, setNavigationState] = useState<{
    project: Project | null;
    sprint: Sprint | null;
    task: Task | null;
  }>({ project: null, sprint: null, task: null });
  const [projects, setProjects] = useState<Project[]>([]);
  const isInternalNav = useRef(false);
  const didInitFromUrl = useRef(false);

  const activeProject = navigationState.project;
  const activeSprint = navigationState.sprint;
  const activeTask = navigationState.task;

  const setActiveProject = (p: Project | null) => 
    setNavigationState(prev => ({ ...prev, project: p, sprint: null, task: null }));
  const setActiveSprint = (s: Sprint | null) => 
    setNavigationState(prev => ({ ...prev, sprint: s, task: null }));
  const setActiveTask = (t: Task | null) => 
    setNavigationState(prev => ({ ...prev, task: t }));

  const [users, setUsers] = useState<User[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('choose');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [nameValue, setNameValue] = useState('');

  useEffect(() => {
    // If we returned from a redirect-based sign-in (mobile/PWA flow),
    // surface the error if any so the user isn't left on a stale screen.
    getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in failed', err);
      setAuthError(authErrorMessage(err));
    });
  }, []);

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
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      // In-app notifications are already handled by NotificationBell's subscription to Firestore
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const isOwnerEmail = user.email?.toLowerCase() === 'juanrael@gmail.com';
    const isAdmin = user.role === 'Admin' || isOwnerEmail;
    const userTeams = user.teams && user.teams.length > 0 ? user.teams : [user.name];
    
    const unsubscribe = firebaseService.subscribeProjects((allProjects) => {
      setProjects(allProjects);
    });
    return () => unsubscribe();
  }, [user]);

  // Routing and Initial Load
  useEffect(() => {
    if (!user || projects.length === 0) return;

    const resolveStateFromUrl = async (projectsList: Project[]) => {
      const { projectId, sprintId, taskId } = parsePath(window.location.pathname);
      const project = projectsList.find(p => p.id === projectId) || null;
      let sprint = null;
      let task = null;
      
      if (project && sprintId) {
        const sprintList = await firebaseService.getSprintsByProject(project.id);
        sprint = sprintList.find(s => s.id === sprintId) || null;
        
        if (sprint && taskId) {
            const taskList = await firebaseService.getTasksBySprint(sprint.id);
            task = taskList.find(t => t.id === taskId) || null;
        }
      }

      return { project, sprint, task };
    };

    const initFromUrl = async () => {
      if (didInitFromUrl.current) return;
      
      const newState = await resolveStateFromUrl(projects);
      console.log('initFromUrl resolved state:', newState, 'from path:', window.location.pathname);
      
      // If we are at root and didn't find a project, just mark as initialized.
      // If we found a project, update state.
      setNavigationState(newState);
      didInitFromUrl.current = true;
    };

    initFromUrl();

    const handlePopState = async () => {
        isInternalNav.current = true;
        const newState = await resolveStateFromUrl(projects);
        setNavigationState(newState);
        setTimeout(() => { isInternalNav.current = false; }, 0);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, projects]);

  useEffect(() => {
      if (isInternalNav.current || !didInitFromUrl.current) return;
      
      const currentPath = window.location.pathname;
      const path = getPath(
          activeProject ? { name: activeProject.name, id: activeProject.id } : undefined,
          activeSprint ? { name: activeSprint.name, id: activeSprint.id } : undefined,
          activeTask ? { name: activeTask.name, id: activeTask.id } : undefined
      );
      
      console.log('Syncing URL:', currentPath, '->', path);
      
      if (currentPath !== path) {
          window.history.pushState({}, '', path);
      }
  }, [activeProject, activeSprint, activeTask]);

  useEffect(() => {
    if (!activeProject) return;
    const fresh = projects.find((p) => p.id === activeProject.id);
    if (fresh && fresh !== activeProject) {
      setNavigationState(prev => ({ ...prev, project: fresh }));
    } else if (!fresh && projects.length > 0) {
      setActiveProject(null);
    }
  }, [projects, activeProject]);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Popup is the documented flow for self-hosted apps (GitHub Pages).
      // signInWithRedirect requires third-party cookies on the firebaseapp.com
      // authDomain, which Safari and most Chromium browsers block by default,
      // so the redirect would silently lose the session. Use popup everywhere
      // and only fall back to redirect if the popup is actively blocked.
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as AuthError)?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — silent.
      } else if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error('Google sign-in redirect failed', redirectErr);
          setAuthError(authErrorMessage(redirectErr));
        }
      } else {
        console.error('Google sign-in failed', error);
        setAuthError(authErrorMessage(error));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, emailValue.trim(), passwordValue);
      setPasswordValue('');
    } catch (error) {
      console.error('Email sign-in failed', error);
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailValue.trim(), passwordValue);
      const displayName = nameValue.trim();
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName }).catch(() => { /* non-fatal */ });
      }
      setPasswordValue('');
    } catch (error) {
      console.error('Email sign-up failed', error);
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailValue.trim()) {
      setAuthError('Introduce tu email para enviarte el enlace de recuperación.');
      return;
    }
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    try {
      await sendPasswordResetEmail(auth, emailValue.trim());
      setAuthInfo('Te hemos enviado un email para restablecer la contraseña.');
    } catch (error) {
      console.error('Password reset failed', error);
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
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
    const isSignup = authMode === 'signup';
    const isEmailMode = authMode === 'signin' || authMode === 'signup';
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-bento-bg text-bento-ink text-center"
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6"
        >
          <div className="space-y-3">
            <Layers className="w-14 h-14 mx-auto text-amber-500" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">SPRINTAZ</h1>
            <p className="text-bento-mute text-sm md:text-base">Gestiona tus proyectos, sprints y tareas de forma ágil y colaborativa.</p>
          </div>

          {authError && (
            <div className="text-left text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">
              {authError}
            </div>
          )}
          {authInfo && (
            <div className="text-left text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2">
              {authInfo}
            </div>
          )}

          {!isEmailMode ? (
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                disabled={authBusy}
                className="w-full flex items-center justify-center gap-3 bg-bento-ink text-white font-medium py-3 px-4 rounded-xl hover:bg-black transition-colors cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white rounded" alt="Google" />
                Continuar con Google
              </button>

              <div className="flex items-center gap-3 text-bento-mute text-xs uppercase tracking-widest">
                <div className="h-px bg-bento-border flex-1" />
                <span>o</span>
                <div className="h-px bg-bento-border flex-1" />
              </div>

              <button
                onClick={() => { setAuthError(null); setAuthInfo(null); setAuthMode('signin'); }}
                className="w-full flex items-center justify-center gap-3 bg-white border border-bento-border text-bento-ink font-medium py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Mail className="w-5 h-5" />
                Continuar con Email
              </button>

              <p className="text-[11px] text-bento-mute pt-2">
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthError(null); setAuthInfo(null); setAuthMode('signup'); }}
                  className="text-amber-700 font-semibold hover:underline cursor-pointer"
                >
                  Regístrate
                </button>
              </p>
            </div>
          ) : (
            <form
              onSubmit={isSignup ? handleEmailSignUp : handleEmailSignIn}
              className="space-y-3 text-left"
            >
              {isSignup && (
                <label className="block">
                  <span className="text-xs font-semibold text-bento-mute uppercase tracking-wider">Nombre</span>
                  <div className="mt-1 relative">
                    <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bento-mute" />
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-bento-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Tu nombre"
                    />
                  </div>
                </label>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-bento-mute uppercase tracking-wider">Email</span>
                <div className="mt-1 relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bento-mute" />
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-bento-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="tu@email.com"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-bento-mute uppercase tracking-wider">Contraseña</span>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-bento-mute" />
                  <input
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-bento-border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder={isSignup ? 'Mínimo 6 caracteres' : '••••••••'}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full bg-bento-ink text-white font-medium py-3 px-4 rounded-xl hover:bg-black transition-colors cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait"
              >
                {isSignup ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setAuthError(null); setAuthInfo(null); setAuthMode('choose'); }}
                  className="flex items-center gap-1 text-bento-mute hover:text-bento-ink cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Volver
                </button>
                {isSignup ? (
                  <button
                    type="button"
                    onClick={() => { setAuthError(null); setAuthInfo(null); setAuthMode('signin'); }}
                    className="text-amber-700 font-semibold hover:underline cursor-pointer"
                  >
                    Ya tengo cuenta
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={authBusy}
                    className="text-amber-700 font-semibold hover:underline cursor-pointer disabled:opacity-60"
                  >
                    He olvidado la contraseña
                  </button>
                )}
              </div>
              {!isSignup && (
                <p className="text-[11px] text-bento-mute text-center pt-1">
                  ¿Aún no tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthError(null); setAuthInfo(null); setAuthMode('signup'); }}
                    className="text-amber-700 font-semibold hover:underline cursor-pointer"
                  >
                    Regístrate
                  </button>
                </p>
              )}
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen bg-bento-bg text-bento-ink font-sans overflow-hidden gap-3 md:gap-4 flex-col">
      <header className="relative z-50 h-14 md:h-16 flex items-center justify-between px-2 md:px-5 bg-white/80 backdrop-blur border border-bento-border shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setActiveProject(null)}
            className="h-9 w-9 md:h-10 md:w-10 bg-bento-ink rounded-xl flex items-center justify-center shrink-0 hover:bg-black transition-colors cursor-pointer shadow-sm overflow-hidden"
            title="SPRINTAZ"
            aria-label="Inicio"
          >
            <img src="/SPRINTAZ/icon-512.png" className="w-full h-full object-contain " alt="" />
          </button>
          <h1 className="text-base font-bold tracking-tight shrink-0 hidden sm:block">SPRINTAZ</h1>
          {activeProject ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-nowrap">
              <ChevronRight className="w-4 h-4 text-bento-mute shrink-0 hidden sm:block" />
              <button
                onClick={() => setActiveProject(null)}
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
                    project={activeProject}
                    currentUser={user}
                    users={users}
                    activeTask={activeTask}
                    onSetActiveTask={setActiveTask}
                    onBack={() => {
                        setActiveSprint(null);
                        setActiveTask(null);
                    }}
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
                    projects={projects}
                    currentUser={user}
                    onSelectSprint={setActiveSprint}
                    onChangeProject={() => setActiveProject(null)}
                  />
                </motion.div>
              )
            ) : (
              <ProjectSelector
                currentUser={user}
                users={users}
                onSelectProject={(project) => {
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
