'use client';

import { X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** red-tinted confirm button style (for destructive actions) */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'Do you really want to delete or close this item?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-bg-secondary rounded-2xl p-6 m-4 max-w-sm w-full shadow-card-shadow-lg border border-border-color animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary active:scale-90 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message */}
        <p className="text-text-secondary text-sm mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-primary font-semibold
                       hover:bg-border-color active:scale-[0.98] transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-semibold active:scale-[0.98] transition-all ${
              destructive
                ? 'bg-danger text-white hover:bg-danger-hover'
                : 'bg-accent text-text-on-accent hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
