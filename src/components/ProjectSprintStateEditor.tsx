import { Minus, Plus } from 'lucide-react';
import { SprintState } from '../types';
import { PANEL_COLORS, colorForStatus, makeStatusId } from '../lib/sprintStatuses';

interface ProjectSprintStateEditorProps {
  value: SprintState[];
  onChange: (states: SprintState[]) => void;
}

export default function ProjectSprintStateEditor({
  value,
  onChange,
}: ProjectSprintStateEditorProps) {
  const updateState = (idx: number, patch: Partial<SprintState>) => {
    onChange(value.map((state, i) => (i === idx ? { ...state, ...patch } : state)));
  };

  const addState = () => {
    onChange([
      ...value,
      {
        id: makeStatusId('sprint_state'),
        name: 'Nuevo estado',
        color: PANEL_COLORS[value.length % PANEL_COLORS.length].id,
        order: value.length,
      },
    ]);
  };

  const removeState = (idx: number) => {
    onChange(
      value
        .filter((_, i) => i !== idx)
        .map((state, order) => ({ ...state, order }))
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest">
          Estado de los sprints
        </label>
        <button
          type="button"
          onClick={addState}
          className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-bento-border text-bento-mute hover:text-bento-ink hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
          title="Crear estado"
          aria-label="Crear estado"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map((state, idx) => {
          const palette = colorForStatus(state.color);
          return (
            <div
              key={state.id}
              className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border bg-white px-2 py-1.5 shadow-sm"
              style={{
                borderColor: palette.tint,
                backgroundColor: palette.tintSoft,
              }}
            >
              <select
                value={state.color || 'slate'}
                onChange={(e) => updateState(idx, { color: e.target.value })}
                className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-white text-transparent shadow ring-1 ring-black/10"
                style={{ backgroundColor: palette.countDot }}
                title={`Color: ${palette.label}`}
                aria-label={`Color de ${state.name}`}
              >
                {PANEL_COLORS.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={state.name}
                onChange={(e) => updateState(idx, { name: e.target.value })}
                className="min-w-0 w-28 bg-transparent text-xs font-bold outline-none"
                style={{ color: palette.ink }}
                placeholder="Estado"
                aria-label="Nombre del estado"
              />
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeState(idx)}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-bento-mute hover:bg-white/70 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Quitar estado"
                  aria-label={`Quitar ${state.name}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
