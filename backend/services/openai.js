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
    "tipo_reuniao": "string", // Ex: Vendas, Equipe, Start de Projeto, Feedback
    "objetivo": "string", // O objetivo principal desta reunião
    "resumo_executivo": "string", // Um resumo conciso da reunião (2 a 3 parágrafos)
    "decisoes": "string", // Tópicos e decisões importantes tomadas (formato Markdown bullet points)
    "itens_acao": ["string"], // Array de strings. Cada item é uma tarefa definida para alguém fazer.
    "aproveitamento_nota": number, // Nota de 0 a 10 avaliando o quão proveitosa foi a reunião
    "aproveitamento_motivo": "string" // Justificativa da nota, explicando por que a reunião foi ou não produtiva
  }
  `;

    try {
        const response = await openai.responses.create({
            model: 'gpt-5-mini',
            instructions: systemPrompt,
            input: `Analise a transcrição abaixo e retorne o resultado em formato json.\n\nAqui está a transcrição completa:\n\n${transcriptText}`,
            text: {
                format: {
                    type: 'json_object'
                }
            },
            reasoning: {
                effort: 'low'
            },
            store: false
        });

        const parsedData = JSON.parse(response.output_text);
        return parsedData;

    } catch (error) {
        console.error("Erro na integração com OpenAI:", error);
        throw error;
    }
}

module.exports = {
    analyzeTranscript
};
