// Vercel Serverless Function
// Lê códigos da aba "Lançamentos" do XBZ de uma lista cacheada e busca preços em paralelo na API.
// (A raspagem live do xbzbrindes.com.br é bloqueada — 403 do Cloudflare/WAF deles
//  contra IPs de datacenter. Por isso usamos lista cacheada que é atualizada manualmente
//  via Claude in Chrome quando o XBZ muda os lançamentos.)
//
// Uso: GET /api/lancamentos-precos?password=...
//
// Env vars necessárias:
//   ADMIN_PASSWORD - senha pra liberar a busca
//   XBZ_USER       - usuário (mesmo do /api/xbz-search)
//   XBZ_PASSWD     - senha (mesmo do /api/xbz-search)
//   XBZ_WEB_TOKEN  - opcional, default "xbz"

import { LANCAMENTOS_CODIGOS, ATUALIZADO_EM } from './lancamentos-codes.js';

const XBZ_API = 'https://api.minhaxbz.com.br:5001/api/ruiz/consultaEstoque';

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

    // 1) Lista de códigos vem do cache em lancamentos-codes.js
    //    (atualizar manualmente via Claude in Chrome quando XBZ trocar os lançamentos)
    const codes = [...new Set(LANCAMENTOS_CODIGOS)];
    if (codes.length === 0) {
      return res.status(500).json({ error: 'Lista de codigos cacheada esta vazia' });
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
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
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
      lista_codigos_atualizada_em: ATUALIZADO_EM,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'erro ao processar' });
  }
}
