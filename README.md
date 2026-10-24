# Animus

*Animus*: em latim jurídico, a intenção, a vontade de agir.

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
As matérias do semestre (2026.2) são cadastradas automaticamente na primeira vez que o app abre
(sem duplicar as que já existirem). Cada uma tem sugestões de conteúdos para adicionar com um toque.
Para um novo semestre, atualize a lista `SEMESTER` em `app.js`.

## Aparência

Modo claro, escuro ou automático (segue o celular): ícone de lua/sol no topo ou em Configurações → Aparência.

## Lembretes

- **Notificações do app**: lembrete por tarefa (na hora, 10/30/60 min ou 1 dia antes),
  lembrete diário de estudo com os conteúdos prioritários, e aviso 7 dias e 1 dia antes das provas.
  Como o app não tem servidor, elas só tocam com o app aberto ou usado há pouco. Ao abrir o app,
  os avisos perdidos recentes são mostrados.
- **Agenda do celular** (alarme garantido, mesmo com o app fechado): em Configurações → "Exportar rotina e
  provas (.ics)", ou pelos botões "Google Agenda" / "Agenda do celular" ao editar uma tarefa.
  - iPhone: abrir o arquivo `.ics` e tocar em "Adicionar tudo".
  - Samsung/Android: tocar no `.ics` baixado e abrir com o app Calendário. Alternativa: importar em
    calendar.google.com (Configurações → Importar e exportar) pelo computador.
  - Samsung: em Configurações → Bateria → Limites de uso em segundo plano, deixar o Chrome fora dos
    "apps em suspensão" ajuda as notificações a não atrasarem.
- No iPhone, notificações de apps web só funcionam com o app adicionado à Tela de Início.

## Como a prioridade de estudo é calculada

Cada conteúdo recebe uma pontuação:

- **Dificuldade**: difícil (+30), médio (+15), tranquilo (+3)
- **Tempo sem revisar**: +0,6 por dia (até 30 dias); nunca estudado +12
- **Prova chegando** (até 21 dias): quanto mais perto, mais pontos

Conteúdos estudados hoje vão para o fim da lista.

## Conta e sincronização (Firebase)

Com o Firebase configurado em `firebase-config.js`, o app abre numa tela de entrada e só pode ser
usado depois do login com Google. Os dados ficam guardados na nuvem, iguais no celular e no
computador.

- Quem já entrou num aparelho vai direto para o app, inclusive sem internet; as mudanças sobem
  quando a conexão volta.
- A tela de entrada só volta se ela sair da conta (Configurações → Conta).
- Com `window.FIREBASE_CONFIG = null`, não há login e tudo fica só no aparelho.

1. Crie um projeto em https://console.firebase.google.com (o Google Analytics pode ficar desligado).
2. **Authentication** → Começar → Método de login → ative **Google**.
3. **Authentication** → Configurações → Domínios autorizados → adicione `wedrock.github.io`.
4. **Firestore Database** → Criar banco de dados → modo de produção → região `southamerica-east1` (São Paulo).
5. Na aba **Regras** do Firestore, cole o conteúdo de `firestore.rules` e publique.
6. Configurações do projeto → Seus apps → ícone `</>` (Web) → registre o app e copie o objeto
   `firebaseConfig` para `firebase-config.js`.

Os dados de cada conta ficam em `users/{uid}`. Em caso de edição simultânea em dois aparelhos
sem internet, vale a última versão salva.

## Rodar localmente

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar (para usar no celular)

Ative o **GitHub Pages** no repositório (Settings → Pages → Deploy from branch → `main` / root).
Depois abra o link no celular:

- **Samsung/Android**: no Chrome, menu ⋮ → "Instalar app" (ou "Adicionar à tela inicial").
  No Samsung Internet: menu ☰ → "Adicionar página a" → "Tela inicial".
- **iPhone**: no Safari, Compartilhar → "Adicionar à Tela de Início".

## Backup

Em Configurações (ícone no canto superior direito) dá para baixar um backup em `.json` e restaurar em outro aparelho.
