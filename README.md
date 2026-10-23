# Minhas Tarefas

App para organizar a rotina de **faculdade**, **trabalho** e **vida pessoal**, e descobrir
quais **conteúdos da faculdade** precisam de mais estudo.

Funciona no navegador do celular ou do computador, pode ser instalado na tela inicial
e funciona offline. Não tem servidor nem login: os dados ficam salvos no próprio aparelho.

## Telas

- **Hoje**: tarefas do dia (com filtro por categoria), tarefas atrasadas, provas dos
  próximos 14 dias e os 3 conteúdos mais urgentes para estudar.
- **Semana**: visão de segunda a domingo, com navegação entre semanas.
- **Matérias**: cadastro de matérias, conteúdos (com dificuldade e anotações) e provas/entregas.
- **Estudar**: fila de conteúdos ordenada por prioridade. Botão "Estudei ✓" registra a revisão.

Tarefas podem se repetir em dias da semana (ex.: aula toda seg/qua), o que monta a rotina fixa.
A aba Matérias traz sugestões de matérias de Direito para cadastrar com um toque.

## Aparência

Modo claro, escuro ou automático (segue o celular): botão 🌙/☀︎ no topo ou em ⚙︎ → Aparência.

## Lembretes

- **Notificações do app**: lembrete por tarefa (na hora, 10/30/60 min ou 1 dia antes),
  lembrete diário de estudo com os conteúdos prioritários, e aviso 7 dias e 1 dia antes das provas.
  Como o app não tem servidor, elas só tocam com o app aberto ou usado há pouco. Ao abrir o app,
  os avisos perdidos recentes são mostrados.
- **Agenda do celular** (alarme garantido, mesmo com o app fechado): em ⚙︎ → "Exportar rotina e
  provas (.ics)", ou pelos botões "Google Agenda" / "Calendário (iPhone)" ao editar uma tarefa.
  - iPhone: abrir o arquivo `.ics` e tocar em "Adicionar tudo".
  - Android: importar o `.ics` em calendar.google.com (Configurações → Importar e exportar) pelo computador.
- No iPhone, notificações de apps web só funcionam com o app adicionado à Tela de Início.

## Como a prioridade de estudo é calculada

Cada conteúdo recebe uma pontuação:

- **Dificuldade**: difícil (+30), médio (+15), tranquilo (+3)
- **Tempo sem revisar**: +0,6 por dia (até 30 dias); nunca estudado +12
- **Prova chegando** (até 21 dias): quanto mais perto, mais pontos

Conteúdos estudados hoje vão para o fim da lista.

## Rodar localmente

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar (para usar no celular)

Ative o **GitHub Pages** no repositório (Settings → Pages → Deploy from branch → `main` / root).
Depois abra o link no celular e use "Adicionar à tela inicial".

## Backup

Pelo botão ⚙︎ dá para baixar um backup em `.json` e restaurar em outro aparelho.
