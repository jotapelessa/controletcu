import { Request, Response } from 'express';
import * as cheerio from 'cheerio';

export default async function handler(req: Request, res: Response) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { url } = req.body;

  if (!url || !url.includes('estrategiaconcursos.com.br')) {
    return res.status(400).json({ error: 'URL inválida. Forneça um link válido do Estratégia Concursos.' });
  }

  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`Erro ao acessar a página: Status ${fetchResponse.status}`);
    }

    const html = await fetchResponse.text();
    const $ = cheerio.load(html);
    
    // Tentamos extrair o texto limpo de toda a página e filtrar as linhas que parecem ser aulas
    // Isso é mais resiliente a mudanças de layout do que procurar classes CSS específicas
    const pageText = $('body').text();
    
    // Expressão regular para capturar "Aula 01 - Nome da Aula" ou "Aula 01 Nome"
    const regex = /Aula\s+(\d{1,2})\s*[-–:]?\s*([^\n\r]+)/gi;
    const aulasExtraidas: { numero: number; titulo: string }[] = [];
    const numerosEncontrados = new Set<number>();

    let match;
    while ((match = regex.exec(pageText)) !== null) {
      const numero = parseInt(match[1], 10);
      let titulo = match[2].trim();
      
      // Limpeza básica
      titulo = titulo.replace(/\s+/g, ' '); // remove múltiplos espaços
      
      // Evitar duplicidade de aulas (a página pode ter a mesma aula listada várias vezes)
      if (!numerosEncontrados.has(numero) && titulo.length > 3) {
        numerosEncontrados.add(numero);
        aulasExtraidas.push({
          numero,
          titulo: `Aula ${numero.toString().padStart(2, '0')} - ${titulo}`
        });
      }
    }

    // Ordenar numericamente
    aulasExtraidas.sort((a, b) => a.numero - b.numero);

    // Tentar pegar o nome do curso pelo title da página
    const cursoNome = $('title').text().split('-')[0].trim();

    return res.status(200).json({
      curso: cursoNome,
      totalAulas: aulasExtraidas.length,
      aulas: aulasExtraidas,
      // Se vier vazio, retornamos uma flag para o frontend saber que o scrape falhou (ex: bloqueio do Cloudflare)
      sucesso: aulasExtraidas.length > 0
    });

  } catch (error: any) {
    console.error('Erro no scraper:', error);
    return res.status(500).json({ 
      error: 'Falha ao processar o link. O site pode ter bloqueado o acesso automatizado.',
      detalhes: error.message 
    });
  }
}
