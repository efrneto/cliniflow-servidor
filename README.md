# CliniFlow — Servidor em Rede

Versão do painel CliniFlow com backend próprio: pacientes, oportunidades (Radar de
Encaixes) e o Comunicador Interno agora ficam salvos em um servidor único, então
todos os computadores do consultório veem os mesmos dados e as mensagens chegam
em tempo real — não depende mais de qual computador está ligado.

## O que mudou em relação ao arquivo HTML original

- Antes: tudo salvo em `localStorage` do navegador (cada computador tinha seus
  próprios dados; o chat só sincronizava entre abas do mesmo navegador).
- Agora: um servidor Node.js guarda os dados em `data.json` e distribui
  atualizações em tempo real via WebSocket (Socket.io). Qualquer computador
  que abrir o endereço do servidor no navegador vê e edita os mesmos dados.

## Estrutura

```
servidor-cliniflow/
  server.js       -> servidor (API + WebSocket)
  package.json    -> dependências
  public/index.html -> o painel (frontend)
  data.json       -> criado automaticamente na primeira execução (não versionar)
```

## Rodar localmente (teste)

Requer [Node.js](https://nodejs.org) 18 ou mais recente instalado.

```bash
cd servidor-cliniflow
npm install
npm start
```

Acesse `http://localhost:3000` no navegador.

## Publicar na nuvem (recomendado: Railway)

Isso deixa o sistema acessível de qualquer computador do consultório (ou de
qualquer lugar), sem depender de nenhuma máquina específica ligada.

### Opção A — Railway (mais simples)

1. Crie uma conta gratuita em https://railway.app (pode entrar com GitHub).
2. Suba a pasta `servidor-cliniflow` para um repositório no GitHub (pode ser
   privado). Se preferir não usar GitHub, o Railway também aceita deploy via
   CLI (`npm install -g @railway/cli`, depois `railway up` dentro da pasta).
3. No painel do Railway: "New Project" → "Deploy from GitHub repo" → selecione
   o repositório.
4. O Railway detecta automaticamente que é um projeto Node.js (por causa do
   `package.json`) e roda `npm install` + `npm start` sozinho.
5. Em "Settings" → "Networking", clique em "Generate Domain" para gerar um
   endereço público (algo como `cliniflow-production.up.railway.app`).
6. Pronto: esse endereço é o que todos os computadores do consultório vão
   abrir no navegador (pode salvar como favorito/atalho na área de trabalho).

Custo: o Railway tem um plano gratuito limitado e planos pagos a partir de
uns poucos dólares por mês para uso contínuo — vale conferir os preços atuais
no site deles antes de decidir.

### Opção B — Render

1. Crie uma conta em https://render.com.
2. "New" → "Web Service" → conecte o repositório do GitHub com esta pasta.
3. Build Command: `npm install`  |  Start Command: `npm start`.
4. Render gera uma URL pública (`https://cliniflow.onrender.com`, por exemplo).

## Observação importante sobre os dados

Os dados ficam no arquivo `data.json` dentro do servidor. Em serviços de
nuvem gratuitos/simples, esse arquivo pode ser apagado quando o servidor
reinicia ou "dorme" por inatividade — para uso real do consultório, vale
considerar um plano pago com disco persistente (o Railway e o Render
oferecem essa opção) ou migrar para um banco de dados gerenciado mais
adiante, se o volume de dados crescer bastante.

## Usuários do sistema

Por enquanto os "usuários" (Dr. Elizeu, Dr. Lucas, Recepção) são fixos no
código, sem senha — é só uma identificação de quem está usando o computador
naquele momento, igual ao arquivo original. Se quiser adicionar login com
senha depois, é só avisar.
