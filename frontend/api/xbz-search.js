// Vercel Serverless Function
// Proxy de busca no portal XBZ. Esconde credenciais nas env vars.
// Uso: GET /api/xbz-search?busca=10101
//
// Env vars necessárias no Vercel:
//   XBZ_USER       (ex: E0178462)
//   XBZ_PASSWD     (ex: KRUGER_XBZ)
//   XBZ_WEB_TOKEN  (opcional, default "xbz")

export default async function handler(req, res) {
  try {
    const busca = String(req.query.busca || '').trim();
    if (!busca) {
      return res.status(400).json({ error: 'parametro "busca" obrigatorio' });
    }

    const user = process.env.XBZ_USER;
    const passwd = process.env.XBZ_PASSWD;
    const webToken = process.env.XBZ_WEB_TOKEN || 'xbz';

    if (!user || !passwd) {
      return res.status(500).json({
        error: 'Credenciais XBZ nao configuradas. Defina XBZ_USER e XBZ_PASSWD nas env vars do Vercel.',
      });
    }

    const url = new URL('https://api.minhaxbz.com.br:5001/api/ruiz/consultaEstoque');
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
    url.searchParams.set('busca', busca);
    url.searchParams.set('preco_minimo', '0');
    url.searchParams.set('preco_maximo', '0');

    const r = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const rawText = await r.text();
    // O XBZ ás vezes retorna a string JSON dentro de outra string JSON (duplo encoding).
    // Faz parse e, se ainda for string, parseia novamente.
    let data;
    try {
      data = JSON.parse(rawText);
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      data = null;
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: `XBZ retornou status ${r.status}`,
      });
    }

    // Simplifica e devolve apenas o que o frontend precisa
    const produtos = (Array.isArray(data) ? data : []).map((p) => ({
      id: p.IdProduto,
      codigo: p.CodigoAmigavel || p.CodigoXbz || '',
      codigo_composto: p.CodigoComposto || '',
      nome: p.Nome || '',
      preco: Number(p.PrecoVenda || 0),
      preco_formatado: p.PrecoVendaFormatado || '',
      foto: p.ImageLink || '',
      link: p.SiteLink || '',
      disponivel: p.Disponivel === 'SIM',
      venda_minima: p.VendaMinima || 1,
    }));

    // Cache leve no edge (5 minutos)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ produtos });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'erro ao buscar no XBZ' });
  }
}
