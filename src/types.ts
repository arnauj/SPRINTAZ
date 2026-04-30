export type UserRole = 'Teacher' | 'Collaborator';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  sprintId: string;
  name: string;
  description: string;
  weight: number;
  status: TaskStatus;
  assignedTo?: string;
  finishedBy?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
