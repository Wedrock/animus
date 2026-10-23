'use strict';

// ---------- Dados ----------

const STORAGE_KEY = 'minhas-tarefas:v1';

const CATEGORIES = {
  faculdade: { label: 'Faculdade', color: 'var(--faculdade)' },
  trabalho: { label: 'Trabalho', color: 'var(--trabalho)' },
  pessoal: { label: 'Pessoal', color: 'var(--pessoal)' },
};

// 3 = preciso estudar muito, 2 = mais ou menos, 1 = já domino
const LEVELS = {
  3: 'Difícil',
  2: 'Médio',
  1: 'Tranquilo',
};

const SUBJECT_COLORS = ['#8b5cf6', '#ec4899', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DIREITO_SUBJECTS = [
  'Introdução ao Estudo do Direito', 'Teoria Geral do Estado', 'Direito Constitucional', 'Direito Civil',
  'Direito Penal', 'Direito Processual Civil', 'Direito Processual Penal', 'Direito Administrativo',
  'Direito do Trabalho', 'Direito Empresarial', 'Direito Tributário', 'Direito Internacional',
  'Direitos Humanos', 'Filosofia do Direito', 'Sociologia Jurídica', 'Ética Profissional',
];

// Minutos antes do horário da tarefa.
const REMIND_OPTIONS = [
  ['', 'Sem lembrete'],
  ['0', 'Na hora'],
  ['10', '10 min antes'],
  ['30', '30 min antes'],
  ['60', '1 hora antes'],
  ['1440', '1 dia antes'],
];

function defaultSettings() {
  return { name: 'Maria Eduarda', studyReminder: '20:00', examReminders: true, notifBannerHidden: false };
}

function emptyState() {
  return { tasks: [], subjects: [], topics: [], exams: [], settings: defaultSettings() };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const data = { ...emptyState(), ...JSON.parse(raw) };
    data.settings = { ...defaultSettings(), ...data.settings };
    return data;
  } catch {
    return emptyState();
  }
}

let db = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    toast('Não foi possível salvar neste navegador.');
  }
}

const ui = {
  tab: 'hoje',
  catFilter: 'todas',
  weekOffset: 0,
  openSubjects: new Set(),
  studySubject: 'todas',
};

// ---------- Utilidades ----------

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const today = () => iso(new Date());

