'use strict';

// Telas do computador (tela larga). O celular continua com as telas de app.js;
// aqui só muda a organização: menu no topo, colunas e painéis laterais.
// As funções usadas aqui (db, ui, icon, timeline...) vêm de app.js.

const desktopQuery = window.matchMedia('(min-width: 1024px)');
const isDesktop = () => desktopQuery.matches;

function pageHead({ eyebrow, title, sub = '', actions = '' }) {
  return `
    <header class="page-head">
      <div class="page-head-text">
        <p class="page-eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        ${sub ? `<p class="page-sub">${sub}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </header>`;
}

const panel = (title, body, side = '', ic = '') => `
  <section class="panel">
    <div class="panel-head"><h2>${ic ? icon(ic) : ''}${title}</h2>${side}</div>
    ${body}
  </section>`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- Hoje ----------

function deskHoje() {
  const t = today();
  const sel = ui.selectedDate || t;
  const isToday = sel === t;
  const tasks = tasksOn(sel, ui.catFilter);
  const done = tasks.filter((x) => isDone(x, sel)).length;
  const focus = isToday ? focusTask(tasks, sel) : null;
  const rest = focus ? tasks.filter((x) => x !== focus.task) : tasks;
  const late = isToday ? overdueTasks(ui.catFilter) : [];
  const dayExams = db.exams.filter((e) => e.date === sel);

  const allToday = tasksOn(sel);
  const pending = allToday.filter((x) => !isDone(x, sel)).length;
  const sub = allToday.length
    ? `${plural(allToday.length, 'tarefa', 'tarefas')} ${isToday ? 'hoje' : 'neste dia'}, ${pending ? `${pending} por fazer` : 'todas feitas'}.`
    : `Nada marcado ${isToday ? 'para hoje' : 'para este dia'}.`;

  const study = rankedTopics().filter((x) => !x.studiedToday).slice(0, 3);
  const upcoming = db.exams
    .filter((e) => e.date >= t && daysBetween(t, e.date) <= 30 && byId(db.subjects, e.subjectId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const main = `
    ${weekStripHtml(sel)}
    ${notifBannerHtml()}
    ${focus ? focusHtml(focus, sel) : ''}
    ${isToday ? examBannerHtml() : ''}
    <div class="desk-filter">${catFilterHtml()}
      ${tasks.length ? `<span class="count">${icon('check', 'sm')} ${done} de ${tasks.length} feitas</span>` : ''}</div>
    ${late.length ? section('Atrasadas', timeline(late.map((x) => [x, x.date]), { late: true })) : ''}
    ${dayExams.length ? section('Provas', list(dayExams.map((e) => examHtml(e)))) : ''}
    ${section(focus ? 'Resto do dia' : 'Pauta do dia',
      rest.length ? timeline(rest.map((x) => [x, sel])) : `<p class="empty">${tasks.length ? 'Nada além disso.' : 'Nada marcado.'}</p>`)}
    ${isToday ? '' : `<button class="btn week-back" data-action="pick-day" data-date="${t}">Voltar para hoje</button>`}`;

  const side = `
    ${panel('Para estudar hoje',
      study.length ? list(study.map(rankHtml)) : `<p class="empty">${db.topics.length ? 'Tudo estudado hoje.' : 'Cadastre os conteúdos em Matérias.'}</p>`,
      db.topics.length ? '<button class="btn text" data-action="go" data-tab="estudar">Ver fila</button>' : '', 'bookmark')}
    ${panel('Provas e entregas',
      upcoming.length ? list(upcoming.map((e) => deskExamRow(e))) : '<p class="empty">Nenhuma prova nos próximos 30 dias.</p>',
      '<span class="count">Próximos 30 dias</span>', 'flag')}`;

  return `
    ${pageHead({ eyebrow: `Semestre ${SEMESTER.id} · ${fmtLongDate(sel)}`, title: `${esc(greeting())}.`, sub })}
    <div class="desk-grid">
      <div class="desk-main">${main}</div>
      <aside class="desk-side">${side}</aside>
    </div>`;
}

function deskExamRow(exam) {
  const s = byId(db.subjects, exam.subjectId);
  const until = daysBetween(today(), exam.date);
  const when = until === 0 ? 'Hoje' : until === 1 ? 'Amanhã' : `Em ${until} dias`;
  return `
    <div class="row">
      <div class="row-main" data-action="edit-exam" data-id="${exam.id}">
        <div class="row-title">${esc(s.name)}</div>
        <div class="row-meta"><span>${esc(exam.title || 'Prova')}</span><span>${fmtDate(exam.date, { day: 'numeric', month: 'long' })}</span></div>
      </div>
      <span class="badge ${until <= 7 ? 'hot' : ''}">${when}</span>
    </div>`;
}

// ---------- Semana ----------

const WEEKDAY_SHORT_UP = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function deskSemana() {
  const t = today();
  const monday = addDays(mondayOf(t), ui.weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const first = parseIso(days[0]);
  const last = parseIso(days[6]);
  const month = (d) => d.toLocaleDateString('pt-BR', { month: 'long' });
  const title = first.getMonth() === last.getMonth()
    ? `Semana de ${first.getDate()} a ${last.getDate()} de ${month(last)}`
    : `Semana de ${first.getDate()} de ${month(first)} a ${last.getDate()} de ${month(last)}`;

  const actions = `
    <div class="week-pager">
      <button class="icon-btn" data-action="week" data-delta="-1" aria-label="Semana anterior">${icon('left')}</button>
      <button class="btn" data-action="week" data-delta="0">Hoje</button>
      <button class="icon-btn" data-action="week" data-delta="1" aria-label="Próxima semana">${icon('right')}</button>
    </div>
    <button class="btn" data-action="export-ics">${icon('calendarPlus', 'sm')}Exportar para a agenda</button>`;

  const cols = days.map((day) => {
    const exams = db.exams.filter((e) => e.date === day);
    const tasks = tasksOn(day, ui.catFilter);
    const d = parseIso(day);
    const isToday = day === t;
    const pending = tasks.filter((x) => !isDone(x, day)).length;
    let badge = '';
    if (exams.length) badge = `<span class="badge hot">${exams.length === 1 ? 'Prova' : `${exams.length} provas`}</span>`;
    else if (tasks.length) badge = `<span class="badge">${pending ? plural(pending, 'pendente', 'pendentes') : 'Tudo feito'}</span>`;
    return `
      <div class="wcol ${isToday ? 'today' : ''}">
        <div class="wcol-head">
          <span class="wd">${WEEKDAY_SHORT_UP[d.getDay()]}${isToday ? '<em>Hoje</em>' : ''}</span>
          <b>${d.getDate()}</b>
          ${badge}
        </div>
        <div class="wcol-body">
          ${exams.map((e) => deskExamCard(e)).join('')}
          ${tasks.map((x) => deskTaskCard(x, day)).join('')}
          ${!exams.length && !tasks.length ? '<p class="wcol-free">Dia livre</p>' : ''}
        </div>
        <button class="btn wcol-add" data-action="new-task" data-date="${day}">${icon('plus', 'sm')}Adicionar</button>
      </div>`;
  }).join('');

  return `
    ${pageHead({ eyebrow: ui.weekOffset === 0 ? 'Esta semana' : 'Sua rotina', title, actions })}
    <div class="desk-filter">${catFilterHtml()}</div>
    <div class="week-cols">${cols}</div>`;
}

function deskTaskCard(task, date) {
  const cat = CATEGORIES[task.cat] || CATEGORIES.pessoal;
  const done = isDone(task, date);
  return `
    <div class="wcard task ${done ? 'done' : ''}">
      <div class="wcard-top">
        <span><i class="dot" style="background:${cat.color}"></i>${cat.label}</span>
        <span class="wcard-time">${esc(task.time)}</span>
      </div>
      <div class="wcard-body">
        <div class="row-main" data-action="edit-task" data-id="${task.id}"><div class="wcard-title">${esc(task.title)}</div></div>
        <button class="check" data-action="toggle-task" data-id="${task.id}" data-date="${date}"
          aria-label="${done ? 'Desmarcar' : 'Concluir'}">${done ? icon('check') : ''}</button>
      </div>
    </div>`;
}

function deskExamCard(exam) {
  const s = byId(db.subjects, exam.subjectId);
  return `
    <div class="wcard exam" data-action="edit-exam" data-id="${exam.id}">
      <div class="wcard-top"><span>${icon('flag', 'sm')}Prova</span></div>
      <div class="wcard-title">${esc(exam.title || 'Prova')}</div>
      <div class="wcard-sub">${s ? esc(s.name) : ''}</div>
    </div>`;
}

// ---------- Matérias ----------

function deskMaterias() {
  const t = today();
  const topicsAll = db.topics.filter((x) => byId(db.subjects, x.subjectId));
  const upcoming = db.exams.filter((e) => e.date >= t);
  const actions = `<button class="btn primary" data-action="new-subject">${icon('plus', 'sm')}Nova matéria</button>`;
  const head = pageHead({
    eyebrow: `Semestre ${SEMESTER.id}`,
    title: 'Matérias',
    sub: [plural(db.subjects.length, 'matéria', 'matérias'), plural(topicsAll.length, 'conteúdo', 'conteúdos'),
      plural(upcoming.length, 'prova marcada', 'provas marcadas')].join(' · '),
    actions,
  });
  if (!db.subjects.length) return head + viewMaterias();

  if (!byId(db.subjects, ui.selectedSubject)) ui.selectedSubject = db.subjects[0].id;
  const s = byId(db.subjects, ui.selectedSubject);

  const subjList = db.subjects.map((x) => {
    const topics = db.topics.filter((y) => y.subjectId === x.id);
    const hard = topics.filter((y) => y.level === 3).length;
    const next = nextExam(x.id);
    return `
      <button class="subj ${x.id === s.id ? 'on' : ''}" data-action="select-subject" data-id="${x.id}">
        <i class="dot lg" style="background:${x.color}"></i>
        <span class="subj-text">
          <b>${esc(x.name)}</b>
          <small>${plural(topics.length, 'conteúdo', 'conteúdos')}${hard ? ` · ${plural(hard, 'difícil', 'difíceis')}` : ''}</small>
        </span>
        ${next ? `<span class="subj-date">${icon('calendar', 'sm')}${fmtDate(next.date)}</span>` : ''}
      </button>`;
  }).join('');

  return `
    ${head}
    <div class="desk-grid mat">
      <div class="subj-list">
        <p class="side-label">Disciplinas (${db.subjects.length})</p>
        ${subjList}
      </div>
      ${deskSubjectDetail(s)}
    </div>
    ${deskOtherSubjects()}`;
}

function deskSubjectDetail(s) {
  const t = today();
  const topics = db.topics.filter((x) => x.subjectId === s.id)
    .sort((a, b) => b.level - a.level || a.title.localeCompare(b.title));
  const exams = db.exams.filter((e) => e.subjectId === s.id).sort((a, b) => a.date.localeCompare(b.date));
  const next = nextExam(s.id);
  const suggested = topicSuggestions(s);

  const topicRows = topics.map((x) => `
    <div class="row">
      ${icon('book')}
      <div class="row-main" data-action="edit-topic" data-id="${x.id}">
        <div class="row-title serif">${esc(x.title)}</div>
        <div class="row-meta">
          <span class="${x.lastStudied ? '' : 'danger'}">${x.lastStudied ? `Revisado ${relDays(-daysBetween(x.lastStudied, t))}` : 'Nunca estudado'}</span>
          ${x.notes ? '<span>Com anotações</span>' : ''}
        </div>
      </div>
      <span class="lvl-label">${levelDots(x)}<span>${LEVELS[x.level]}</span></span>
    </div>`);

  return `
    <section class="panel subj-detail">
      <p class="page-eyebrow"><i class="dot" style="background:${s.color}"></i> ${plural(topics.length, 'conteúdo', 'conteúdos')}</p>
      <h2 class="subj-title">${esc(s.name)}</h2>
      ${next ? `
        <div class="exam-box" data-action="edit-exam" data-id="${next.id}">
          ${icon('flag')}
          <div><small>Próxima avaliação</small><b>${esc(next.title || 'Prova')}</b></div>
          <div class="exam-box-date"><b>${fmtDate(next.date, { day: 'numeric', month: 'long' })}</b>
            <small>${relDays(daysBetween(t, next.date))}</small></div>
        </div>` : ''}
      <div class="detail-actions">
        <button class="btn primary" data-action="new-topic" data-subject="${s.id}">${icon('plus', 'sm')}Conteúdo</button>
        <button class="btn" data-action="new-exam" data-subject="${s.id}">${icon('plus', 'sm')}Prova</button>
        <span class="spacer"></span>
        <button class="btn text" data-action="edit-subject" data-id="${s.id}">Editar matéria</button>
      </div>
      <div class="section-head"><h2>Conteúdos e dificuldade</h2><span class="count">Toque nas bolinhas para mudar</span></div>
      ${topics.length ? list(topicRows) : '<p class="empty">Nenhum conteúdo ainda. Use as sugestões abaixo ou adicione o seu.</p>'}
      ${exams.length > 1 || (exams.length && !next) ? `
        <div class="section-head" style="margin-top:20px"><h2>Provas e entregas</h2></div>
        ${list(exams.map((e) => examHtml(e, { showSubject: false })))}` : ''}
      ${suggested.length ? `
        <div class="suggest-box">
          <div class="section-head"><h2>${icon('bookmark', 'sm')} Sugestões de conteúdos</h2><span class="count">Confira com a ementa</span></div>
          <div class="suggest-grid">${suggested.map((n) => `
            <button class="suggest" data-action="quick-topic" data-subject="${s.id}" data-name="${esc(n)}">
              <span>${esc(n)}</span>${icon('plus', 'sm')}</button>`).join('')}
          </div>
        </div>` : ''}
    </section>`;
}

function deskOtherSubjects() {
  const taken = new Set(db.subjects.map((s) => s.name.toLowerCase()));
  const left = DIREITO_SUBJECTS.filter((n) => !taken.has(n.toLowerCase()));
  if (!left.length) return '';
  return `
    <section class="other-subjects">
      <p class="page-eyebrow">Para os próximos semestres</p>
      <h2>Outras matérias de Direito</h2>
      <div class="other-grid">${left.map((n) => `
        <button class="other" data-action="quick-subject" data-name="${esc(n)}">
          <span>${esc(n)}</span><small>${icon('plus', 'sm')}Adicionar</small></button>`).join('')}
      </div>
    </section>`;
}

// ---------- Estudar ----------

function deskEstudar() {
  const head = pageHead({
    eyebrow: 'Fila de estudo',
    title: 'O que estudar agora',
    sub: 'A ordem soma a dificuldade, o tempo sem revisar e a proximidade das provas.',
  });
  if (!db.topics.length) return head + viewEstudar();

  const items = rankedTopics(ui.studySubject);
  const t = today();
  const studiedToday = db.topics.filter((x) => x.lastStudied === t && byId(db.subjects, x.subjectId));
  const pending = rankedTopics().filter((x) => !x.studiedToday).slice(0, 3);
  const st = db.settings;

  const queue = items.length
    ? items.map((item, i) => deskStudyItem(item, i === 0 && !item.studiedToday)).join('')
    : '<p class="empty">Nenhum conteúdo nessa matéria.</p>';

  const today_ = `
    <p class="side-note">${studiedToday.length ? `${plural(studiedToday.length, 'conteúdo estudado', 'conteúdos estudados')} hoje.` : 'Nenhum conteúdo estudado hoje ainda.'}</p>
    <ul class="checklist">
      ${studiedToday.map((x) => `<li class="done">${icon('check', 'sm')}<span>${esc(x.title)}</span></li>`).join('')}
      ${pending.map((x) => `<li><i></i><span>${esc(x.topic.title)}</span></li>`).join('')}
    </ul>`;

  const side = `
    ${panel('Hoje', today_, `<span class="count">${studiedToday.length} estudado${studiedToday.length === 1 ? '' : 's'}</span>`, 'check')}
    ${panel('Hora de estudar',
      `<p class="side-note">${st.studyReminder ? `Lembrete diário às <b>${esc(st.studyReminder)}</b>, com os conteúdos do topo da fila.` : 'Lembrete diário desligado.'}</p>
       <button class="btn" data-action="open-settings">Alterar</button>`, '', 'bell')}
    ${panel('Agenda do celular',
      `<p class="side-note">Coloque a rotina, as provas e a hora de estudar na agenda, com alarme mesmo com o app fechado.</p>
       <button class="btn" data-action="export-ics">${icon('calendarPlus', 'sm')}Exportar (.ics)</button>`, '', 'calendar')}`;

  return `
    ${head}
    <div class="desk-filter">${filterHtml([['todas', `Todas as matérias (${db.topics.length})`], ...db.subjects.map((s) => [s.id, shortName(s.name)])], ui.studySubject, 'study-filter')}</div>
    <div class="desk-grid">
      <div class="desk-main">${queue}</div>
      <aside class="desk-side">${side}</aside>
    </div>`;
}

function deskStudyItem({ topic, parts, score, studiedToday }, first) {
  const subj = byId(db.subjects, topic.subjectId);
  return `
    <article class="study ${first ? 'first' : ''} ${studiedToday ? 'is-done' : ''}">
      <div class="study-top">
        <div class="study-main">
          <p class="study-subj"><i class="dot" style="background:${subj.color}"></i>${esc(subj.name)}</p>
          <h3 data-action="edit-topic" data-id="${topic.id}">${esc(topic.title)}</h3>
          ${topic.notes ? `<p class="study-notes">${esc(topic.notes)}</p>` : ''}
        </div>
        <span class="pts"><b>${Math.round(score)}</b> pts</span>
      </div>
      <div class="study-parts">
        ${levelDots(topic)}
        ${parts.map((p) => `<span class="${p.cls}">${esc(p.text)} <em>(+${Math.round(p.pts)})</em></span>`).join('')}
      </div>
      <div class="study-actions">
        ${studiedToday
          ? `<span class="done-note">${icon('check', 'sm')}Estudado hoje</span>`
          : `<button class="btn ${first ? 'primary' : ''}" data-action="studied" data-id="${topic.id}">${icon('check', 'sm')}${first ? 'Marcar como estudado' : 'Estudei'}</button>`}
        <button class="btn text" data-action="edit-topic" data-id="${topic.id}">${topic.notes ? 'Ver anotações' : 'Anotações'}</button>
      </div>
    </article>`;
}
