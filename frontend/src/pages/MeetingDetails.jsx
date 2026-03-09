import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MeetingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMeeting() {
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setMeeting(data);
            }
            setLoading(false);
        }
        fetchMeeting();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-500">Carregando...</div>;
    if (!meeting) return <div className="p-10 text-center text-red-500">Reunião não encontrada.</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-[#1e293b] text-white px-6 py-4 flex items-center justify-between shrink-0">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white bg-[#0f172a] px-3 py-1.5 rounded border border-gray-700 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                </button>

                <h1 className="text-xl font-semibold absolute left-1/2 -translate-x-1/2">
                    Detalhes da Reunião
                </h1>

                <div className="flex items-center space-x-4 text-sm font-medium">
                    <span className="text-gray-300">
                        {meeting.date ? format(parseISO(meeting.date), "d 'de' MMMM, yyyy", { locale: ptBR }) : ''}
                    </span>
                    {meeting.meeting_type && (
                        <span className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold">
                            {meeting.meeting_type}
                        </span>
                    )}
                </div>
            </header>

            {/* Main Content: Duas Colunas */}
            <div className="flex-1 flex overflow-hidden p-6 gap-6">

                {/* Left Column: AI Analysis */}
                <div className="w-1/2 flex flex-col overflow-y-auto pr-2 space-y-4 pb-20">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Análise da IA</h2>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Objetivo da Reunião</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{meeting.objective || 'Não disponível'}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Resumo Executivo</h3>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{meeting.executive_summary || 'Não disponível'}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Decisões-Chave</h3>
                        <ul className="space-y-2">
                            {meeting.decisions ? meeting.decisions.split('\n').filter(Boolean).map((decision, idx) => (
                                <li key={idx} className="flex items-start space-x-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                    <span className="text-gray-700 text-sm leading-relaxed">{decision.replace(/^- /, '')}</span>
                                </li>
                            )) : <li className="text-gray-500 text-sm">Não disponível</li>}
                        </ul>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Itens de Ação</h3>
                        <ul className="space-y-3">
                            {meeting.action_items && Array.isArray(meeting.action_items) ?
                                meeting.action_items.map((item, idx) => (
                                    <li key={idx} className="flex items-start space-x-3">
                                        <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-gray-700 text-sm leading-relaxed leading-snug">{item}</span>
                                    </li>
                                )) : <p className="text-gray-500 text-sm">Não disponível</p>}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Full Transcript */}
                <div className="w-1/2 flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                        <h2 className="text-xl font-bold text-gray-900">Transcrição Completa</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {meeting.transcript && Array.isArray(meeting.transcript) ? (
                            meeting.transcript.map((msg, index) => (
                                <div key={index} className="bg-gray-100/70 p-4 rounded-xl">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-semibold text-gray-900 text-sm">{msg.speaker_name || `Participante ${msg.speaker_id}`}</span>
                                        <span className="text-xs text-gray-500">
                                            {msg.start_time ? new Date(msg.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 text-sm leading-relaxed">{msg.text}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 text-sm py-10">Transcrição não disponível.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