function addDays(s, n) {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

// Dias de a até b (positivo se b é depois de a).
function daysBetween(a, b) {
  return Math.round((parseIso(b) - parseIso(a)) / 86400000);
}

function fmtDate(s, opts = { day: '2-digit', month: '2-digit' }) {
  return parseIso(s).toLocaleDateString('pt-BR', opts);
}

function fmtLongDate(s) {
  const txt = fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function greeting() {
  const h = new Date().getHours();
  const hello = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const name = db.settings.name.trim();
  return name ? `${hello}, ${name} 💜` : hello;
}

function relDays(n) {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

const byId = (list, id) => list.find((x) => x.id === id);

// ---------- Regras de tarefas ----------

function occursOn(task, date) {
  if (!task.repeatDays || task.repeatDays.length === 0) return task.date === date;
  return date >= task.date && task.repeatDays.includes(parseIso(date).getDay());
}

const isDone = (task, date) => (task.doneDates || []).includes(date);

function toggleDone(task, date) {
  task.doneDates = task.doneDates || [];
  if (isDone(task, date)) task.doneDates = task.doneDates.filter((d) => d !== date);
  else task.doneDates.push(date);
  save();
}

function tasksOn(date, cat = 'todas') {
  return db.tasks
    .filter((t) => occursOn(t, date) && (cat === 'todas' || t.cat === cat))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title));
}

function overdueTasks(cat = 'todas') {
  const t = today();
  return db.tasks
    .filter((x) => !(x.repeatDays && x.repeatDays.length) && x.date < t && !isDone(x, x.date))
    .filter((x) => cat === 'todas' || x.cat === cat)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function repeatLabel(task) {
  const days = task.repeatDays || [];
  if (days.length === 0) return '';
  if (days.length === 7) return 'todo dia';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'seg a sex';
  return [...days].sort().map((d) => WEEKDAYS_SHORT[d].toLowerCase()).join(', ');
}

// ---------- Regras de estudo ----------

function nextExam(subjectId) {
  const t = today();
  return db.exams
    .filter((e) => e.subjectId === subjectId && e.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

// Quanto maior, mais urgente estudar esse conteúdo.
function scoreTopic(topic) {
  const t = today();
  const reasons = [];
  let score = { 3: 30, 2: 15, 1: 3 }[topic.level] ?? 15;

  if (!topic.lastStudied) {
    score += 12;
    reasons.push({ text: 'Nunca estudado', cls: '' });
  } else {
    const since = daysBetween(topic.lastStudied, t);
    score += Math.min(since, 30) * 0.6;
    if (since > 0) reasons.push({ text: `Revisado ${relDays(-since)}`, cls: '' });
  }

  const exam = nextExam(topic.subjectId);
  if (exam) {
    const until = daysBetween(t, exam.date);
    if (until <= 21) {
      score += (22 - until) * 2 * (topic.level >= 2 ? 1 : 0.5);
      reasons.push({ text: `${exam.title || 'Prova'} ${relDays(until)}`, cls: until <= 7 ? 'danger' : 'warn' });
    }
  }
  return { score, reasons };
}

function rankedTopics(subjectFilter = 'todas') {
  const t = today();
  return db.topics
    .filter((x) => subjectFilter === 'todas' || x.subjectId === subjectFilter)
    .filter((x) => byId(db.subjects, x.subjectId))
    .map((topic) => ({ topic, ...scoreTopic(topic), studiedToday: topic.lastStudied === t }))
    .sort((a, b) => a.studiedToday - b.studiedToday || b.score - a.score);
}

function markStudied(topic) {
  topic.lastStudied = today();
  topic.studyCount = (topic.studyCount || 0) + 1;
  save();
  toast('Boa! Estudo registrado 💜');
}

function cycleLevel(topic) {
  topic.level = topic.level === 3 ? 2 : topic.level === 2 ? 1 : 3;
  save();
}

// ---------- Componentes ----------

function taskHtml(task, date, { showDate = false } = {}) {
  const cat = CATEGORIES[task.cat] || CATEGORIES.pessoal;
  const done = isDone(task, date);
  const rep = repeatLabel(task);
  return `
    <div class="card task ${done ? 'done' : ''}" style="--cat:${cat.color}">
      <button class="check" data-action="toggle-task" data-id="${task.id}" data-date="${date}"
        aria-label="${done ? 'Desmarcar' : 'Concluir'}">${done ? '✓' : ''}</button>
      <div class="task-body" data-action="edit-task" data-id="${task.id}">
        <div class="task-title">${esc(task.title)}</div>
        <div class="task-meta">
          ${task.time ? `<span class="task-time">${esc(task.time)}</span>` : ''}
          <span class="chip cat">${cat.label}</span>
          ${showDate ? `<span class="chip danger">${fmtDate(date)} · ${relDays(daysBetween(today(), date))}</span>` : ''}
          ${rep ? `<span>↻ ${rep}</span>` : ''}
          ${task.remind != null ? '<span title="Com lembrete">🔔</span>' : ''}
        </div>
      </div>
    </div>`;
}

function catFilterHtml() {
  const opts = [['todas', 'Todas'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])];
  return `<div class="filters">${opts
    .map(([k, label]) => `<button data-action="cat-filter" data-cat="${k}" class="${ui.catFilter === k ? 'active' : ''}">${label}</button>`)
    .join('')}</div>`;
}

function rankHtml(item, n) {
  const { topic, reasons, studiedToday } = item;
  const subj = byId(db.subjects, topic.subjectId);
  return `
    <div class="card rank" style="--subj:${subj.color};${studiedToday ? 'opacity:.55' : ''}">
      <div class="rank-n">${studiedToday ? '✓' : n}</div>
      <div class="rank-body">
        <div class="topic-title" data-action="edit-topic" data-id="${topic.id}"><strong>${esc(topic.title)}</strong></div>
        <div class="topic-sub">${esc(subj.name)}${topic.studyCount ? ` · estudado ${topic.studyCount}x` : ''}</div>
        <div class="rank-why">${(studiedToday ? [{ text: 'Estudado hoje', cls: 'ok' }] : reasons)
          .map((r) => `<span class="chip ${r.cls}">${esc(r.text)}</span>`)
          .join('')}</div>
        ${topic.notes ? `<div class="topic-sub" style="margin-top:6px">📝 ${esc(topic.notes)}</div>` : ''}
        <div class="row-actions">
          ${studiedToday ? '' : `<button class="btn primary small" data-action="studied" data-id="${topic.id}">Estudei ✓</button>`}
          <button class="level level-${topic.level}" data-action="cycle-level" data-id="${topic.id}"
            title="Toque para mudar a dificuldade">${LEVELS[topic.level]}</button>
        </div>
      </div>
    </div>`;
}

// ---------- Telas ----------

function viewHoje() {
  const t = today();
  const list = tasksOn(t, ui.catFilter);
  const late = overdueTasks(ui.catFilter);
  const done = list.filter((x) => isDone(x, t)).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  const exams = db.exams
    .filter((e) => e.date >= t && daysBetween(t, e.date) <= 14)
    .sort((a, b) => a.date.localeCompare(b.date));

  const study = rankedTopics().filter((x) => !x.studiedToday).slice(0, 3);

  return `
    <p class="greeting">${esc(greeting())}</p>
    <p class="subtitle">${fmtLongDate(t)}</p>
    ${list.length ? `
      <div class="card">
        <strong>${done} de ${list.length}</strong> tarefas de hoje feitas
        <div class="progress"><div style="width:${pct}%"></div></div>
      </div>` : ''}
    ${notifBannerHtml()}
    ${catFilterHtml()}

    ${late.length ? `
      <div class="section">
        <div class="section-title">Atrasadas</div>
        ${late.map((x) => taskHtml(x, x.date, { showDate: true })).join('')}
      </div>` : ''}

    <div class="section">
      <div class="section-title">Hoje</div>
      ${list.length ? list.map((x) => taskHtml(x, t)).join('') : `<div class="empty">Nada marcado pra hoje. Toque no + para adicionar.</div>`}
    </div>

    ${exams.length ? `
      <div class="section">
        <div class="section-title">Provas chegando</div>
        ${exams.map((e) => {
          const s = byId(db.subjects, e.subjectId);
          const until = daysBetween(t, e.date);
          return `<div class="card task" style="--cat:${s ? s.color : 'var(--accent)'}" data-action="edit-exam" data-id="${e.id}">
            <div class="task-body">
              <div class="task-title"><strong>${esc(e.title || 'Prova')}</strong> · ${esc(s ? s.name : '')}</div>
              <div class="task-meta"><span class="chip ${until <= 3 ? 'danger' : 'warn'}">${fmtDate(e.date)} · ${relDays(until)}</span></div>
            </div></div>`;
        }).join('')}
      </div>` : ''}

    <div class="section">
      <div class="section-title">Pra estudar hoje <button class="link-btn" data-action="go" data-tab="estudar">ver tudo</button></div>
      ${study.length
        ? study.map((x, i) => rankHtml(x, i + 1)).join('')
        : db.topics.length
          ? `<div class="empty">Tudo estudado hoje. Arrasou! 🎉</div>`
          : `<div class="empty">Cadastre suas matérias e conteúdos na aba <button class="link-btn" data-action="go" data-tab="materias">Matérias</button> para receber sugestões do que estudar.</div>`}
    </div>`;
}

function viewSemana() {
  const t = today();
  const d = parseIso(t);
  const monday = addDays(t, -((d.getDay() + 6) % 7) + ui.weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const label = ui.weekOffset === 0 ? 'Esta semana' : `${fmtDate(days[0])} – ${fmtDate(days[6])}`;

  return `
    <div class="week-nav">
      <button data-action="week" data-delta="-1" aria-label="Semana anterior">‹</button>
      <strong>${label}</strong>
      <button data-action="week" data-delta="1" aria-label="Próxima semana">›</button>
    </div>
    ${catFilterHtml()}
    ${days.map((day) => {
      const list = tasksOn(day, ui.catFilter);
      const exams = db.exams.filter((e) => e.date === day);
      return `
        <div class="day-head ${day === t ? 'today' : ''}">
          <strong>${fmtDate(day, { weekday: 'long' })}</strong>
          <span class="subtitle" style="margin:0">${fmtDate(day)}</span>
          <button class="add-day" data-action="new-task" data-date="${day}">+ adicionar</button>
        </div>
        ${exams.map((e) => {
          const s = byId(db.subjects, e.subjectId);
          return `<div class="card task" style="--cat:var(--danger)" data-action="edit-exam" data-id="${e.id}">
            <div class="task-body"><div class="task-title">📌 <strong>${esc(e.title || 'Prova')}</strong> · ${esc(s ? s.name : '')}</div></div></div>`;
        }).join('')}
        ${list.length ? list.map((x) => taskHtml(x, day)).join('') : exams.length ? '' : '<div class="empty">Livre</div>'}`;
    }).join('')}
    ${ui.weekOffset !== 0 ? `<div class="row-actions"><button class="btn" data-action="week" data-delta="0">Voltar para esta semana</button></div>` : ''}`;
}

function viewMaterias() {
  if (!db.subjects.length) {
    return `
      <div class="card">
        <p style="margin-top:0"><strong>Comece cadastrando as matérias do semestre.</strong></p>
        <p class="subtitle">Dentro de cada matéria, adicione os conteúdos e marque quais estão mais difíceis. O app usa isso, junto com as datas das provas, para sugerir o que estudar primeiro.</p>
        <button class="btn primary" data-action="new-subject">+ Nova matéria</button>
      </div>
      <div class="section">
        <div class="section-title">Sugestões de Direito — toque para adicionar</div>
        <div class="seg">${DIREITO_SUBJECTS.map((n) => `
          <button class="chip" style="padding:7px 12px;border:0;cursor:pointer" data-action="quick-subject" data-name="${esc(n)}">+ ${esc(n)}</button>`).join('')}
        </div>
      </div>`;
  }
  const t = today();
  return db.subjects.map((s) => {
    const topics = db.topics.filter((x) => x.subjectId === s.id);
    const hard = topics.filter((x) => x.level === 3).length;
    const exams = db.exams.filter((e) => e.subjectId === s.id).sort((a, b) => a.date.localeCompare(b.date));
    const next = nextExam(s.id);
    const open = ui.openSubjects.has(s.id);
    return `
      <div class="card subject" style="--subj:${s.color}">
        <div class="subject-head" data-action="toggle-subject" data-id="${s.id}">
          <h3>${esc(s.name)}</h3>
          <span>${open ? '▴' : '▾'}</span>
        </div>
        <div class="subject-stats">
          ${topics.length} conteúdo${topics.length === 1 ? '' : 's'}${hard ? ` · ${hard} difíce${hard === 1 ? 'l' : 'is'}` : ''}
          ${next ? ` · ${esc(next.title || 'Prova')} ${relDays(daysBetween(t, next.date))}` : ''}
        </div>
        ${open ? `
          <div class="subject-body">
            ${topics.length ? topics
              .sort((a, b) => b.level - a.level || a.title.localeCompare(b.title))
              .map((x) => `
                <div class="topic">
                  <div class="topic-title" data-action="edit-topic" data-id="${x.id}">
                    ${esc(x.title)}
                    <div class="topic-sub">${x.lastStudied ? `Estudado ${relDays(-daysBetween(x.lastStudied, t))}` : 'Nunca estudado'}</div>
                  </div>
                  <button class="level level-${x.level}" data-action="cycle-level" data-id="${x.id}" title="Toque para mudar">${LEVELS[x.level]}</button>
                </div>`).join('')
              : '<div class="empty">Nenhum conteúdo ainda.</div>'}
            ${exams.length ? `
              <div class="section-title" style="margin-top:12px">Provas e trabalhos</div>
              ${exams.map((e) => `
                <div class="topic" data-action="edit-exam" data-id="${e.id}" style="cursor:pointer">
                  <div class="topic-title">${esc(e.title || 'Prova')}</div>
                  <span class="chip ${e.date < t ? '' : daysBetween(t, e.date) <= 7 ? 'danger' : 'warn'}">${fmtDate(e.date)}</span>
                </div>`).join('')}` : ''}
            <div class="row-actions">
              <button class="btn small primary" data-action="new-topic" data-subject="${s.id}">+ Conteúdo</button>
              <button class="btn small" data-action="new-exam" data-subject="${s.id}">+ Prova</button>
              <button class="btn small" data-action="edit-subject" data-id="${s.id}">Editar matéria</button>
            </div>
          </div>` : ''}
      </div>`;
  }).join('') + `<div class="row-actions"><button class="btn" data-action="new-subject">+ Nova matéria</button></div>`;
}

function viewEstudar() {
  if (!db.topics.length) {
    return `<div class="card">
      <p style="margin-top:0"><strong>Ainda não há conteúdos cadastrados.</strong></p>
      <p class="subtitle">Vá em Matérias, adicione os conteúdos de cada uma e marque a dificuldade. Aqui aparece a fila do que estudar primeiro.</p>
      <button class="btn primary" data-action="go" data-tab="materias">Ir para Matérias</button>
    </div>`;
  }
  const list = rankedTopics(ui.studySubject);
  const opts = [['todas', 'Todas'], ...db.subjects.map((s) => [s.id, s.name])];
  return `
    <p class="subtitle">Ordenado pela dificuldade, tempo sem revisar e provas próximas.</p>
    <div class="filters">${opts
      .map(([k, label]) => `<button data-action="study-filter" data-id="${k}" class="${ui.studySubject === k ? 'active' : ''}">${esc(label)}</button>`)
      .join('')}</div>
    ${list.length ? list.map((x, i) => rankHtml(x, i + 1)).join('') : '<div class="empty">Nenhum conteúdo nessa matéria.</div>'}`;
}

const VIEWS = {
  hoje: { title: 'Hoje', render: viewHoje },
  semana: { title: 'Semana', render: viewSemana },
  materias: { title: 'Matérias', render: viewMaterias },
  estudar: { title: 'O que estudar', render: viewEstudar },
};

function render() {
  const v = VIEWS[ui.tab];
  document.getElementById('title').textContent = v.title;
  document.getElementById('view').innerHTML = v.render();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
}

// ---------- Modais ----------

const modal = document.getElementById('modal');
const modalForm = document.getElementById('modal-form');
let modalHandler = null;

function openModal(html, handler) {
  modalForm.innerHTML = html;
  modalHandler = handler;
  modal.showModal();
  const first = modalForm.querySelector('input[type=text], textarea');
  if (first && !first.value) first.focus();
}

modalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const action = e.submitter ? e.submitter.value : 'save';
  if (action === 'cancel') return modal.close();
  if (action === 'delete' && !confirm('Excluir mesmo?')) return;
  const data = new FormData(modalForm);
  if (modalHandler && modalHandler(action, data) === false) return;
  modal.close();
  render();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

const actionsHtml = (canDelete, deleteLabel = 'Excluir') => `
  <div class="modal-actions">
    ${canDelete ? `<button class="btn danger" value="delete" formnovalidate>${deleteLabel}</button>` : ''}
    <span class="spacer"></span>
    <button class="btn" value="cancel" formnovalidate>Cancelar</button>
    <button class="btn primary" value="save">Salvar</button>
  </div>`;

function taskModal(task, presetDate) {
  const isNew = !task;
  task = task || { title: '', cat: ui.catFilter !== 'todas' ? ui.catFilter : 'faculdade', date: presetDate || today(), time: '', repeatDays: [], remind: 10 };
  const days = task.repeatDays || [];
  openModal(`
    <h2>${isNew ? 'Nova tarefa' : 'Editar tarefa'}</h2>
    <label class="field">O que fazer
      <input type="text" name="title" required maxlength="140" value="${esc(task.title)}" placeholder="Ex.: Ler capítulo 3, reunião, academia...">
    </label>
    <div class="seg">${Object.entries(CATEGORIES).map(([k, v]) => `
      <label><input type="radio" name="cat" value="${k}" ${task.cat === k ? 'checked' : ''}><span>${v.label}</span></label>`).join('')}
    </div>
    <div class="grid-2">
      <label class="field">${days.length ? 'A partir de' : 'Dia'}<input type="date" name="date" required value="${task.date}"></label>
      <label class="field">Horário (opcional)<input type="time" name="time" value="${esc(task.time)}"></label>
    </div>
    <label class="field">Lembrete
      <select name="remind">${REMIND_OPTIONS.map(([v, l]) => `
        <option value="${v}" ${String(task.remind ?? '') === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <span style="font-weight:400;font-size:.78rem">Sem horário, o lembrete toca às 8h do dia.</span>
    </label>
    <div class="field" style="display:flex;flex-direction:column;gap:6px;font-size:.85rem;color:var(--muted);font-weight:600">
      Repetir toda semana em (deixe vazio se for só uma vez)
      <div class="seg">${[1, 2, 3, 4, 5, 6, 0].map((d) => `
        <label><input type="checkbox" name="repeat" value="${d}" ${days.includes(d) ? 'checked' : ''}><span>${WEEKDAYS_SHORT[d]}</span></label>`).join('')}
      </div>
    </div>
    ${isNew ? '' : `
      <div class="row-actions" style="margin-top:0">
        <button class="btn small" value="gcal" formnovalidate>📅 Google Agenda</button>
        <button class="btn small" value="ics" formnovalidate>📅 Calendário (iPhone)</button>
      </div>`}
    ${actionsHtml(!isNew, days.length ? 'Excluir (todas as repetições)' : 'Excluir')}`,
  (action, f) => {
    if (action === 'gcal') {
      window.open(googleCalendarUrl(task), '_blank');
      return false;
    }
    if (action === 'ics') {
      downloadIcs(icsCalendar(taskEvents(task)), `${slug(task.title)}.ics`);
      return false;
    }
    if (action === 'delete') {
      db.tasks = db.tasks.filter((x) => x.id !== task.id);
    } else {
      const patch = {
        title: f.get('title').trim(),
        cat: f.get('cat') || 'pessoal',
        date: f.get('date'),
        time: f.get('time') || '',
        repeatDays: f.getAll('repeat').map(Number),
        remind: f.get('remind') === '' ? null : Number(f.get('remind')),
      };
      if (isNew) db.tasks.push({ id: uid(), doneDates: [], ...patch });
      else Object.assign(task, patch);
    }
    save();
  });
}

function subjectModal(subject) {
  const isNew = !subject;
  subject = subject || { name: '', color: SUBJECT_COLORS[db.subjects.length % SUBJECT_COLORS.length] };
  openModal(`
    <h2>${isNew ? 'Nova matéria' : 'Editar matéria'}</h2>
    <label class="field">Nome
      <input type="text" name="name" required maxlength="80" value="${esc(subject.name)}" placeholder="Ex.: Direito Civil III" list="direito-list">
      <datalist id="direito-list">${DIREITO_SUBJECTS.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
    </label>
    <div class="field" style="font-size:.85rem;color:var(--muted);font-weight:600">Cor
      <div class="colors" style="margin-top:6px">${SUBJECT_COLORS.map((c) => `
        <label><input type="radio" name="color" value="${c}" ${subject.color === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}
      </div>
    </div>
    ${actionsHtml(!isNew, 'Excluir matéria e conteúdos')}`,
  (action, f) => {
    if (action === 'delete') {
      db.subjects = db.subjects.filter((x) => x.id !== subject.id);
      db.topics = db.topics.filter((x) => x.subjectId !== subject.id);
      db.exams = db.exams.filter((x) => x.subjectId !== subject.id);
    } else {
      const patch = { name: f.get('name').trim(), color: f.get('color') || subject.color };
      if (isNew) {
        const s = { id: uid(), ...patch };
        db.subjects.push(s);
        ui.openSubjects.add(s.id);
      } else Object.assign(subject, patch);
    }
    save();
  });
}

function subjectSelect(selected) {
  return `<label class="field">Matéria
    <select name="subjectId" required>${db.subjects
      .map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}</option>`)
      .join('')}</select></label>`;
}

function requireSubject() {
  if (db.subjects.length) return true;
  toast('Cadastre uma matéria primeiro.');
  ui.tab = 'materias';
  render();
  subjectModal();
  return false;
}

function topicModal(topic, subjectId) {
  if (!topic && !requireSubject()) return;
  const isNew = !topic;
  topic = topic || { title: '', subjectId: subjectId || db.subjects[0].id, level: 3, notes: '' };
  openModal(`
    <h2>${isNew ? 'Novo conteúdo' : 'Editar conteúdo'}</h2>
    ${subjectSelect(topic.subjectId)}
    <label class="field">Conteúdo
      <input type="text" name="title" required maxlength="120" value="${esc(topic.title)}" placeholder="Ex.: Controle de constitucionalidade">
    </label>
    <div class="field" style="font-size:.85rem;color:var(--muted);font-weight:600">Quanto precisa estudar?
      <div class="seg" style="margin-top:6px">${[3, 2, 1].map((l) => `
        <label><input type="radio" name="level" value="${l}" ${topic.level === l ? 'checked' : ''}><span>${
          { 3: 'Muito (difícil)', 2: 'Médio', 1: 'Pouco (já sei)' }[l]}</span></label>`).join('')}
      </div>
    </div>
    <label class="field">Anotações (opcional)
      <textarea name="notes" maxlength="1000" placeholder="Dúvidas, páginas do livro, links...">${esc(topic.notes)}</textarea>
    </label>
    ${!isNew && topic.lastStudied ? `<p class="subtitle">Último estudo: ${fmtDate(topic.lastStudied)} · ${topic.studyCount || 0}x no total</p>` : ''}
    ${actionsHtml(!isNew)}`,
  (action, f) => {
    if (action === 'delete') {
      db.topics = db.topics.filter((x) => x.id !== topic.id);
    } else {
      const patch = {
        subjectId: f.get('subjectId'),
        title: f.get('title').trim(),
        level: Number(f.get('level')) || 2,
        notes: f.get('notes').trim(),
      };
      if (isNew) db.topics.push({ id: uid(), lastStudied: null, studyCount: 0, ...patch });
      else Object.assign(topic, patch);
    }
    save();
  });
}

function examModal(exam, subjectId) {
  if (!exam && !requireSubject()) return;
  const isNew = !exam;
  exam = exam || { title: '', subjectId: subjectId || db.subjects[0].id, date: addDays(today(), 7) };
  openModal(`
    <h2>${isNew ? 'Nova prova / entrega' : 'Editar prova / entrega'}</h2>
    ${subjectSelect(exam.subjectId)}
    <div class="grid-2">
      <label class="field">Nome<input type="text" name="title" maxlength="60" value="${esc(exam.title)}" placeholder="Ex.: P1, Seminário"></label>
      <label class="field">Data<input type="date" name="date" required value="${exam.date}"></label>
    </div>
    <p class="subtitle">Conforme a data se aproxima, os conteúdos dessa matéria sobem na lista do que estudar.</p>
    ${actionsHtml(!isNew)}`,
  (action, f) => {
    if (action === 'delete') {
      db.exams = db.exams.filter((x) => x.id !== exam.id);
    } else {
      const patch = { subjectId: f.get('subjectId'), title: f.get('title').trim() || 'Prova', date: f.get('date') };
      if (isNew) db.exams.push({ id: uid(), ...patch });
      else Object.assign(exam, patch);
    }
    save();
  });
}

function addChooser() {
  openModal(`
    <h2>Adicionar</h2>
    <button class="btn" value="task" style="text-align:left">✔︎ Tarefa / compromisso</button>
    <button class="btn" value="topic" style="text-align:left">📚 Conteúdo para estudar</button>
    <button class="btn" value="exam" style="text-align:left">📌 Prova ou entrega</button>
    <button class="btn" value="subject" style="text-align:left">🎓 Matéria</button>
    <div class="modal-actions"><button class="btn" value="cancel" formnovalidate>Cancelar</button></div>`,
  (action) => {
    modal.close();
    ({ task: () => taskModal(), topic: () => topicModal(), exam: () => examModal(), subject: () => subjectModal() })[action]?.();
    return false;
  });
}

function notifStatus() {
  if (!('Notification' in window)) {
    return isIos()
      ? 'No iPhone, as notificações só funcionam com o app instalado: toque em Compartilhar → "Adicionar à Tela de Início" e abra por lá.'
      : 'Este navegador não suporta notificações.';
  }
  return {
    granted: '✅ Notificações ativadas neste aparelho.',
    denied: '🚫 Notificações bloqueadas. Libere nas configurações do navegador para este site.',
    default: 'Notificações ainda não ativadas.',
  }[Notification.permission];
}

function settingsModal() {
  const st = db.settings;
  const canAsk = 'Notification' in window && Notification.permission === 'default';
  openModal(`
    <label class="field">Seu nome
      <input type="text" name="name" maxlength="40" value="${esc(st.name)}" placeholder="Como quer ser chamada?">
    </label>

    <h2>Lembretes</h2>
    <p class="subtitle">${notifStatus()}</p>
    ${canAsk ? '<button class="btn primary" value="notif-on" formnovalidate>🔔 Ativar notificações</button>' : ''}
    <label class="field">Lembrete diário de estudo
      <input type="time" name="studyReminder" value="${esc(st.studyReminder)}">
      <span style="font-weight:400;font-size:.78rem">Deixe vazio para desligar.</span>
    </label>
    <label style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" name="examReminders" ${st.examReminders ? 'checked' : ''}> Avisar 7 dias e 1 dia antes das provas
    </label>
    <button class="btn primary" value="save-settings">Salvar</button>

    <hr style="border:0;border-top:1px solid var(--border);width:100%">
    <h2>Agenda do celular</h2>
    <p class="subtitle">As notificações do app só tocam se ele estiver aberto ou tiver sido usado há pouco.
      Para ter alarme garantido, coloque a rotina na agenda do celular: ela toca mesmo com o app fechado.</p>
    <button class="btn" value="export-ics" formnovalidate>📅 Exportar rotina e provas (.ics)</button>
    <p class="subtitle" style="font-size:.8rem">iPhone: abra o arquivo baixado e toque em "Adicionar tudo".
      Android: no computador, entre em calendar.google.com → Configurações → Importar e exportar, e escolha o arquivo.
      Se mudar a rotina depois, exporte de novo (apague os eventos antigos para não duplicar).</p>

    <hr style="border:0;border-top:1px solid var(--border);width:100%">
    <h2>Backup</h2>
    <p class="subtitle">Os dados ficam salvos só neste aparelho/navegador. Faça backup de vez em quando — e use o arquivo para passar os dados para outro aparelho.</p>
    <button class="btn" value="export" formnovalidate>⬇︎ Baixar backup</button>
    <label class="btn" style="text-align:center">⬆︎ Restaurar backup
      <input type="file" accept="application/json,.json" id="import-file" hidden>
    </label>
    <button class="btn danger" value="wipe" formnovalidate>Apagar todos os dados</button>
    <div class="modal-actions"><button class="btn" value="cancel" formnovalidate>Fechar</button></div>`,
  (action, f) => {
    if (action === 'notif-on') {
      enableNotifications().then(settingsModal);
      return false;
    }
    if (action === 'save-settings') {
      st.name = f.get('name').trim();
      st.studyReminder = f.get('studyReminder') || '';
      st.examReminders = f.get('examReminders') === 'on';
      save();
      toast('Configurações salvas.');
    } else if (action === 'export-ics') {
      downloadIcs(icsCalendar(allEvents()), `minhas-tarefas-${today()}.ics`);
      return false;
    } else if (action === 'export') {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `minhas-tarefas-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (action === 'wipe') {
      if (!confirm('Isso apaga tarefas, matérias e conteúdos deste aparelho. Continuar?')) return false;
      db = emptyState();
      save();
      toast('Dados apagados.');
    }
  });
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.tasks) || !Array.isArray(data.subjects)) throw new Error();
      if (!confirm('Substituir os dados atuais pelos do backup?')) return;
      db = { ...emptyState(), ...data };
      db.settings = { ...defaultSettings(), ...data.settings };
      save();
      modal.close();
      render();
      toast('Backup restaurado!');
    } catch {
      toast('Arquivo de backup inválido.');
    }
  });
}

