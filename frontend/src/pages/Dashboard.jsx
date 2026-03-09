import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Calendar as CalendarIcon, ChevronDown, Clock, Send, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualId, setManualId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [processMessage, setProcessMessage] = useState(null);
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const navigate = useNavigate();

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchMeetings();
    }, []);

    async function fetchMeetings() {
        const { data, error } = await supabase
            .from('meetings')
            .select('*')
            .order('date', { ascending: false });

        if (!error && data) {
            setMeetings(data);
        }
        setLoading(false);
    }

    async function handleManualProcess(e) {
        e.preventDefault();
        if (!manualId.trim()) return;

        setProcessing(true);
        setProcessMessage(null);

        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('fireflies_webhook_secret')
                .eq('id', user.id)
                .single();

            if (profileError || !profile?.fireflies_webhook_secret) {
                setProcessMessage({ type: 'error', text: 'Webhook secret não encontrado. Verifique seu perfil.' });
                setProcessing(false);
                return;
            }

            const webhookUrl = `${backendUrl}/api/webhooks/fireflies/${profile.fireflies_webhook_secret}`;

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId: manualId.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setProcessMessage({ type: 'success', text: 'Reunião enviada para processamento! Aguarde alguns segundos e atualize a página.' });
                setManualId('');
                setTimeout(() => fetchMeetings(), 8000);
            } else {
                setProcessMessage({ type: 'error', text: data.error || 'Erro ao processar reunião.' });
            }
        } catch (err) {
            setProcessMessage({ type: 'error', text: 'Erro de conexão com o backend: ' + err.message });
        }

        setProcessing(false);
    }

    function handleDeleteClick(e, meetingId, title) {
        e.stopPropagation();
        setDeleteModal({ id: meetingId, title });
    }

    async function confirmDelete() {
        if (!deleteModal) return;
        const { id: meetingId } = deleteModal;
        setDeleteModal(null);

        const { error } = await supabase
            .from('meetings')
            .delete()
            .eq('id', meetingId);

        if (!error) {
            setMeetings(prev => prev.filter(m => m.id !== meetingId));
            setToast({ message: 'Reunião excluída com sucesso!', type: 'success' });
        } else {
            setToast({ message: 'Erro ao excluir: ' + error.message, type: 'error' });
        }
    }

    const getBadgeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'sales meeting':
            case 'vendas':
                return 'bg-blue-500 text-white';
            case 'team sync':
            case 'equipe':
                return 'bg-teal-500 text-white';
            case 'project kickoff':
            case 'projeto':
                return 'bg-purple-500 text-white';
            case 'one-on-one':
            case '1on1':
                return 'bg-orange-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="p-4 md:p-10 max-w-5xl w-full overflow-hidden">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {deleteModal && (
                <ConfirmModal
                    title="Excluir reunião"
                    message={`Tem certeza que deseja excluir "${deleteModal.title}"? Esta ação não pode ser desfeita.`}
                    confirmText="Excluir"
                    cancelText="Cancelar"
                    danger
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal(null)}
                />
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4 md:mb-0">Painel de Reuniões</h1>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Pesquisar reuniões..."
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <CalendarIcon className="mr-2 h-4 w-4" /> Data
                        </button>

                        <button className="flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Tipo de Reunião <ChevronDown className="ml-2 h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Processar reunião manualmente */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Processar reunião por ID do Fireflies</h2>
                <form onSubmit={handleManualProcess} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Cole o Meeting ID do Fireflies aqui..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                        disabled={processing}
                    />
                    <button
                        type="submit"
                        disabled={processing || !manualId.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {processing ? 'Processando...' : 'Processar'}
                    </button>
                </form>
                {processMessage && (
                    <p className={`mt-3 text-sm ${processMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {processMessage.text}
                    </p>
                )}
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {meetings.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                            Nenhuma reunião encontrada. Configure seu Webhook no app Fireflies.
                        </div>
                    ) : (
                        meetings.map((m) => (
                            <div
                                key={m.id}
                                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow transition-shadow cursor-pointer"
                                onClick={() => navigate(`/reuniao/${m.id}`)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">{m.title}</h3>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, m.id, m.title)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                                        title="Excluir reunião"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center text-sm text-gray-500 mb-3 space-x-2">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {m.date ? format(parseISO(m.date), 'MMM d, yyyy') : 'Sem data'} • {m.duration ? `${m.duration}m` : '0m'}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeColor(m.meeting_type)}`}>
                                        {m.meeting_type || 'Geral'}
                                    </span>
                                </div>

                                <p className="text-gray-700 text-sm truncate">
                                    <span className="font-semibold text-gray-900">Resumo da IA: </span>
                                    {m.executive_summary || 'Sem resumo disponível.'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
