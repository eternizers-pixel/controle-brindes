-- ============================================================
-- CONTROLE DE BRINDES — Migração Postgres / Supabase
-- ============================================================

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        TEXT NOT NULL UNIQUE,
    cor         TEXT DEFAULT '#6366f1',
    criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- BRINDES
CREATE TABLE IF NOT EXISTS public.brindes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                TEXT NOT NULL,
    descricao           TEXT,
    foto                TEXT,
    categoria_id        BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
    quantidade_estoque  INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    estoque_minimo      INTEGER NOT NULL DEFAULT 5 CHECK (estoque_minimo >= 0),
    custo_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
    status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brindes_nome      ON public.brindes(nome);
CREATE INDEX IF NOT EXISTS idx_brindes_status    ON public.brindes(status);
CREATE INDEX IF NOT EXISTS idx_brindes_categoria ON public.brindes(categoria_id);

-- DESTINATARIOS
CREATE TABLE IF NOT EXISTS public.destinatarios (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        TEXT NOT NULL,
    tipo        TEXT NOT NULL CHECK (tipo IN ('comunidade','escola','evento','associacao','cliente','outro')),
    contato     TEXT,
    observacao  TEXT,
    criado_em   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (nome, tipo)
);
CREATE INDEX IF NOT EXISTS idx_destinatarios_tipo ON public.destinatarios(tipo);
CREATE INDEX IF NOT EXISTS idx_destinatarios_nome ON public.destinatarios(nome);

-- MOVIMENTACOES
CREATE TABLE IF NOT EXISTS public.movimentacoes (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    brinde_id         BIGINT NOT NULL REFERENCES public.brindes(id) ON DELETE CASCADE,
    tipo              TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
    quantidade        INTEGER NOT NULL CHECK (quantidade > 0),
    data              DATE NOT NULL,
    custo_unitario    NUMERIC(12,2) NOT NULL DEFAULT 0,
    custo_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
    destinatario_id   BIGINT REFERENCES public.destinatarios(id) ON DELETE SET NULL,
    destinatario_nome TEXT,
    tipo_solicitante  TEXT CHECK (tipo_solicitante IN ('comunidade','escola','evento','associacao','cliente','outro')),
    responsavel       TEXT,
    observacao        TEXT,
    criado_em         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mov_brinde       ON public.movimentacoes(brinde_id);
CREATE INDEX IF NOT EXISTS idx_mov_tipo         ON public.movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_data         ON public.movimentacoes(data);
CREATE INDEX IF NOT EXISTS idx_mov_solicitante  ON public.movimentacoes(tipo_solicitante);
CREATE INDEX IF NOT EXISTS idx_mov_destinatario ON public.movimentacoes(destinatario_id);

-- VIEW de estoque com nível calculado
CREATE OR REPLACE VIEW public.vw_estoque AS
SELECT
    b.id, b.nome, b.descricao, b.foto,
    b.quantidade_estoque, b.estoque_minimo, b.custo_unitario,
    (b.quantidade_estoque * b.custo_unitario) AS valor_total,
    b.status, c.nome AS categoria_nome, c.cor AS categoria_cor,
    CASE
        WHEN b.quantidade_estoque <= 0 THEN 'critico'
        WHEN b.quantidade_estoque <= b.estoque_minimo THEN 'baixo'
        ELSE 'saudavel'
    END AS nivel_estoque
FROM public.brindes b
LEFT JOIN public.categorias c ON c.id = b.categoria_id;

-- RPC: registrar entrada (transação atômica)
CREATE OR REPLACE FUNCTION public.registrar_entrada(
    p_brinde_id BIGINT, p_quantidade INTEGER, p_data DATE, p_observacao TEXT
) RETURNS BIGINT AS $$
DECLARE v_custo NUMERIC(12,2); v_id BIGINT;
BEGIN
    SELECT custo_unitario INTO v_custo FROM public.brindes WHERE id = p_brinde_id;
    IF v_custo IS NULL THEN RAISE EXCEPTION 'Brinde nao encontrado'; END IF;

    INSERT INTO public.movimentacoes (brinde_id, tipo, quantidade, data, custo_unitario, custo_total, observacao)
    VALUES (p_brinde_id, 'entrada', p_quantidade, p_data, v_custo, p_quantidade * v_custo, p_observacao)
    RETURNING id INTO v_id;

    UPDATE public.brindes
       SET quantidade_estoque = quantidade_estoque + p_quantidade,
           atualizado_em = NOW()
     WHERE id = p_brinde_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: registrar saída (valida estoque + cadastra destinatario)
CREATE OR REPLACE FUNCTION public.registrar_saida(
    p_brinde_id BIGINT, p_quantidade INTEGER, p_data DATE,
    p_destinatario TEXT, p_tipo_solicitante TEXT, p_responsavel TEXT, p_observacao TEXT
) RETURNS BIGINT AS $$
DECLARE v_custo NUMERIC(12,2); v_estoque INTEGER; v_dest_id BIGINT; v_id BIGINT;
BEGIN
    SELECT custo_unitario, quantidade_estoque INTO v_custo, v_estoque
      FROM public.brindes WHERE id = p_brinde_id;
    IF v_custo IS NULL THEN RAISE EXCEPTION 'Brinde nao encontrado'; END IF;
    IF p_quantidade > v_estoque THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponivel: %', v_estoque;
    END IF;

    INSERT INTO public.destinatarios (nome, tipo) VALUES (p_destinatario, p_tipo_solicitante)
    ON CONFLICT (nome, tipo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_dest_id;

    INSERT INTO public.movimentacoes
      (brinde_id, tipo, quantidade, data, custo_unitario, custo_total,
       destinatario_id, destinatario_nome, tipo_solicitante, responsavel, observacao)
    VALUES
      (p_brinde_id, 'saida', p_quantidade, p_data, v_custo, p_quantidade * v_custo,
       v_dest_id, p_destinatario, p_tipo_solicitante, p_responsavel, p_observacao)
    RETURNING id INTO v_id;

    UPDATE public.brindes
       SET quantidade_estoque = quantidade_estoque - p_quantidade,
           atualizado_em = NOW()
     WHERE id = p_brinde_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: estornar movimentação
CREATE OR REPLACE FUNCTION public.estornar_movimentacao(p_id BIGINT)
RETURNS VOID AS $$
DECLARE v_tipo TEXT; v_qty INTEGER; v_brinde BIGINT;
BEGIN
    SELECT tipo, quantidade, brinde_id INTO v_tipo, v_qty, v_brinde
      FROM public.movimentacoes WHERE id = p_id;
    IF v_tipo IS NULL THEN RAISE EXCEPTION 'Movimentacao nao encontrada'; END IF;

    IF v_tipo = 'entrada' THEN
      UPDATE public.brindes SET quantidade_estoque = GREATEST(quantidade_estoque - v_qty, 0) WHERE id = v_brinde;
    ELSE
      UPDATE public.brindes SET quantidade_estoque = quantidade_estoque + v_qty WHERE id = v_brinde;
    END IF;
    DELETE FROM public.movimentacoes WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed das categorias
INSERT INTO public.categorias (nome, cor) VALUES
  ('Boné','#ef4444'),('Camiseta','#3b82f6'),('Squeeze','#10b981'),
  ('Chaveiro','#f59e0b'),('Sacola','#8b5cf6'),('Caneta','#ec4899'),('Outro','#6b7280')
ON CONFLICT (nome) DO NOTHING;

-- Acesso público (sem login)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