// ---------- Lembretes ----------

const FIRED_KEY = 'minhas-tarefas:fired';
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const notifGranted = () => 'Notification' in window && Notification.permission === 'granted';

function atMs(date, time) {
  const [h, m] = time.split(':').map(Number);
  const d = parseIso(date);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

// Todos os lembretes que caem entre `from` e `to` (timestamps).
function remindersBetween(from, to) {
  const out = [];
  // Um dia a mais em cada ponta cobre lembretes "1 dia antes".
  const first = iso(new Date(from - 86400000));
  const last = addDays(iso(new Date(to)), 1);

  for (let date = first; date <= last; date = addDays(date, 1)) {
    for (const task of db.tasks) {
      if (task.remind == null || !occursOn(task, date) || isDone(task, date)) continue;
      const before = task.time ? task.remind : task.remind >= 1440 ? 1440 : 0;
      out.push({
        key: `t:${task.id}:${date}`,
        grace: 60 * 60000,
        at: atMs(date, task.time || '08:00') - before * 60000,
        title: task.title,
        body: [
          task.time && (task.remind >= 1440 ? `Amanhã às ${task.time}` : `Às ${task.time}`),
          CATEGORIES[task.cat]?.label,
        ].filter(Boolean).join(' · '),
      });
    }
    if (db.settings.studyReminder) {
      const top = rankedTopics().filter((x) => !x.studiedToday).slice(0, 3);
      if (top.length) {
        out.push({
          key: `s:${date}`,
          grace: 4 * 3600000,
          at: atMs(date, db.settings.studyReminder),
          title: db.settings.name.trim() ? `Hora de estudar, ${db.settings.name.trim()} 📚` : 'Hora de estudar 📚',
          body: 'Prioridades: ' + top.map((x) => x.topic.title).join(', '),
        });
      }
    }
  }

  if (db.settings.examReminders) {
    for (const exam of db.exams) {
      const subj = byId(db.subjects, exam.subjectId);
      for (const before of [7, 1]) {
        out.push({
          key: `e:${exam.id}:${before}`,
          grace: 14 * 3600000,
          at: atMs(addDays(exam.date, -before), '09:00'),
          title: `${exam.title || 'Prova'} de ${subj ? subj.name : ''} ${before === 1 ? 'é amanhã!' : 'em 7 dias'}`,
          body: 'Veja na aba Estudar o que revisar primeiro.',
        });
      }
    }
  }
  return out.filter((r) => r.at >= from && r.at <= to);
}

function loadFired() {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY)) || {};
  } catch {
    return {};
  }
}

