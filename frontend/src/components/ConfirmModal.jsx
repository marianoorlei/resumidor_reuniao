import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-[#1e2130] rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-gray-700/50">
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-full shrink-0 ${danger ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
                        <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
                        <p className="mt-1 text-sm text-gray-400">{message}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                            danger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
