import { SprintStatus } from '../types';
import { PANEL_COLORS, makeStatusId, colorForStatus } from '../lib/sprintStatuses';
import { Plus, Trash2, CornerDownRight } from 'lucide-react';

interface SprintStatusEditorProps {
  value: SprintStatus[];
  onChange: (statuses: SprintStatus[]) => void;
}

export default function SprintStatusEditor({ value, onChange }: SprintStatusEditorProps) {
  const updateParent = (idx: number, patch: Partial<SprintStatus>) => {
    const next = value.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  };

  const removeParent = (idx: number) => {
    const next = value
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, order: i }));
    onChange(next);
  };

  const addParent = () => {
    const next = [
      ...value,
      {
        id: makeStatusId(),
        name: 'Nuevo panel',
        color: PANEL_COLORS[value.length % PANEL_COLORS.length].id,
        order: value.length,
      } as SprintStatus,
    ];
    onChange(next);
  };

  const addSubstatus = (parentIdx: number) => {
    const parent = value[parentIdx];
    const subs = parent.substatus || [];
    const newSub: SprintStatus = {
      id: makeStatusId('sub'),
      name: 'Subpanel',
      color: parent.color,
      order: subs.length,
    };
    updateParent(parentIdx, { substatus: [...subs, newSub] });
  };

  const updateSubstatus = (parentIdx: number, subIdx: number, patch: Partial<SprintStatus>) => {
    const parent = value[parentIdx];
    const subs = (parent.substatus || []).map((s, i) =>
      i === subIdx ? { ...s, ...patch } : s
    );
    updateParent(parentIdx, { substatus: subs });
  };

  const removeSubstatus = (parentIdx: number, subIdx: number) => {
    const parent = value[parentIdx];
    const subs = (parent.substatus || [])
      .filter((_, i) => i !== subIdx)
      .map((s, i) => ({ ...s, order: i }));
    updateParent(parentIdx, { substatus: subs });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-bento-mute uppercase tracking-widest">
          Paneles del sprint
        </label>
        <span className="text-[10px] text-bento-mute italic">
          Define columnas y subpaneles
        </span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1 -mr-1">
        {value.map((panel, pIdx) => {
          const subs = panel.substatus || [];
          return (
            <div
              key={panel.id}
              className="border border-bento-border rounded-lg p-2 bg-white/60 space-y-2"
            >
              <PanelRow
                name={panel.name}
                color={panel.color || 'slate'}
                onName={(name) => updateParent(pIdx, { name })}
                onColor={(color) => updateParent(pIdx, { color })}
                onAddSub={() => addSubstatus(pIdx)}
                onDelete={value.length > 1 ? () => removeParent(pIdx) : undefined}
              />

              {subs.length > 0 && (
                <div className="pl-5 space-y-1.5 border-l-2 border-bento-border ml-2">
                  {subs.map((sub, sIdx) => (
                    <SubRow
                      key={sub.id}
                      name={sub.name}
                      color={sub.color || panel.color || 'slate'}
                      onName={(name) => updateSubstatus(pIdx, sIdx, { name })}
                      onColor={(color) => updateSubstatus(pIdx, sIdx, { color })}
                      onDelete={() => removeSubstatus(pIdx, sIdx)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addParent}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-bento-mute hover:text-bento-ink border-2 border-dashed border-bento-border hover:border-amber-400 hover:bg-amber-50/40 rounded-lg transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar panel
      </button>
    </div>
  );
}

interface PanelRowProps {
  name: string;
  color: string;
  onName: (n: string) => void;
  onColor: (c: string) => void;
  onAddSub: () => void;
  onDelete?: () => void;
}

function PanelRow({ name, color, onName, onColor, onAddSub, onDelete }: PanelRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <ColorPicker color={color} onChange={onColor} />
      <input
        type="text"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Nombre del panel"
        className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-white border border-bento-border focus:border-amber-400 rounded-md outline-none text-bento-ink"
      />
      <button
        type="button"
        onClick={onAddSub}
        title="Agregar subpanel"
        className="p-1.5 hover:bg-amber-100 rounded text-bento-mute hover:text-amber-700 transition-colors cursor-pointer shrink-0"
      >
        <CornerDownRight className="w-3.5 h-3.5" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Eliminar panel"
          className="p-1.5 hover:bg-rose-100 rounded text-bento-mute hover:text-rose-500 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface SubRowProps {
  key?: string;
  name: string;
  color: string;
  onName: (n: string) => void;
  onColor: (c: string) => void;
  onDelete: () => void;
}

function SubRow({ name, color, onName, onColor, onDelete }: SubRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <ColorPicker color={color} onChange={onColor} />
      <input
        type="text"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Nombre del subpanel"
        className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-bento-border focus:border-amber-400 rounded-md outline-none text-bento-ink"
      />
      <button
        type="button"
        onClick={onDelete}
        title="Eliminar subpanel"
        className="p-1 hover:bg-rose-100 rounded text-bento-mute hover:text-rose-500 transition-colors cursor-pointer shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const current = colorForStatus(color);
  return (
    <div className="relative shrink-0">
      <select
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-7 h-7 rounded-full border-2 border-white shadow ring-1 ring-bento-border cursor-pointer text-transparent"
        style={{ backgroundColor: current.countDot }}
        aria-label="Color del panel"
        title={`Color: ${current.label}`}
      >
        {PANEL_COLORS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