async function showNotification(r) {
  const opts = { body: r.body, tag: r.key, icon: 'icon.svg', badge: 'icon.svg' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(r.title, opts);
  } catch {}
  try {
    new Notification(r.title, opts);
  } catch {}
}

// Roda a cada 30s e ao abrir o app: dispara o que já venceu e ainda não foi avisado,
// desde que não esteja velho demais (cada tipo de lembrete tem sua tolerância).
function checkReminders() {
  if (!notifGranted()) return;
  const now = Date.now();
  const fired = loadFired();
  for (const r of remindersBetween(now - 14 * 3600000, now)) {
    if (fired[r.key] || now - r.at > r.grace) continue;
    fired[r.key] = now;
    showNotification(r);
  }
  for (const k in fired) if (now - fired[k] > 3 * 86400000) delete fired[k];
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch {}
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    toast(notifStatus());
    return;
  }
  const res = await Notification.requestPermission();
  if (res === 'granted') {
    showNotification({ key: 'teste', title: 'Lembretes ativados 🔔', body: 'Vou avisar das tarefas, das provas e da hora de estudar.' });
    checkReminders();
  } else {
    toast('Sem permissão, não dá pra mostrar notificações.');
  }
  render();
}

function notifBannerHtml() {
  if (db.settings.notifBannerHidden || notifGranted()) return '';
  const supported = 'Notification' in window;
  if (supported && Notification.permission === 'denied') return '';
  return `
    <div class="card" style="background:var(--accent-soft);border-color:transparent">
      <strong>🔔 Quer receber lembretes?</strong>
      <p class="subtitle" style="margin:4px 0 8px">${supported
        ? 'Aviso das tarefas, das provas e da hora de estudar.'
        : esc(notifStatus())}</p>
      <div class="row-actions" style="margin-top:0">
        ${supported ? '<button class="btn primary small" data-action="enable-notif">Ativar</button>' : ''}
        <button class="btn small" data-action="hide-notif-banner">Agora não</button>
      </div>
    </div>`;
}

