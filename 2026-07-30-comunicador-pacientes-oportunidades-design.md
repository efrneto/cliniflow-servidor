# CliniFlow — Melhorias no Comunicador e no fluxo de Pacientes/Oportunidades

Data: 2026-07-30
Status: aprovado para planejamento de implementação

## Contexto

O CliniFlow já está em produção (`https://cliniflow-servidor.onrender.com`), com backend
Node/Express + Socket.io e frontend em `public/index.html`. Este documento reúne um
conjunto de melhorias levantadas pelo Dr. Elizeu para o Comunicador Interno e para o
fluxo de Pacientes e Oportunidades (Radar de Encaixes), definidas em sessão de
brainstorming.

## Escopo

Duas frentes independentes, que podem ser implementadas e entregues separadamente:

1. Comunicador (chat interno)
2. Pacientes e Oportunidades (Radar de Encaixes)

Mais uma frente transversal:

3. Responsividade completa para celular

## 1. Comunicador

### 1.1 Reações por mensagem

Cada mensagem ganha um ícone de reação próprio (separado do menu de opções), visível ao
passar o mouse (sempre visível no layout mobile). Ao clicar, abre um mini seletor com um
conjunto pequeno de emojis (reaproveitar os emojis já usados no seletor de inserção de
texto: 😊 🦷 👍 ❤️ ⚠️ ✅ 🙏 🔥 ⭐ 💡). A reação escolhida substitui/soma à contagem já
existente por emoji na mensagem (comportamento de contagem já existe no backend).

### 1.2 Menu de opções da mensagem (três pontos)

Ícone "⋮" separado do ícone de reação, com duas ações:

- **Responder**: abre o campo de digitação com uma prévia da mensagem original citada
  acima do texto novo (estilo WhatsApp). A mensagem enviada carrega uma referência
  (`replyToId`) para a mensagem original, exibida como citação na bolha.
- **Apagar**: remove o conteúdo da mensagem para os dois lados da conversa, mas mantém
  um marcador visual "mensagem apagada" no lugar (soft delete, não remove o registro do
  histórico).

### 1.3 Indicador de "digitando" (correção)

O evento `chat:typing` já existe no código, mas não está sendo percebido em uso real.
Este item é uma investigação e correção, não uma feature nova — validar se o evento
está sendo emitido/recebido corretamente contra o servidor em produção (Socket.io via
Render) e corrigir a causa raiz.

### 1.4 Status da mensagem: enviada / entregue / lida

Cada mensagem enviada por você mostra um indicador de check que evolui em três estados:

- ✓ cinza — **enviada**: o servidor confirmou o recebimento e persistiu a mensagem.
- ✓✓ cinza — **entregue**: o socket do destinatário confirmou o recebimento (ack), ou
  seja, o app dele estava aberto e recebeu o evento em tempo real.
- ✓✓ azul — **lida**: o destinatário abriu a conversa com esse remetente (mesmo
  comportamento que já existe para marcar mensagens como lidas hoje).

Requer armazenar `deliveredAt` além de `read` no modelo de mensagem, e um evento de
confirmação (`chat:delivered`, via acknowledgment do socket.io) emitido pelo cliente
destinatário assim que a mensagem chega.

### 1.5 Notificações do navegador (fora da página)

Quando a aba do CliniFlow estiver em segundo plano (não em foco) e o navegador tiver
concedido permissão, uma notificação nativa do navegador (Web Notifications API) é
disparada para eventos configurados. O badge visual existente no topo da página
(contador vermelho) é mantido como está.

Em Configurações, uma nova seção lista os tipos de evento com checkbox individual para
ativar/desativar a notificação por popup. Por padrão, apenas **"Nova mensagem no
chat"** vem marcado. A estrutura de configuração já nasce genérica (lista de tipos de
evento), para permitir adicionar outros tipos no futuro (ex: oportunidade parada há
muito tempo) sem redesenhar a tela.

## 2. Pacientes e Oportunidades

### 2.1 Campo "Direcionado para" (pacientes)

