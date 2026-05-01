import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { OperationType, Task, Sprint, User, Notification } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // --- Users ---
  async createUser(user: User) {
    try {
      await setDoc(doc(db, 'users', user.uid), user);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    }
  },

  async getUser(uid: string): Promise<User | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      return docSnap.exists() ? docSnap.data() as User : null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
      return [];
    }
  },

  subscribeUsers(callback: (users: User[]) => void) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as User));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'users'));
  },

  async deleteUser(uid: string) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}`);
    }
  },

  async updateUserRole(uid: string, role: User['role']) {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async updateUser(uid: string, updates: Partial<Omit<User, 'uid'>>) {
    try {
      await updateDoc(doc(db, 'users', uid), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async uploadUserPhoto(uid: string, file: File): Promise<string> {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const photoRef = ref(storage, `user-photos/${uid}/${Date.now()}.${ext}`);
      await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(photoRef);
      return photoURL;
    } catch (e) {
      console.error('Photo upload error:', e);
      throw new Error('No se pudo subir la foto. Inténtalo de nuevo.');
    }
  },

  // --- Sprints ---
  async createSprint(sprint: Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'sprints'), {
        ...sprint,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'sprints');
    }
  },

  subscribeSprints(callback: (sprints: Sprint[]) => void) {
    const q = query(collection(db, 'sprints'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sprint)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'sprints'));
  },

  async deleteSprint(sprintId: string) {
    try {
      await deleteDoc(doc(db, 'sprints', sprintId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sprints/${sprintId}`);
    }
  },

  // --- Tasks ---
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'tasks');
    }
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${taskId}`);
    }
  },

  async deleteTask(taskId: string) {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}`);
    }
  },

  subscribeTasks(sprintId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, 'tasks'), 
      where('sprintId', '==', sprintId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'tasks'));
  },

  // --- Notifications ---
  async createNotification(userId: string, message: string) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        message,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'notifications');
    }
  },

  subscribeNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'notifications'));
  }
};
