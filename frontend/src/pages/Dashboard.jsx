import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Calendar as CalendarIcon, ChevronDown, Clock, Send, Loader2, Trash2, RefreshCw, X, Pencil, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    const [reprocessing, setReprocessing] = useState(null);
    const [editingTitle, setEditingTitle] = useState(null);
    const [editTitleValue, setEditTitleValue] = useState('');
    const navigate = useNavigate();

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3456';

    useEffect(() => {
        fetchMeetings();
    }, []);

    // Extrair tipos únicos das reuniões
    const meetingTypes = useMemo(() => {
        const types = meetings
            .map(m => m.meeting_type)
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();
        return types;
    }, [meetings]);

    // Filtrar reuniões
    const filteredMeetings = useMemo(() => {
        return meetings.filter(m => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchTitle = m.title?.toLowerCase().includes(term);
                const matchSummary = m.executive_summary?.toLowerCase().includes(term);
                if (!matchTitle && !matchSummary) return false;
            }
            if (dateFilter && m.date) {
                const meetingDate = format(parseISO(m.date), 'yyyy-MM-dd');
                if (meetingDate !== dateFilter) return false;
            }
            if (typeFilter) {
                if (m.meeting_type !== typeFilter) return false;
            }
            return true;
        });
    }, [meetings, searchTerm, dateFilter, typeFilter]);

    const hasActiveFilters = searchTerm || dateFilter || typeFilter;

    function clearFilters() {
        setSearchTerm('');
        setDateFilter('');
        setTypeFilter('');
    }

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

    function handleTitleClick(e, meeting) {
        e.stopPropagation();
        setEditingTitle(meeting.id);
        setEditTitleValue(meeting.title);
    }

    async function handleTitleSave(e, meetingId) {
        e.stopPropagation();
        const newTitle = editTitleValue.trim();
        if (!newTitle) {
            setEditingTitle(null);
            return;
        }

        const { error } = await supabase
            .from('meetings')
            .update({ title: newTitle })
            .eq('id', meetingId);

        if (!error) {
            setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, title: newTitle } : m));
            setToast({ message: 'Título atualizado!', type: 'success' });
        } else {
            setToast({ message: 'Erro ao salvar título.', type: 'error' });
        }
        setEditingTitle(null);
    }

    async function handleReprocess(e, meeting) {
        e.stopPropagation();
        if (reprocessing) return;

        setReprocessing(meeting.id);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('fireflies_webhook_secret')
                .eq('id', user.id)
                .single();

            if (profileError || !profile?.fireflies_webhook_secret) {
                setToast({ message: 'Webhook secret não encontrado. Verifique seu perfil.', type: 'error' });
                setReprocessing(null);
                return;
            }

            const response = await fetch(`${backendUrl}/api/meetings/${meeting.id}/reprocess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_secret: profile.fireflies_webhook_secret }),
            });

            if (response.ok) {
                setToast({ message: 'Análise da IA reenviada! Aguarde alguns segundos e atualize.', type: 'success' });
                setTimeout(() => fetchMeetings(), 8000);
            } else {
                const data = await response.json();
                setToast({ message: data.error || 'Erro ao reprocessar.', type: 'error' });
            }
        } catch (err) {
            setToast({ message: 'Erro de conexão: ' + err.message, type: 'error' });
        }
        setReprocessing(null);
    }

    const badgeColors = [
        'bg-blue-500/20 text-blue-300',
        'bg-teal-500/20 text-teal-300',
        'bg-indigo-500/20 text-indigo-300',
        'bg-orange-500/20 text-orange-300',
        'bg-pink-500/20 text-pink-300',
        'bg-emerald-500/20 text-emerald-300',
        'bg-amber-500/20 text-amber-300',
        'bg-cyan-500/20 text-cyan-300',
        'bg-rose-500/20 text-rose-300',
        'bg-sky-500/20 text-sky-300',
        'bg-fuchsia-500/20 text-fuchsia-300',
        'bg-lime-500/20 text-lime-300',
    ];

    const getBadgeColor = (type) => {
        if (!type) return 'bg-gray-500/20 text-gray-400';
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        return badgeColors[Math.abs(hash) % badgeColors.length];
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
                <h1 className="text-3xl font-extrabold text-gray-100 mb-4 md:mb-0">Painel de Reuniões</h1>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-8 py-2 border border-gray-600 rounded-md leading-5 bg-[#1a1d27] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Pesquisar reuniões..."
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-300">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            />
                            <button className={`flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0f1117] ${dateFilter ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-600 text-gray-400 bg-[#1a1d27] hover:bg-[#252836]'}`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFilter ? format(parseISO(dateFilter), "d MMM yyyy", { locale: ptBR }) : 'Data'}
                                {dateFilter && (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); setDateFilter(''); }}
                                        className="ml-2 hover:text-blue-300 cursor-pointer"
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                className={`flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0f1117] ${typeFilter ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-600 text-gray-400 bg-[#1a1d27] hover:bg-[#252836]'}`}
                            >
                                {typeFilter || 'Tipo de Reunião'}
                                {typeFilter ? (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); setTypeFilter(''); setShowTypeDropdown(false); }}
                                        className="ml-2 hover:text-blue-300 cursor-pointer"
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                ) : (
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                )}
                            </button>

                            {showTypeDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-[#1e2130] border border-gray-700/50 rounded-lg shadow-lg z-20 py-1">
                                        {meetingTypes.length === 0 ? (
                                            <p className="px-4 py-2 text-sm text-gray-500">Nenhum tipo encontrado</p>
                                        ) : (
                                            meetingTypes.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => { setTypeFilter(type); setShowTypeDropdown(false); }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700/40 transition ${typeFilter === type ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-gray-300'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros ativos */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-sm text-gray-500">Filtros:</span>
                    {searchTerm && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                            Busca: "{searchTerm}"
                            <button onClick={() => setSearchTerm('')}><X className="h-3 w-3" /></button>
                        </span>
                    )}
                    {dateFilter && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                            Data: {format(parseISO(dateFilter), "d MMM yyyy", { locale: ptBR })}
                            <button onClick={() => setDateFilter('')}><X className="h-3 w-3" /></button>
                        </span>
                    )}
                    {typeFilter && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                            Tipo: {typeFilter}
                            <button onClick={() => setTypeFilter('')}><X className="h-3 w-3" /></button>
                        </span>
                    )}
                    <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-300 underline ml-1">
                        Limpar todos
                    </button>
                </div>
            )}

            {/* Processar reunião manualmente */}
            <div className="bg-[#1a1d27] border border-gray-700/50 rounded-lg p-5 shadow-sm mb-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Processar reunião por ID do Fireflies</h2>
                <form onSubmit={handleManualProcess} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                        type="text"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="Cole o Meeting ID do Fireflies aqui..."
                        className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-sm font-mono bg-[#252836] text-gray-100 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
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
                    <p className={`mt-3 text-sm ${processMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {processMessage.text}
                    </p>
                )}
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredMeetings.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 bg-[#1a1d27] rounded-lg border border-gray-700/50">
                            {hasActiveFilters
                                ? 'Nenhuma reunião encontrada com os filtros aplicados.'
                                : 'Nenhuma reunião encontrada. Configure seu Webhook no app Fireflies.'}
                        </div>
                    ) : (
                        filteredMeetings.map((m) => (
                            <div
                                key={m.id}
                                className="bg-[#1a1d27] border border-gray-700/50 rounded-lg p-5 shadow-sm hover:border-gray-600 transition-all cursor-pointer"
                                onClick={() => navigate(`/reuniao/${m.id}`)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    {editingTitle === m.id ? (
                                        <div className="flex items-center gap-2 flex-1 pr-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editTitleValue}
                                                onChange={(e) => setEditTitleValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleTitleSave(e, m.id);
                                                    if (e.key === 'Escape') setEditingTitle(null);
                                                }}
                                                autoFocus
                                                className="flex-1 px-2 py-1 text-lg font-bold text-gray-100 bg-[#252836] border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={(e) => handleTitleSave(e, m.id)}
                                                className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition"
                                                title="Salvar"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingTitle(null); }}
                                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700/40 transition"
                                                title="Cancelar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <h3
                                            className="text-lg font-bold text-gray-100 pr-2 cursor-pointer hover:text-blue-400 transition"
                                            onClick={(e) => handleTitleClick(e, m)}
                                            title="Clique para editar o título"
                                        >
                                            {m.title}
                                        </h3>
                                    )}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={(e) => handleReprocess(e, m)}
                                            disabled={reprocessing === m.id}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition disabled:opacity-50"
                                            title="Refazer análise da IA"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${reprocessing === m.id ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, m.id, m.title)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                                            title="Excluir reunião"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center text-sm text-gray-500 mb-3 space-x-2">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {m.date ? format(parseISO(m.date), "d 'de' MMM, yyyy", { locale: ptBR }) : 'Sem data'} • {m.duration ? `${m.duration}m` : '0m'}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeColor(m.meeting_type)}`}>
                                        {m.meeting_type || 'Geral'}
                                    </span>
                                    {m.productivity_score != null && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ml-2 ${
                                            m.productivity_score >= 7 ? 'bg-green-500/15 text-green-400' :
                                            m.productivity_score >= 4 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'
                                        }`}>
                                            {m.productivity_score}/10
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-400 text-sm truncate">
                                    <span className="font-semibold text-gray-200">Resumo da IA: </span>
                                    {m.executive_summary || 'Sem resumo disponível.'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Footer */}
            <footer className="text-center text-xs text-gray-600 py-6 mt-8">
                Desenvolvido por Leonardo Freire
            </footer>
        </div>
    );
}
