require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { fetchMeetingTranscript } = require('./services/fireflies');
const { analyzeTranscript } = require('./services/openai');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Aviso: SUPABASE_URL ou SUPABASE_ANON_KEY não configurado.");
}

const supabase = createClient(supabaseUrl || 'https://mock.supabase.co', supabaseKey || 'mock_key');

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.post('/api/webhooks/fireflies/:user_secret', async (req, res) => {
  const { user_secret } = req.params;
  const { meetingId } = req.body;

  console.log('Webhook recebido:', JSON.stringify(req.body));

  if (!meetingId) {
    return res.status(400).json({ error: 'meetingId é obrigatório' });
  }

  try {
    // 1. Validar e buscar perfil pelo `user_secret` usando a RPC (contorna RLS de forma segura)
    const { data: profile, error: profileError } = await supabase
      .rpc('get_profile_by_webhook_secret', { p_secret: user_secret });

    if (profileError || !profile || profile.length === 0) {
      return res.status(401).json({ error: 'Webhook Secret Inválido ou Usuário não encontrado.' });
    }

    const { id: userId, openai_api_key, fireflies_api_key } = profile[0];

    if (!openai_api_key) {
      console.error(`Usuário ${userId} não configurou a OpenAI API Key.`);
      return res.status(400).json({ error: 'OpenAI API Key não configurada para este usuário.' });
    }

    if (!fireflies_api_key) {
      console.error(`Usuário ${userId} não configurou a Fireflies API Key.`);
      return res.status(400).json({ error: 'Fireflies API Key não configurada para este usuário.' });
    }

    res.status(202).json({ message: 'Webhook recebido, processamento iniciado assincronamente.' });

    // 2. Processar a reunião assincronamente
    processMeeting(meetingId, userId, openai_api_key, fireflies_api_key).catch(err => {
      console.error('Erro no processAssync:', err);
    });

  } catch (error) {
    console.error('Erro no Webhook:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno no webhook' });
    }
  }
});

async function processMeeting(firefliesId, userId, openAiKey, firefliesApiKey) {
  console.log(`Processando reunião ${firefliesId} para o usuário ${userId}`);

  // A. Buscar transcrição e metadados do Fireflies
  const transcriptData = await fetchMeetingTranscript(firefliesId, firefliesApiKey);
  if (!transcriptData) throw new Error("Transcrição não encontrada.");

  // B. Salvar metadados iniciais com status "processing"
  const { data: meetingRecordId, error: insertError } = await supabase
    .rpc('process_webhook_meeting', {
      p_user_id: userId,
      p_fireflies_id: firefliesId,
      p_title: transcriptData.title || 'Reunião Importada',
      p_date: transcriptData.date ? new Date(transcriptData.date).toISOString() : new Date().toISOString(),
      p_duration: transcriptData.duration || 0,
      p_meeting_type: null,
      p_objective: null,
      p_executive_summary: null,
      p_decisions: null,
      p_action_items: null,
      p_transcript: null,
      p_status: 'processing',
      p_productivity_score: null,
      p_productivity_reason: null
    });

  if (insertError) {
    console.error("Erro ao inserir reunião inicial:", insertError);
    return;
  }

  try {
    // C. Analisar com OpenAI
    const analysis = await analyzeTranscript(transcriptData.text, openAiKey);

    // D. Atualizar com resultado completo
    await supabase.rpc('process_webhook_meeting', {
      p_user_id: userId,
      p_fireflies_id: firefliesId,
      p_title: analysis.titulo || transcriptData.title || 'Reunião Importada',
      p_date: transcriptData.date ? new Date(transcriptData.date).toISOString() : new Date().toISOString(),
      p_duration: transcriptData.duration || 0,
      p_meeting_type: analysis.tipo_reuniao,
      p_objective: analysis.objetivo,
      p_executive_summary: analysis.resumo_executivo,
      p_decisions: analysis.decisoes,
      p_action_items: analysis.itens_acao,
      p_transcript: transcriptData.sentences,
      p_status: 'completed',
      p_productivity_score: analysis.aproveitamento_nota,
      p_productivity_reason: analysis.aproveitamento_motivo
    });

    console.log(`Reunião ${firefliesId} processada com sucesso!`);
  } catch (error) {
    console.error(`Falha ao processar reunião ${firefliesId}:`, error);
    if (meetingRecordId) {
      await supabase.rpc('process_webhook_meeting', {
        p_user_id: userId,
        p_fireflies_id: firefliesId,
        p_title: transcriptData.title || 'Reunião Importada',
        p_date: transcriptData.date ? new Date(transcriptData.date).toISOString() : new Date().toISOString(),
        p_duration: transcriptData.duration || 0,
        p_meeting_type: null,
        p_objective: null,
        p_executive_summary: null,
        p_decisions: null,
        p_action_items: null,
        p_transcript: null,
        p_status: 'error',
        p_productivity_score: null,
        p_productivity_reason: null
      });
    }
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