// ---------- Agenda (.ics e Google Agenda) ----------

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const compact = (date) => date.replace(/-/g, '');
const icsTime = (date, time) => `${compact(date)}T${time.replace(':', '')}00`;
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) || 'evento';

function addMinutes(time, n) {
  const [h, m] = time.split(':').map(Number);
  const t = Math.min(h * 60 + m + n, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function rrule(task) {
  const days = task.repeatDays || [];
  return days.length ? `FREQ=WEEKLY;BYDAY=${days.map((d) => ICS_DAYS[d]).join(',')}` : '';
}

// A agenda conta o dia inicial como ocorrência, então ele precisa bater com a repetição.
function firstOccurrence(task) {
  let date = task.date;
  while (!occursOn(task, date)) date = addDays(date, 1);
  return date;
}

function taskEvents(task) {
  const ev = { uid: task.id, summary: task.title, description: CATEGORIES[task.cat]?.label || '', rrule: rrule(task), alarms: [] };
  const date = firstOccurrence(task);
  if (task.time) {
    ev.start = icsTime(date, task.time);
    ev.end = icsTime(date, addMinutes(task.time, 30));
    if (task.remind != null) ev.alarms.push(`-PT${task.remind}M`);
  } else {
    ev.allDay = compact(date);
    ev.allDayEnd = compact(addDays(date, 1));
    // Eventos de dia inteiro começam à meia-noite: 8h do dia, ou 8h do dia anterior.
    if (task.remind != null) ev.alarms.push(task.remind >= 1440 ? '-PT16H' : 'PT8H');
  }
  return [ev];
}

function allEvents() {
  const t = today();
  const events = db.tasks.filter((x) => x.date >= t || (x.repeatDays && x.repeatDays.length)).flatMap(taskEvents);
  for (const exam of db.exams.filter((e) => e.date >= t)) {
    const subj = byId(db.subjects, exam.subjectId);
    events.push({
      uid: exam.id,
      summary: `📌 ${exam.title || 'Prova'} — ${subj ? subj.name : ''}`,
      allDay: compact(exam.date),
      allDayEnd: compact(addDays(exam.date, 1)),
      alarms: ['-P6DT15H', '-PT15H'], // 9h de 7 dias antes e 9h do dia anterior
    });
  }
  if (db.settings.studyReminder) {
    events.push({
      uid: 'estudo-diario',
      summary: '📚 Hora de estudar',
      description: 'Abra o Minhas Tarefas para ver o que estudar primeiro.',
      start: icsTime(t, db.settings.studyReminder),
      end: icsTime(t, addMinutes(db.settings.studyReminder, 60)),
      rrule: 'FREQ=DAILY',
      alarms: ['-PT0M'],
    });
  }
  return events;
}

// Quebra linhas longas como pede o padrão iCalendar.
const fold = (line) => line.match(/.{1,60}/gu).join('\r\n ');

function icsCalendar(events) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minhas Tarefas//PT-BR', 'CALSCALE:GREGORIAN'];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}@minhas-tarefas`, `DTSTAMP:${stamp}`, `SUMMARY:${icsText(ev.summary)}`);
    if (ev.allDay) lines.push(`DTSTART;VALUE=DATE:${ev.allDay}`, `DTEND;VALUE=DATE:${ev.allDayEnd}`);
    else lines.push(`DTSTART:${ev.start}`, `DTEND:${ev.end}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsText(ev.description)}`);
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    for (const trigger of ev.alarms || []) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(ev.summary)}`, `TRIGGER:${trigger}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function downloadIcs(text, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function googleCalendarUrl(task) {
  const [ev] = taskEvents(task);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    details: ev.description,
    dates: ev.allDay ? `${ev.allDay}/${ev.allDayEnd}` : `${ev.start}/${ev.end}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (ev.rrule) params.set('recur', `RRULE:${ev.rrule}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ---------- Eventos ----------

document.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tabs button');
  if (tabBtn) {
    ui.tab = tabBtn.dataset.tab;
    render();
    window.scrollTo(0, 0);
    return;
  }

  const el = e.target.closest('[data-action]');
  if (!el || modal.contains(el)) return;
  const { action, id } = el.dataset;

  switch (action) {
    case 'toggle-task': toggleDone(byId(db.tasks, id), el.dataset.date); break;
    case 'edit-task': return taskModal(byId(db.tasks, id));
    case 'new-task': return taskModal(null, el.dataset.date);
    case 'cat-filter': ui.catFilter = el.dataset.cat; break;
    case 'week': ui.weekOffset = el.dataset.delta === '0' ? 0 : ui.weekOffset + Number(el.dataset.delta); break;
    case 'toggle-subject':
      ui.openSubjects.has(id) ? ui.openSubjects.delete(id) : ui.openSubjects.add(id);
      break;
    case 'new-subject': return subjectModal();
    case 'edit-subject': return subjectModal(byId(db.subjects, id));
    case 'new-topic': return topicModal(null, el.dataset.subject);
    case 'edit-topic': return topicModal(byId(db.topics, id));
    case 'new-exam': return examModal(null, el.dataset.subject);
    case 'edit-exam': return examModal(byId(db.exams, id));
    case 'cycle-level': cycleLevel(byId(db.topics, id)); break;
    case 'studied': markStudied(byId(db.topics, id)); break;
    case 'study-filter': ui.studySubject = id; break;
    case 'go': ui.tab = el.dataset.tab; window.scrollTo(0, 0); break;
    case 'quick-subject':
      db.subjects.push({ id: uid(), name: el.dataset.name, color: SUBJECT_COLORS[db.subjects.length % SUBJECT_COLORS.length] });
      save();
      toast(`${el.dataset.name} adicionada`);
      break;
    case 'enable-notif': enableNotifications(); return;
    case 'hide-notif-banner': db.settings.notifBannerHidden = true; save(); break;
    default: return;
  }
  render();
});

document.getElementById('fab').addEventListener('click', () => {
  if (ui.tab === 'materias') return db.subjects.length ? addChooser() : subjectModal();
  if (ui.tab === 'estudar') return topicModal();
  addChooser();
});

document.getElementById('btn-settings').addEventListener('click', settingsModal);

// Atualiza a tela ao virar o dia ou ao voltar para o app.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  checkReminders();
  if (!modal.open) render();
});

setInterval(checkReminders, 30000);

render();
checkReminders();

if (navigator.serviceWorker && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
