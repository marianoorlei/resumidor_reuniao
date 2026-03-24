const OpenAI = require('openai');

async function analyzeTranscript(transcriptText, openAiKey) {
    // Inicializa o SDK com a chave do usuário final (Multi-tenant seguro)
    const openai = new OpenAI({
        apiKey: openAiKey,
    });

    const systemPrompt = `
  Você é um assistente sênior especialista em análise de reuniões executivas e técnicas.
  Sua única tarefa é ler a transcrição de uma reunião e extrair as seguintes informações cruciais.
  Você SEMPRE deve retornar um JSON perfeitamente válido contendo as exatas chaves abaixo.

  Retorne APENAS o JSON, sem markdown ou texto em volta:
  {
    "titulo": "string", // Um título curto, claro e descritivo para a reunião (máximo 60 caracteres). Ex: "Alinhamento Sprint 12 - Time de Produto", "Reunião Comercial - Proposta Cliente XYZ"
    "tipo_reuniao": "string", // SEMPRE em português. Valores possíveis: "Equipe", "Vendas", "Projeto", "Alinhamento", "Feedback", "Entrevista", "Planejamento", "Retrospectiva", "Daily", "Brainstorm", "Treinamento", "1:1", "Apresentação", "Análise"
    "objetivo": "string", // O objetivo principal desta reunião
    "resumo_executivo": "string", // Um resumo conciso da reunião (2 a 3 parágrafos)
    "decisoes": "string", // Tópicos e decisões importantes tomadas (formato Markdown bullet points)
    "itens_acao": [
      {
        "prioridade": "string", // Valores exatos permitidos: "24h", "48h", "semana", "sem urgência"
        "titulo": "string", // O título curto da tarefa a ser feita
        "descricao": "string" // Uma descrição mais detalhada de quem deve fazer e como (1 a 2 frases)
      }
    ], // Array de objetos. Cada item é uma ação identificada na reunião. Se não houver, retorne array vazio [].
    "aproveitamento_nota": number, // Nota de 0 a 10 avaliando o quão proveitosa foi a reunião
    "aproveitamento_motivo": "string" // Justificativa da nota, explicando por que a reunião foi ou não produtiva
  }
  `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analise a transcrição abaixo e retorne o resultado em formato json.\n\nAqui está a transcrição completa:\n\n${transcriptText}` }
            ],
            response_format: { type: 'json_object' }
        });

        const outputText = response.choices[0].message.content;
        const parsedData = JSON.parse(outputText);
        console.log("OpenAI retornou:", JSON.stringify(parsedData, null, 2));
        return parsedData;

    } catch (error) {
        console.error("Erro na integração com OpenAI:", error);
        throw error;
    }
}

module.exports = {
    analyzeTranscript
};
