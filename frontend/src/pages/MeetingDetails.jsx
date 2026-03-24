import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, Share2, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Toast from '../components/Toast';

export default function MeetingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

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

    function buildShareText() {
        if (!meeting) return '';
        const dateStr = meeting.date ? format(parseISO(meeting.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
        const lines = [];

        lines.push(`📋 *${meeting.title}*`);
        if (dateStr) lines.push(`📅 ${dateStr} • ${meeting.duration || 0}min`);
        if (meeting.meeting_type) lines.push(`🏷️ Tipo: ${meeting.meeting_type}`);
        lines.push('');

        if (meeting.objective) {
            lines.push('🎯 *Objetivo*');
            lines.push(meeting.objective);
            lines.push('');
        }

        if (meeting.executive_summary) {
            lines.push('📝 *Resumo Executivo*');
            lines.push(meeting.executive_summary);
            lines.push('');
        }

        if (meeting.decisions) {
            lines.push('✅ *Decisões-Chave*');
            lines.push(meeting.decisions);
            lines.push('');
        }

        if (meeting.action_items && Array.isArray(meeting.action_items) && meeting.action_items.length > 0) {
            lines.push('📌 *Itens de Ação*');
            meeting.action_items.forEach((item, i) => {
                lines.push(`${i + 1}. ${item}`);
            });
            lines.push('');
        }

        if (meeting.productivity_score != null) {
            lines.push(`📊 *Aproveitamento: ${meeting.productivity_score}/10*`);
            if (meeting.productivity_reason) lines.push(meeting.productivity_reason);
            lines.push('');
        }

        lines.push('_Gerado por D3tech IA Meet_');
        return lines.join('\n');
    }

    function handleShare() {
        const text = buildShareText();

        if (navigator.share) {
            navigator.share({ title: meeting.title, text }).catch(() => {});
        } else {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(whatsappUrl, '_blank');
        }
    }

    function handleGeneratePDF() {
        if (!meeting) return;

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 20;

        // Cores
        const darkBlue = [30, 41, 59];
        const blue = [37, 99, 235];
        const green = [34, 197, 94];
        const yellow = [234, 179, 8];
        const red = [239, 68, 68];
        const gray = [107, 114, 128];
        const lightGray = [243, 244, 246];

        // Header com fundo escuro
        doc.setFillColor(...darkBlue);
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(meeting.title || 'Reunião', margin, 15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dateStr = meeting.date ? format(parseISO(meeting.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
        const headerInfo = [dateStr, meeting.duration ? `${meeting.duration} min` : '', meeting.meeting_type || ''].filter(Boolean).join('  •  ');
        doc.text(headerInfo, margin, 25);

        if (meeting.productivity_score != null) {
            const scoreText = `Aproveitamento: ${meeting.productivity_score}/10`;
            const scoreWidth = doc.getTextWidth(scoreText) + 8;
            const scoreColor = meeting.productivity_score >= 7 ? green : meeting.productivity_score >= 4 ? yellow : red;
            doc.setFillColor(...scoreColor);
            doc.roundedRect(pageWidth - margin - scoreWidth, 18, scoreWidth, 8, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(scoreText, pageWidth - margin - scoreWidth + 4, 23.5);
        }

        y = 45;

        function checkPageBreak(needed) {
            if (y + needed > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                y = 20;
            }
        }

        function addSection(title, content) {
            if (!content) return;
            checkPageBreak(30);

            doc.setFillColor(...blue);
            doc.rect(margin, y, 3, 8, 'F');
            doc.setTextColor(...darkBlue);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin + 6, y + 6);
            y += 12;

            doc.setTextColor(55, 65, 81);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(content, contentWidth - 6);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, margin + 6, y);
                y += 5;
            });
            y += 6;
        }

        addSection('Objetivo da Reunião', meeting.objective);
        addSection('Resumo Executivo', meeting.executive_summary);

        if (meeting.decisions) {
            checkPageBreak(30);
            doc.setFillColor(...blue);
            doc.rect(margin, y, 3, 8, 'F');
            doc.setTextColor(...darkBlue);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Decisoes-Chave', margin + 6, y + 6);
            y += 14;

            const decisions = meeting.decisions.split('\n').filter(Boolean);
            decisions.forEach(decision => {
                checkPageBreak(8);
                doc.setFillColor(...green);
                doc.circle(margin + 8, y - 1, 1.5, 'F');
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const text = decision.replace(/^- /, '');
                const lines = doc.splitTextToSize(text, contentWidth - 16);
                lines.forEach((line, i) => {
                    checkPageBreak(6);
                    doc.text(line, margin + 12, y);
                    y += 5;
                });
                y += 2;
            });
            y += 4;
        }

        if (meeting.productivity_score != null) {
            checkPageBreak(30);
            doc.setFillColor(...blue);
            doc.rect(margin, y, 3, 8, 'F');
            doc.setTextColor(...darkBlue);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Aproveitamento da Reuniao', margin + 6, y + 6);
            y += 14;

            const barWidth = 80;
            const barHeight = 6;
            doc.setFillColor(...lightGray);
            doc.roundedRect(margin + 6, y, barWidth, barHeight, 2, 2, 'F');
            const fillWidth = (meeting.productivity_score / 10) * barWidth;
            const barColor = meeting.productivity_score >= 7 ? green : meeting.productivity_score >= 4 ? yellow : red;
            doc.setFillColor(...barColor);
            doc.roundedRect(margin + 6, y, fillWidth, barHeight, 2, 2, 'F');

            doc.setTextColor(...barColor);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${meeting.productivity_score}/10`, margin + barWidth + 12, y + 5);
            y += 12;

            if (meeting.productivity_reason) {
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(meeting.productivity_reason, contentWidth - 6);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, margin + 6, y);
                    y += 5;
                });
            }
            y += 6;
        }

        const actionItemsList = Array.isArray(meeting.action_items) ? meeting.action_items : meeting.action_items?.data;
        if (actionItemsList && Array.isArray(actionItemsList) && actionItemsList.length > 0) {
            checkPageBreak(30);
            doc.setFillColor(...blue);
            doc.rect(margin, y, 3, 8, 'F');
            doc.setTextColor(...darkBlue);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Itens de Acao', margin + 6, y + 6);
            y += 14;

            actionItemsList.forEach((item, idx) => {
                checkPageBreak(12);
                doc.setDrawColor(...gray);
                doc.setLineWidth(0.3);
                doc.rect(margin + 6, y - 3, 4, 4);
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                
                let titleText = '';
                let descText = '';
                
                if (typeof item === 'string') {
                    titleText = item;
                } else {
                    titleText = `[${item.prioridade || 'Prazo não definido'}] ${item.titulo}`;
                    descText = item.descricao || '';
                }

                const titleLines = doc.splitTextToSize(titleText, contentWidth - 18);
                titleLines.forEach((line) => {
                    checkPageBreak(6);
                    doc.text(line, margin + 13, y);
                    y += 5;
                });
                
                if (descText) {
                    doc.setFont('helvetica', 'normal');
                    const descLines = doc.splitTextToSize(descText, contentWidth - 18);
                    descLines.forEach((line) => {
                        checkPageBreak(6);
                        doc.text(line, margin + 13, y);
                        y += 5;
                    });
                }
                
                y += 3;
            });
            y += 4;
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFillColor(...lightGray);
            doc.rect(0, pageH - 12, pageWidth, 12, 'F');
            doc.setTextColor(...gray);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Gerado por D3tech IA Meet', margin, pageH - 5);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, pageH - 5);
        }

        const fileName = (meeting.title || 'reuniao').replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '_');
        doc.save(`${fileName}.pdf`);
        setToast({ message: 'PDF gerado com sucesso!', type: 'success' });
    }

    if (loading) return <div className="p-10 text-center text-gray-500">Carregando...</div>;
    if (!meeting) return <div className="p-10 text-center text-red-400">Reunião não encontrada.</div>;

    return (
        <div className="flex flex-col min-h-screen lg:h-screen bg-[#0f1117]">
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}

            {/* Header */}
            <header className="bg-[#141620] text-white px-4 lg:px-6 py-4 flex flex-wrap items-center justify-between shrink-0 gap-2 border-b border-gray-700/50">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-400 hover:text-white bg-[#1a1d27] px-3 py-1.5 rounded border border-gray-700/50 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                </button>

                <h1 className="text-lg lg:text-xl font-semibold order-last w-full text-center lg:order-none lg:w-auto lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                    {meeting.title || 'Detalhes da Reunião'}
                </h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white bg-[#1a1d27] px-3 py-1.5 rounded border border-gray-700/50 transition"
                        title="Compartilhar no WhatsApp"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Compartilhar</span>
                    </button>
                    <button
                        onClick={handleGeneratePDF}
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white bg-[#1a1d27] px-3 py-1.5 rounded border border-gray-700/50 transition"
                        title="Gerar PDF"
                    >
                        <FileDown className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                    </button>

                    <div className="hidden lg:flex items-center space-x-4 text-sm font-medium ml-2">
                        <span className="text-gray-400">
                            {meeting.date ? format(parseISO(meeting.date), "d 'de' MMMM, yyyy", { locale: ptBR }) : ''}
                        </span>
                        {meeting.meeting_type && (
                            <span className="bg-blue-500/15 text-blue-300 px-3 py-1 rounded-full text-xs font-bold">
                                {meeting.meeting_type}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content: Duas Colunas */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-6">

                {/* Left Column: AI Analysis */}
                <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto pr-0 lg:pr-2 space-y-4 pb-20">
                    <h2 className="text-2xl font-bold text-gray-100 mb-2">Análise da IA</h2>

                    <div className="bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 p-5">
                        <h3 className="text-sm font-bold text-gray-200 mb-2">Objetivo da Reunião</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{meeting.objective || 'Não disponível'}</p>
                    </div>

                    <div className="bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 p-5">
                        <h3 className="text-sm font-bold text-gray-200 mb-2">Resumo Executivo</h3>
                        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">{meeting.executive_summary || 'Não disponível'}</p>
                    </div>

                    <div className="bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 p-5">
                        <h3 className="text-sm font-bold text-gray-200 mb-3">Decisões-Chave</h3>
                        <ul className="space-y-2">
                            {meeting.decisions ? meeting.decisions.split('\n').filter(Boolean).map((decision, idx) => (
                                <li key={idx} className="flex items-start space-x-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                    <span className="text-gray-400 text-sm leading-relaxed">{decision.replace(/^- /, '')}</span>
                                </li>
                            )) : <li className="text-gray-600 text-sm">Não disponível</li>}
                        </ul>
                    </div>

                    {meeting.productivity_score != null && (
                        <div className="bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 p-5">
                            <h3 className="text-sm font-bold text-gray-200 mb-3">Aproveitamento da Reunião</h3>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            meeting.productivity_score >= 7 ? 'bg-green-500' :
                                            meeting.productivity_score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${(meeting.productivity_score / 10) * 100}%` }}
                                    />
                                </div>
                                <span className={`text-lg font-bold ${
                                    meeting.productivity_score >= 7 ? 'text-green-400' :
                                    meeting.productivity_score >= 4 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {meeting.productivity_score}/10
                                </span>
                            </div>
                            {meeting.productivity_reason && (
                                <p className="text-gray-500 text-sm leading-relaxed">{meeting.productivity_reason}</p>
                            )}
                        </div>
                    )}

                    <div className="bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 p-5">
                        <h3 className="text-sm font-bold text-gray-200 mb-3">Itens de Ação</h3>
                        <ul className="space-y-3">
                            {(() => {
                                const items = Array.isArray(meeting.action_items) ? meeting.action_items : meeting.action_items?.data;
                                return items && Array.isArray(items) && items.length > 0 ? (
                                    items.map((item, idx) => {
                                        // Retrocompatibilidade para quando as tarefas eram apenas strings
                                        if (typeof item === 'string') {
                                            return (
                                                <li key={idx} className="flex items-start space-x-3">
                                                    <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-[#252836] text-blue-500 focus:ring-blue-500 focus:ring-offset-[#1a1d27]" />
                                                    <span className="text-gray-400 text-sm leading-relaxed leading-snug">{item}</span>
                                                </li>
                                            );
                                        }

                                        // Novo formato rico
                                        let priorityColor = 'bg-gray-500/20 text-gray-400';
                                        let dotColor = 'bg-gray-400';
                                        const prio = (item.prioridade || '').toLowerCase();
                                        
                                        if (prio.includes('24h') || prio.includes('urgent')) {
                                            priorityColor = 'bg-red-500/15 text-red-400';
                                            dotColor = 'bg-red-500';
                                        } else if (prio.includes('48h')) {
                                            priorityColor = 'bg-orange-500/15 text-orange-400';
                                            dotColor = 'bg-orange-500';
                                        } else if (prio.includes('semana')) {
                                            priorityColor = 'bg-yellow-500/15 text-yellow-400';
                                            dotColor = 'bg-yellow-500';
                                        }

                                        return (
                                            <li key={idx} className="flex items-start gap-4 p-3 bg-[#252836] rounded-lg border border-gray-700/50">
                                                <div className="pt-0.5 shrink-0">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColor}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                                        {item.prioridade || 'sem prazo'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-200 mb-1">{item.titulo}</p>
                                                    {item.descricao && <p className="text-xs text-gray-400 leading-relaxed">{item.descricao}</p>}
                                                </div>
                                            </li>
                                        );
                                    })
                                ) : <p className="text-gray-600 text-sm">Não disponível</p>;
                            })}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Full Transcript */}
                <div className="w-full lg:w-1/2 flex flex-col h-[500px] lg:h-full bg-[#1a1d27] rounded-xl shadow-sm border border-gray-700/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700/50 bg-[#141620]">
                        <h2 className="text-xl font-bold text-gray-100">Transcrição Completa</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(() => {
                            const tz = Array.isArray(meeting.transcript) ? meeting.transcript : meeting.transcript?.data;
                            return tz && Array.isArray(tz) && tz.length > 0 ? (
                                tz.map((msg, index) => (
                                <div key={index} className="bg-[#252836] p-4 rounded-xl">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-semibold text-gray-200 text-sm">{msg.speaker_name || `Participante ${msg.speaker_id}`}</span>
                                        <span className="text-xs text-gray-500">
                                            {msg.start_time ? new Date(msg.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed">{msg.text}</p>
                                </div>
                            ))
                            ) : (
                                <div className="text-center text-gray-600 text-sm py-10">Transcrição não disponível.</div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
