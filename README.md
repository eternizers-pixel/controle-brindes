# 🎁 Controle de Brindes

Sistema web para controle de brindes da empresa entregues a comunidades, escolas,
eventos, associações e clientes. **Sem backend próprio** — usa Supabase
(Postgres) como banco e API automática, com deploy no Vercel.

## 🧱 Stack

| Camada     | Tecnologia                                                  |
| ---------- | ----------------------------------------------------------- |
| Frontend   | React 18 + Vite + Tailwind CSS + Chart.js + Lucide Icons    |
| Banco/API  | **Supabase** (Postgres + PostgREST + RPC functions)         |
| Deploy     | **Vercel**                                                  |
| Versão     | **GitHub**                                                  |
| Exportação | jsPDF + AutoTable (PDF) e SheetJS (XLSX)                    |

## 📁 Estrutura

```
controle-brindes/
├── README.md
├── package.json              # scripts atalho (dev/build/preview)
├── supabase/
│   └── migration.sql         # script SQL aplicado no Supabase
└── frontend/
    ├── .env                  # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── lib/supabase.js         # cliente Supabase
        ├── api/client.js           # camada de dados (queries + RPC)
        ├── components/             # BrindeCard, EntradaModal, SaidaModal, Layout, etc.
        ├── pages/                  # Dashboard, Estoque, Brindes, Movimentações, Relatórios
        └── utils/                  # helpers e exportação
```

> A pasta `backend/` que aparecia na versão anterior **não é mais usada**.
> Você pode apagá-la com segurança (`rm -rf backend` ou via Explorer).

## 🗃️ Modelo de dados (Supabase / Postgres)

```
categorias       (id, nome, cor)
brindes          (id, nome, descricao, foto, categoria_id,
                  quantidade_estoque, estoque_minimo, custo_unitario, status)
destinatarios    (id, nome, tipo, contato, observacao)
movimentacoes    (id, brinde_id, tipo[entrada|saida], quantidade, data,
                  custo_unitario, custo_total,
                  destinatario_id, destinatario_nome, tipo_solicitante,
                  responsavel, observacao)
vw_estoque       (view com nível de estoque calculado)
```

**Functions RPC** (chamadas como `supabase.rpc(...)`):
- `registrar_entrada(p_brinde_id, p_quantidade, p_data, p_observacao)`
- `registrar_saida(p_brinde_id, p_quantidade, p_data, p_destinatario, p_tipo_solicitante, p_responsavel, p_observacao)` — valida estoque antes
- `estornar_movimentacao(p_id)` — reverte uma entrada/saída

Todas as funções são `SECURITY DEFINER` (rodam como dono da tabela) e fazem a
atualização do estoque em transação atômica.

## 🚀 Como rodar localmente

Pré-requisitos: **Node.js 18+** (com npm).

```bash
npm install                # instala dependências da raiz (vazio, só atalho)
npm run install:all        # instala dependências do frontend
npm run dev                # sobe Vite em http://localhost:5173
```

### Variáveis de ambiente

O arquivo `frontend/.env` precisa conter:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Encontre esses valores em **Supabase Dashboard → Project Settings → API Keys**.

## 🌐 Deploy no Vercel

1. Suba o repositório para o GitHub (passos abaixo).
2. No Vercel, importe o repositório.
3. **Root Directory**: `frontend`
4. **Framework Preset**: Vite (detecta automaticamente)
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Deploy. Cada push no GitHub redeploya automaticamente.

## 🐙 Subir para o GitHub

```bash
cd controle-brindes
git init -b main
git add .
git commit -m "feat: sistema de controle de brindes"
git remote add origin https://github.com/SEU_USUARIO/controle-brindes.git
git push -u origin main
```

Se você tem a CLI do GitHub (`gh`):

```bash
gh repo create controle-brindes --public --source=. --remote=origin --push
```

## 🔐 Segurança

Esta versão é **pública sem autenticação** — qualquer pessoa com o link consegue
ler e gravar. Para uso corporativo, recomenda-se ativar **Supabase Auth**
(e-mail/senha ou OAuth) e habilitar **Row Level Security** nas tabelas.

A chave `sb_publishable_...` é segura para exposição no frontend, mas só faz
sentido quando há RLS configurado. Sem RLS, qualquer pessoa que descubra a
chave pode mexer no banco.

## 🎨 Cores de status

- 🟢 **Saudável** — estoque > mínimo
- 🟡 **Baixo** — estoque ≤ mínimo
- 🔴 **Crítico/Zerado** — estoque ≤ 0

---

Sistema entregue pronto para produção em frontend-only stack (Supabase + Vercel + GitHub).
