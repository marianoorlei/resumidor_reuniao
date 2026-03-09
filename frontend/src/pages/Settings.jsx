import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, ShieldAlert, Copy, CheckCircle, Flame } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [openAiKey, setOpenAiKey] = useState('');
    const [firefliesKey, setFirefliesKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // URL base do backend para gerar o link do Webhook
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const webhookBaseUrl = `${backendUrl}/api/webhooks/fireflies/`;

    useEffect(() => {
        async function loadProfile() {
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setProfile(data);
                setOpenAiKey(data.openai_api_key || '');
                setFirefliesKey(data.fireflies_api_key || '');
            }
            setLoading(false);
        }
        loadProfile();
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({
                openai_api_key: openAiKey,
                fireflies_api_key: firefliesKey,
            })
            .eq('id', user.id);

        setSaving(false);
        if (!error) {
            alert("Configurações salvas com sucesso!");
        } else {
            alert("Erro ao salvar: " + error.message);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(`${webhookBaseUrl}${profile?.fireflies_webhook_secret}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="p-10">Carregando...</div>;

    return (
        <div className="p-10 max-w-4xl">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Configurações</h1>

            <form onSubmit={handleSave}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <KeyRound className="w-5 h-5 mr-2 text-blue-600" />
                            Integração OpenAI
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Configure sua chave de API para habilitar a análise de inteligência artificial.</p>
                    </div>

                    <div className="p-6">
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Chave de API OpenAI</label>
                            <input
                                type="password"
                                value={openAiKey}
                                onChange={(e) => setOpenAiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full max-w-xl px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                            />
                            <p className="mt-2 text-sm text-gray-500">Sua chave é armazenada de forma segura e criptografada (RLS) no banco de dados. Apenas você tem acesso.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <Flame className="w-5 h-5 mr-2 text-orange-500" />
                            Integração Fireflies
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Configure sua chave de API do Fireflies.ai para buscar transcrições de reuniões.</p>
                    </div>

                    <div className="p-6">
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Chave de API Fireflies</label>
                            <input
                                type="password"
                                value={firefliesKey}
                                onChange={(e) => setFirefliesKey(e.target.value)}
                                placeholder="Sua chave da API do Fireflies"
                                className="w-full max-w-xl px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 text-sm font-mono"
                            />
                            <p className="mt-2 text-sm text-gray-500">Encontre sua chave em <a href="https://app.fireflies.ai/integrations/custom/fireflies" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline hover:text-orange-700">fireflies.ai/integrations</a>. Armazenada de forma segura via RLS.</p>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 mb-8"
                >
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
            </form>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-2 text-purple-600" />
                        Fireflies Webhook
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Cole esta URL exclusiva no painel do Fireflies.ai para sincronizar suas reuniões.</p>
                </div>

                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Endpoint Único</label>
                    <div className="flex items-center max-w-2xl bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                        <input
                            type="text"
                            readOnly
                            className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-600 font-mono focus:outline-none"
                            value={`${webhookBaseUrl}${profile?.fireflies_webhook_secret || 'GERANDO...'}`}
                        />
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition flex items-center border-l border-gray-300"
                        >
                            {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start">
                        <span className="font-bold mr-1">Importante:</span> Mantenha este URL em segredo. Qualquer pessoa com ele poderia injetar falsas reuniões no seu painel.
                    </p>
                </div>
            </div>

        </div>
    );
}
