import { SprintStatus } from '../types';

export interface PanelColor {
  id: string;
  label: string;
  dotClass: string;
  tint: string;
  tintSoft: string;
  ink: string;
  countDot: string;
}

export const PANEL_COLORS: PanelColor[] = [
  { id: 'slate',   label: 'Pizarra',    dotClass: 'bg-slate-400',   tint: '#cbd5e1', tintSoft: '#e2e8f0', ink: '#334155', countDot: '#64748b' },
  { id: 'blue',    label: 'Azul',       dotClass: 'bg-blue-400',    tint: '#bfdbfe', tintSoft: '#dbeafe', ink: '#1e40af', countDot: '#3b82f6' },
  { id: 'amber',   label: 'Ámbar',      dotClass: 'bg-amber-400',   tint: '#fde68a', tintSoft: '#fef3c7', ink: '#92400e', countDot: '#f59e0b' },
  { id: 'emerald', label: 'Esmeralda',  dotClass: 'bg-emerald-400', tint: '#a7f3d0', tintSoft: '#d1fae5', ink: '#065f46', countDot: '#10b981' },
  { id: 'rose',    label: 'Rosa',       dotClass: 'bg-rose-400',    tint: '#fecdd3', tintSoft: '#ffe4e6', ink: '#9f1239', countDot: '#f43f5e' },
  { id: 'indigo',  label: 'Índigo',     dotClass: 'bg-indigo-400',  tint: '#c7d2fe', tintSoft: '#e0e7ff', ink: '#3730a3', countDot: '#6366f1' },
  { id: 'pink',    label: 'Magenta',    dotClass: 'bg-pink-400',    tint: '#fbcfe8', tintSoft: '#fce7f3', ink: '#9d174d', countDot: '#ec4899' },
  { id: 'cyan',    label: 'Cian',       dotClass: 'bg-cyan-400',    tint: '#a5f3fc', tintSoft: '#cffafe', ink: '#155e75', countDot: '#06b6d4' },
];

export const PANEL_COLOR_BY_ID: Record<string, PanelColor> = Object.fromEntries(
  PANEL_COLORS.map(c => [c.id, c])
);

export const FALLBACK_COLOR: PanelColor = {
  id: 'slate', label: 'Pizarra', dotClass: 'bg-slate-400',
  tint: '#e5e7eb', tintSoft: '#f3f4f6', ink: '#374151', countDot: '#9ca3af',
};

export function colorForStatus(color?: string): PanelColor {
  if (!color) return FALLBACK_COLOR;
  return PANEL_COLOR_BY_ID[color] || FALLBACK_COLOR;
}

export function defaultSprintStatuses(): SprintStatus[] {
  return [
    { id: 'backlog',     name: 'Backlog',     color: 'slate',   order: 0 },
    { id: 'todo',        name: 'To Do',       color: 'blue',    order: 1 },
    { id: 'in_progress', name: 'In Progress', color: 'amber',   order: 2 },
    { id: 'done',        name: 'Done',        color: 'emerald', order: 3 },
  ];
}

export function makeStatusId(prefix = 's'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface FlatStatus extends SprintStatus {
  parentId?: string;
}

/**
 * Flattens nested SprintStatus into a single ordered list:
 * each parent is followed immediately by its substatuses (in order).
 */
export function flattenStatuses(statuses: SprintStatus[] | undefined): FlatStatus[] {
  if (!statuses || statuses.length === 0) return [];
  const out: FlatStatus[] = [];
  [...statuses].sort((a, b) => a.order - b.order).forEach(parent => {
    out.push({
      id: parent.id,
      name: parent.name,
      color: parent.color,
      order: parent.order,
    });
    [...(parent.substatus || [])]
      .sort((a, b) => a.order - b.order)
      .forEach(sub => {
        out.push({
          id: sub.id,
          name: sub.name,
          color: sub.color,
          order: sub.order,
          parentId: parent.id,
        });
      });
  });
  return out;
}
