// Vercel Serverless Function
// Raspa códigos da página de Lançamentos do XBZ e busca preços em paralelo na API.
// Uso: GET /api/lancamentos-precos?password=...
//
// Env vars necessárias:
//   ADMIN_PASSWORD - senha pra liberar a busca
//   XBZ_USER       - usuário (mesmo do /api/xbz-search)
//   XBZ_PASSWD     - senha (mesmo do /api/xbz-search)
//   XBZ_WEB_TOKEN  - opcional, default "xbz"

const LANCAMENTOS_URL = 'https://www.xbzbrindes.com.br/lancamentos';
const XBZ_API = 'https://api.minhaxbz.com.br:5001/api/ruiz/consultaEstoque';

// Headers que imitam um navegador real (XBZ bloqueia User-Agent simples)
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export default async function handler(req, res) {
  try {
    // Verifica senha admin
    const password = req.query.password || req.headers['x-admin-password'];
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD nao configurada no Vercel' });
    }
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const user = process.env.XBZ_USER;
    const passwd = process.env.XBZ_PASSWD;
    const webToken = process.env.XBZ_WEB_TOKEN || 'xbz';
    if (!user || !passwd) {
      return res.status(500).json({ error: 'Credenciais XBZ nao configuradas' });
    }

    // 1) Raspa a página de lançamentos para obter os códigos
    const htmlRes = await fetch(LANCAMENTOS_URL, { headers: BROWSER_HEADERS });
    if (!htmlRes.ok) {
      return res.status(502).json({ error: `Falha ao buscar lancamentos (${htmlRes.status})` });
    }
    const html = await htmlRes.text();
    // padrão: <h3 ...><a [attrs]>CODIGO</a></h3>
    const codeRegex = /<h3[^>]*>\s*<a[^>]*>\s*(\d{4,6}[A-Z]?)\s*<\/a>/gi;
    const codes = [];
    let m;
    while ((m = codeRegex.exec(html)) !== null) {
      const c = m[1].toUpperCase();
      if (!codes.includes(c)) codes.push(c);
    }
    if (codes.length === 0) {
      return res.status(500).json({ error: 'Nenhum codigo encontrado em /lancamentos' });
    }

    // 2) Para cada código, busca preços na API do XBZ em paralelo
    const fetchPrice = async (codigo) => {
      try {
        const url = new URL(XBZ_API);
        url.searchParams.set('user', user);
        url.searchParams.set('passwd', passwd);
        url.searchParams.set('webToken', webToken);
        url.searchParams.set('browserId', '0');
        url.searchParams.set('web_tipo_id', '0');
        url.searchParams.set('web_sub_tipo_id', '0');
        url.searchParams.set('cor_id', '0');
        url.searchParams.set('tema_id', '0');
        url.searchParams.set('quantidade', '1');
        url.searchParams.set('filtro_id', '0');
        url.searchParams.set('busca', codigo);
        url.searchParams.set('preco_minimo', '0');
        url.searchParams.set('preco_maximo', '0');
        const r = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        });
        if (!r.ok) return { codigo, erro: `status ${r.status}` };
        const rawText = await r.text();
        let data;
        try {
          data = JSON.parse(rawText);
          if (typeof data === 'string') data = JSON.parse(data);
        } catch {
          return { codigo, erro: 'parse json' };
        }
        if (!Array.isArray(data) || data.length === 0) {
          return { codigo, erro: 'sem produto na conta' };
        }
        // pega a variante mais barata
        const sorted = data
          .map((p) => ({
            id: p.IdProduto,
            codigo_amigavel: p.CodigoAmigavel || codigo,
            codigo_composto: p.CodigoComposto || '',
            nome: p.Nome || '',
            preco: Number(p.PrecoVenda || 0),
            preco_formatado: p.PrecoVendaFormatado || '',
            foto: p.ImageLink || '',
            link: p.SiteLink || `https://www.xbzbrindes.com.br/${codigo.toLowerCase()}`,
            disponivel: p.Disponivel === 'SIM',
            variantes: data.length,
          }))
          .sort((a, b) => a.preco - b.preco);
        return sorted[0];
      } catch (e) {
        return { codigo, erro: e?.message || 'erro' };
      }
    };

    // Concorrência limitada para não estourar o XBZ — batches de 20
    const BATCH = 20;
    const results = [];
    for (let i = 0; i < codes.length; i += BATCH) {
      const slice = codes.slice(i, i + BATCH);
      const r = await Promise.all(slice.map(fetchPrice));
      results.push(...r);
    }

    // Separa OK / erro
    const produtos = results.filter((p) => !p.erro && p.preco > 0)
      .sort((a, b) => a.preco - b.preco);
    const erros = results.filter((p) => p.erro);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      total_codigos: codes.length,
      total_encontrados: produtos.length,
      total_sem_acesso: erros.length,
      produtos,
      erros,
      atualizado_em: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'erro ao processar' });
  }
}
