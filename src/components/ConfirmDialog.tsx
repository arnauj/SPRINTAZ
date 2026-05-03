import { ReactNode, useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    pendingRef.current?.resolve(confirmed);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const dialog = (
    <ConfirmDialog
      options={pending}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, confirmDialog: dialog };
}

function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: PendingConfirm | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tone = options?.tone || 'danger';
  const toneClasses =
    tone === 'danger'
      ? 'bg-rose-100 border-rose-200 text-rose-600'
      : 'bg-amber-100 border-amber-200 text-amber-700';

  return (
    <AnimatePresence>
      {options && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="w-full max-w-sm bg-white border border-bento-border shadow-xl p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${toneClasses}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-dialog-title" className="text-base font-bold text-bento-ink">
                  {options.title}
                </h3>
                <div className="mt-1 text-sm text-bento-mute leading-relaxed">
                  {options.message}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t border-bento-border">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-bento-mute hover:text-bento-ink transition-colors cursor-pointer"
              >
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-2 text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {options.confirmLabel || 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
