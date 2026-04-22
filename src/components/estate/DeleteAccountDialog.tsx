import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  userEmail?: string;
}

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  open, onClose, onDeleted, userEmail,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'warning' | 'confirm'>('warning');

  if (!open) return null;

  const canDelete = confirmText === 'DELETE';

  const reset = () => {
    setConfirmText('');
    setError(null);
    setStage('warning');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc('delete_user_account');
      if (rpcErr) throw rpcErr;
      await supabase.auth.signOut();
      reset();
      onDeleted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account. Please try again or contact support.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto bg-[#1a2744] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Delete your account?</h2>
                {userEmail && <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>}
              </div>
            </div>

            {stage === 'warning' && (
              <>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                  This will permanently delete your Last Chapter Vault account and all associated data, including:
                </p>
                <ul className="text-sm text-gray-400 space-y-1.5 mb-5 ml-1">
                  <li>• All uploaded documents, photos &amp; videos</li>
                  <li>• Your will, beneficiaries &amp; assets</li>
                  <li>• Password vault entries</li>
                  <li>• Executor contacts &amp; legacy messages</li>
                  <li>• Security events &amp; session history</li>
                  <li>• Your profile and account credentials</li>
                </ul>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-5">
                  <p className="text-sm text-red-300 font-medium">
                    This action cannot be undone. Your data cannot be recovered.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStage('confirm')}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {stage === 'confirm' && (
              <>
                <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                  To confirm, type <span className="font-mono font-bold text-red-400">DELETE</span> in the box below:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  autoFocus
                  disabled={loading}
                  className="w-full px-4 py-2.5 text-sm bg-[#0f1f3d] border border-[#2d3f5e] focus:border-red-500 rounded-lg text-white placeholder-gray-500 outline-none transition-colors mb-4"
                />
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!canDelete || loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteAccountDialog;