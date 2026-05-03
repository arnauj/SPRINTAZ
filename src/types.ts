export type UserRole = 'Admin' | 'Teacher' | 'Collaborator';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  teams?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team?: string;
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export interface SprintStatus {
  id: string;
  name: string;
  color?: string;
  order: number;
  substatus?: SprintStatus[];
}

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  team?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  statuses?: SprintStatus[];
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export type TaskStatus = string;

export interface TaskComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export interface TaskLink {
  id: string;
  title: string;
  url: string;
}

export interface TaskEmailAlert {
  id: string;
  status: TaskStatus;
  email: string;
}

export interface Task {
  id: string;
  sprintId: string;
  name: string;
  description: string;
  weight: number;
  status: TaskStatus;
  color?: string;
  assignedTo?: string;
  finishedBy?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  comments?: TaskComment[];
  links?: TaskLink[];
  emailAlerts?: TaskEmailAlert[];
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
