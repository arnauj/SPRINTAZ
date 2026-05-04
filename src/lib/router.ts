const BASE_PATH = '/SPRINTAZ';

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const createSlug = (name: string, id: string) => {
  return `${slugify(name)}--${id}`;
};

export const getIdFromSlug = (slug: string) => {
  if (!slug) return null;
  const parts = slug.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : null;
};

export const getPath = (project?: { name: string, id: string }, sprint?: { name: string, id: string }, task?: { name: string, id: string }) => {
  let path = BASE_PATH;
  if (project) {
    path += `/p/${createSlug(project.name, project.id)}`;
    if (sprint) {
      path += `/s/${createSlug(sprint.name, sprint.id)}`;
      if (task) {
        path += `/t/${createSlug(task.name, task.id)}`;
      }
    }
  } else {
      path += '/';
  }
  return path;
};

export interface RouteState {
  projectId: string | null;
  sprintId: string | null;
  taskId: string | null;
}

export const parsePath = (path: string): RouteState => {
  // Remove BASE_PATH if present
  const normalizedPath = path.startsWith(BASE_PATH) 
    ? path.slice(BASE_PATH.length) 
    : path;
    
  const parts = normalizedPath.split('/').filter(Boolean);
  let projectId = null;
  let sprintId = null;
  let taskId = null;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'p') projectId = getIdFromSlug(parts[i + 1]);
    if (parts[i] === 's') sprintId = getIdFromSlug(parts[i + 1]);
    if (parts[i] === 't') taskId = getIdFromSlug(parts[i + 1]);
  }

  return { projectId, sprintId, taskId };
};