Novo campo no cadastro/edição de paciente: **Direcionado para** (Dr. Elizeu ou Dr.
Lucas), representando o profissional responsável pelo atendimento — distinto do campo
já existente **Origem/Indicação** (quem indicou/cadastrou). Visualmente os dois campos
usam estilos diferentes (cor/ícone) para não se confundirem na interface.

### 2.2 Pacientes organizados em blocos por profissional

A lista de pacientes deixa de ser uma única tabela e passa a ser dividida em blocos
independentes, um por profissional (Dr. Elizeu, Dr. Lucas), cada bloco com sua própria
tabela e os filtros que já existem hoje (indicação, especialidade, próxima consulta).
Ao editar um paciente e trocar o campo "Direcionado para", ele passa a aparecer no
bloco do outro profissional automaticamente.

### 2.3 Editar e apagar pacientes

Hoje só é possível criar, fixar e reordenar pacientes. Este item adiciona:

- **Editar**: abre o mesmo formulário de cadastro, preenchido com os dados atuais,
  incluindo o campo "Direcionado para".
- **Apagar**: remove o paciente, com confirmação prévia (o registro e o histórico
  associado são perdidos).

### 2.4 Oportunidades: especialidade e tempo de espera

O cadastro de oportunidade ganha um campo de especialidade (mesma lista configurada em
Configurações) e passa a registrar automaticamente `createdAt` no momento da criação —
pré-preenchido com a data/hora atual, mas editável (por exemplo, ao cadastrar uma
oportunidade com atraso e querer registrar o horário real do contato).

### 2.5 Destaque visual de tempo de espera

Cada card no Radar de Encaixes mostra há quanto tempo está esperando (ex: "há 2 dias")
e muda de cor conforme limites configuráveis:

- Dentro do prazo: aparência neutra (padrão atual).
- Acima do primeiro limite (padrão: 24h): destaque amarelo/laranja.
- Acima do segundo limite (padrão: 48h): destaque vermelho.

Os dois limites (em horas) ficam editáveis em Configurações, com os valores acima como
padrão de fábrica. Um filtro por especialidade fica disponível no topo do Radar,
espelhando o filtro que já existe na tabela de pacientes.

## 3. Responsividade completa

Em telas pequenas (celular):

- A tabela de pacientes (dentro de cada bloco por profissional) vira uma lista de
  cartões empilhados, um por paciente, mantendo todas as informações visíveis
  (incluindo a miniatura da radiografia em tamanho legível).
- O Radar de Encaixes e os blocos de pacientes por profissional empilham verticalmente
  em vez de lado a lado.
- O cabeçalho (nome do sistema, usuário logado, botões) colapsa em um layout compacto
  ou menu.
- O modal do Comunicador ocupa a tela inteira no celular, em vez do tamanho fixo atual
  (750x600).

## Modelo de dados — resumo das mudanças

**Mensagens (`messages`)**
- `deliveredAt` (novo)
- `deletedAt` / `deleted` (novo, soft delete)
- `replyToId` (novo, opcional)

**Pacientes (`patients`)**
- `assignedTo` (novo: `doctor_elizeu` | `doctor_lucas`) — "Direcionado para"

**Oportunidades (`opportunities`)**
- `specialty` (novo)
- `createdAt` (novo, editável)

**Configurações (`specialtiesConfig` e nova seção de config geral)**
- Preferências de notificação por tipo de evento (lista de booleans)
- Limites de tempo de espera (em horas) para destaque das oportunidades

## Fora de escopo (não incluído agora)

- Notificações com o navegador totalmente fechado (push notification via service
  worker) — exigiria infraestrutura adicional (VAPID keys, assinatura por dispositivo).
  Pode ser um projeto futuro se a necessidade aparecer.
- Autenticação com senha por usuário (login continua sendo só uma seleção de "quem está
  operando", como hoje).
- Extensão do campo "Direcionado para" para Oportunidades (ficou definido que vale
  apenas para Pacientes).
