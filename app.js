'use strict';

// ---------- Dados ----------

// Nome antigo do app; mantido para não perder os dados já salvos.
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

const SUBJECT_COLORS = ['#a23b48', '#3f72a0', '#5f8a3e', '#b57614', '#7a62a8', '#2f8079', '#8f5e3a', '#6b7078'];
const OLD_SUBJECT_COLORS = ['#8b5cf6', '#ec4899', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const DIREITO_SUBJECTS = [
  'Introdução ao Estudo do Direito', 'Teoria Geral do Estado', 'Direito Constitucional', 'Direito Civil',
  'Direito Penal', 'Direito Processual Civil', 'Direito Processual Penal', 'Direito Administrativo',
  'Direito do Trabalho', 'Direito Empresarial', 'Direito Tributário', 'Direito Internacional',
  'Direitos Humanos', 'Filosofia do Direito', 'Sociologia Jurídica', 'Ética Profissional',
];

// Matérias do semestre atual, cadastradas automaticamente uma vez.
const SEMESTER = {
  id: '2026.2',
  subjects: [
    'Direito Civil I – Parte Geral',
    'Direito Constitucional II',
    'Direito Empresarial I',
    'Direito Penal I',
    'Hermenêutica Jurídica e Teoria da Argumentação',
    'Teoria Geral do Processo',
  ],
};

// Conteúdos que costumam aparecer em cada matéria. Só aparecem como sugestão:
// a ementa de cada faculdade muda, então ela escolhe quais adicionar.
const TOPIC_SUGGESTIONS = {
  'direito civil i – parte geral': [
    'LINDB', 'Pessoa natural', 'Personalidade e capacidade', 'Direitos da personalidade', 'Ausência',
    'Pessoa jurídica', 'Domicílio', 'Bens', 'Fato, ato e negócio jurídico', 'Defeitos do negócio jurídico',
    'Invalidade do negócio jurídico', 'Prescrição e decadência',
  ],
  'direito constitucional ii': [
    'Organização do Estado', 'Repartição de competências', 'Intervenção federal e estadual', 'Poder Legislativo',
    'Processo legislativo', 'Poder Executivo', 'Poder Judiciário', 'Funções essenciais à Justiça',
    'Controle de constitucionalidade',
  ],
  'direito empresarial i': [
    'Teoria da empresa', 'Empresário individual e registro', 'Estabelecimento empresarial', 'Nome empresarial',
    'Escrituração e livros empresariais', 'Propriedade industrial', 'Teoria geral das sociedades', 'Sociedade limitada',
  ],
  'direito penal i': [
    'Princípios do Direito Penal', 'Lei penal no tempo e no espaço', 'Teoria do crime', 'Fato típico',
    'Ilicitude e excludentes', 'Culpabilidade', 'Tentativa e consumação', 'Erro de tipo e erro de proibição',
    'Concurso de pessoas',
  ],
  'hermenêutica jurídica e teoria da argumentação': [
    'Métodos de interpretação', 'Lacunas e integração', 'Antinomias', 'Regras e princípios',
    'Ponderação e proporcionalidade', 'Tópica jurídica', 'Nova retórica (Perelman)', 'Argumentação jurídica (Alexy)',
    'Precedentes',
  ],
  'teoria geral do processo': [
    'Princípios processuais', 'Jurisdição', 'Ação', 'Processo e relação processual', 'Competência',
    'Sujeitos do processo', 'Atos processuais', 'Meios adequados de solução de conflitos',
  ],
};

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
  return { name: 'Maria Eduarda', theme: 'auto', studyReminder: '20:00', examReminders: true, notifBannerHidden: false, cloudBannerHidden: false };
}

function emptyState() {
  return { tasks: [], subjects: [], topics: [], exams: [], settings: defaultSettings() };
}

// Completa campos que versões antigas não tinham.
function normalize(raw) {
  const data = { ...emptyState(), ...raw };
  data.settings = { ...defaultSettings(), ...raw.settings };
  for (const subj of data.subjects) {
    const i = OLD_SUBJECT_COLORS.indexOf(subj.color);
    if (i >= 0) subj.color = SUBJECT_COLORS[i];
  }
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

let db = load();

function writeLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    toast('Não foi possível salvar neste navegador.');
  }
}

// Toda mudança feita aqui avisa o sync.js, que envia para a nuvem.
function save() {
  db.updatedAt = Date.now();
  writeLocal();
  window.dispatchEvent(new Event('db-saved'));
}

// Dados que chegaram da nuvem (outro aparelho): substitui sem reenviar.
function replaceDb(data) {
  db = normalize(data);
  writeLocal();
  applyTheme();
  if (!modal.open) render();
}

const ui = {
  tab: 'hoje',
  catFilter: 'todas',
  weekOffset: 0,
  openSubjects: new Set(),
  openSuggestions: new Set(),
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
  return name ? `${hello}, ${name}.` : `${hello}.`;
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
  toast('Estudo registrado.');
}

function cycleLevel(topic) {
  topic.level = topic.level === 3 ? 2 : topic.level === 2 ? 1 : 3;
  save();
}

// ---------- Ícones ----------

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calendarPlus: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  queue: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};

const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// ---------- Componentes ----------

const section = (title, body, side = '', cls = '') => `
  <section class="section">
    <div class="section-head"><h2 class="${cls}">${title}</h2>${side}</div>
    ${body}
  </section>`;

const list = (rows) => `<div class="list">${rows.join('')}</div>`;

function filterHtml(opts, active, action) {
  return `<div class="seg">${opts
    .map(([k, label]) => `<button type="button" data-action="${action}" data-id="${k}" class="${active === k ? 'on' : ''}">${esc(label)}</button>`)
    .join('')}</div>`;
}

const catFilterHtml = () =>
  filterHtml([['todas', 'Todas'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])], ui.catFilter, 'cat-filter');

function taskHtml(task, date, { showDate = false } = {}) {
  const cat = CATEGORIES[task.cat] || CATEGORIES.pessoal;
  const done = isDone(task, date);
  const rep = repeatLabel(task);
  return `
    <div class="row task ${done ? 'done' : ''}">
      <button class="check" data-action="toggle-task" data-id="${task.id}" data-date="${date}"
        aria-label="${done ? 'Desmarcar' : 'Concluir'}">${done ? icon('check') : ''}</button>
      <div class="row-main" data-action="edit-task" data-id="${task.id}">
        <div class="row-title">${esc(task.title)}</div>
        <div class="row-meta">
          ${task.time ? `<span class="time">${esc(task.time)}</span>` : ''}
          <span><i class="dot" style="background:${cat.color}"></i>${cat.label}</span>
          ${showDate ? `<span class="danger">${fmtDate(date)}, ${relDays(daysBetween(today(), date))}</span>` : ''}
          ${rep ? `<span>${icon('repeat', 'sm')}${rep}</span>` : ''}
          ${task.remind != null ? `<span title="Com lembrete">${icon('bell', 'sm')}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function examHtml(exam, { showSubject = true } = {}) {
  const s = byId(db.subjects, exam.subjectId);
  const until = daysBetween(today(), exam.date);
  const cls = until < 0 ? '' : until <= 7 ? 'danger' : 'warn';
  return `
    <div class="row">
      ${icon('flag')}
      <div class="row-main" data-action="edit-exam" data-id="${exam.id}">
        <div class="row-title">${esc(exam.title || 'Prova')}${showSubject && s ? ` · ${esc(s.name)}` : ''}</div>
        <div class="row-meta"><span class="${cls}">${fmtDate(exam.date)}, ${relDays(until)}</span></div>
      </div>
    </div>`;
}

const levelHtml = (topic) =>
  `<button class="tag level level-${topic.level}" data-action="cycle-level" data-id="${topic.id}"
    title="Toque para mudar a dificuldade">${LEVELS[topic.level]}</button>`;

function rankHtml(item, n) {
  const { topic, reasons, studiedToday } = item;
  const subj = byId(db.subjects, topic.subjectId);
  return `
    <div class="row rank ${studiedToday ? 'is-done' : ''}">
      <span class="rank-n">${n}</span>
      <div class="row-main" data-action="edit-topic" data-id="${topic.id}">
        <div class="row-title">${esc(topic.title)}</div>
        <div class="row-meta">
          ${levelHtml(topic)}
          <span><i class="dot" style="background:${subj.color}"></i>${esc(subj.name)}</span>
          ${studiedToday ? '' : reasons.map((r) => `<span class="${r.cls}">${esc(r.text)}</span>`).join('')}
        </div>
      </div>
      ${studiedToday
        ? `<span class="done-note">${icon('check', 'sm')}Hoje</span>`
        : `<button class="btn" data-action="studied" data-id="${topic.id}">Estudei</button>`}
    </div>`;
}

// ---------- Telas ----------

function viewHoje() {
  const t = today();
  const tasks = tasksOn(t, ui.catFilter);
  const late = overdueTasks(ui.catFilter);
  const done = tasks.filter((x) => isDone(x, t)).length;

  const exams = db.exams
    .filter((e) => e.date >= t && daysBetween(t, e.date) <= 14)
    .sort((a, b) => a.date.localeCompare(b.date));

  const study = rankedTopics().filter((x) => !x.studiedToday).slice(0, 3);

  let studyBody;
  if (study.length) studyBody = list(study.map((x, i) => rankHtml(x, i + 1)));
  else if (db.topics.length) studyBody = '<p class="empty">Tudo estudado hoje.</p>';
  else studyBody = `<p class="empty">Cadastre os conteúdos em <button class="btn text" data-action="go" data-tab="materias">Matérias</button></p>`;

  return `
    <p class="eyebrow">${fmtLongDate(t)}</p>
    <p class="greeting">${esc(greeting())}</p>
    ${cloudBannerHtml() || notifBannerHtml()}
    ${catFilterHtml()}
    ${late.length ? section('Atrasadas', list(late.map((x) => taskHtml(x, x.date, { showDate: true })))) : ''}
    ${section('Tarefas',
      tasks.length ? list(tasks.map((x) => taskHtml(x, t))) : '<p class="empty">Nada para hoje.</p>',
      tasks.length ? `<span class="count">${done} de ${tasks.length}</span>` : '')}
    ${exams.length ? section('Provas', list(exams.map((e) => examHtml(e)))) : ''}
    ${section('Para estudar', studyBody,
      db.topics.length ? '<button class="btn text" data-action="go" data-tab="estudar">Ver fila</button>' : '')}`;
}

function viewSemana() {
  const t = today();
  const d = parseIso(t);
  const monday = addDays(t, -((d.getDay() + 6) % 7) + ui.weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const label = ui.weekOffset === 0 ? 'Esta semana' : `${fmtDate(days[0])} a ${fmtDate(days[6])}`;

  return `
    <div class="week-nav">
      <button class="icon-btn" data-action="week" data-delta="-1" aria-label="Semana anterior">${icon('left')}</button>
      <span>${label}</span>
      <button class="icon-btn" data-action="week" data-delta="1" aria-label="Próxima semana">${icon('right')}</button>
    </div>
    ${catFilterHtml()}
    ${days.map((day) => {
      const rows = [
        ...db.exams.filter((e) => e.date === day).map((e) => examHtml(e)),
        ...tasksOn(day, ui.catFilter).map((x) => taskHtml(x, day)),
      ];
      // Dia livre fica só com o cabeçalho, para a semana caber melhor na tela.
      return section(
        `${fmtDate(day, { weekday: 'long' })}, ${fmtDate(day)}`,
        rows.length ? list(rows) : '',
        `${rows.length ? '' : '<span class="count">Livre</span>'}
         <button class="icon-btn" data-action="new-task" data-date="${day}" aria-label="Adicionar tarefa">${icon('plus')}</button>`,
        day === t ? 'today' : '');
    }).join('')}
    ${ui.weekOffset !== 0 ? '<button class="btn week-back" data-action="week" data-delta="0">Voltar para esta semana</button>' : ''}`;
}

// Matérias de Direito que ainda não foram cadastradas, para adicionar com um toque.
function suggestionsHtml() {
  const taken = new Set(db.subjects.map((s) => s.name.toLowerCase()));
  const left = DIREITO_SUBJECTS.filter((n) => !taken.has(n.toLowerCase()));
  if (!left.length) return '';
  const tags = `<div class="tags">${left.map((n) =>
    `<button class="tag" data-action="quick-subject" data-name="${esc(n)}">${icon('plus', 'sm')}${esc(n)}</button>`).join('')}</div>`;
  if (!db.subjects.length) return section('Sugestões', tags);
  return `<details class="more"><summary>Outras matérias de Direito</summary>${tags}</details>`;
}

function topicSuggestions(subject) {
  const taken = new Set(db.topics.filter((x) => x.subjectId === subject.id).map((x) => x.title.toLowerCase()));
  return (TOPIC_SUGGESTIONS[subject.name.toLowerCase()] || []).filter((n) => !taken.has(n.toLowerCase()));
}

// Cadastra uma vez as matérias do semestre que ainda não existirem.
function seedSemester() {
  if (db.settings.seededSemester === SEMESTER.id) return;
  const taken = new Set(db.subjects.map((s) => s.name.toLowerCase()));
  for (const name of SEMESTER.subjects) {
    if (taken.has(name.toLowerCase())) continue;
    db.subjects.push({ id: uid(), name, color: SUBJECT_COLORS[db.subjects.length % SUBJECT_COLORS.length] });
  }
  db.settings.seededSemester = SEMESTER.id;
  save();
}

function viewMaterias() {
  if (!db.subjects.length) {
    return `
      <p class="empty-lead">Cadastre as matérias do semestre. Em cada uma, adicione os conteúdos e quanto eles pesam para você.</p>
      <button class="btn primary" data-action="new-subject">${icon('plus')}Nova matéria</button>
      ${suggestionsHtml()}`;
  }
  const t = today();
  return db.subjects.map((s) => {
    const topics = db.topics.filter((x) => x.subjectId === s.id)
      .sort((a, b) => b.level - a.level || a.title.localeCompare(b.title));
    const hard = topics.filter((x) => x.level === 3).length;
    const exams = db.exams.filter((e) => e.subjectId === s.id).sort((a, b) => a.date.localeCompare(b.date));
    const next = nextExam(s.id);
    const open = ui.openSubjects.has(s.id);
    const meta = [
      `${topics.length} conteúdo${topics.length === 1 ? '' : 's'}`,
      hard ? `${hard} difíce${hard === 1 ? 'l' : 'is'}` : '',
      next ? `${esc(next.title || 'Prova')} ${relDays(daysBetween(t, next.date))}` : '',
    ].filter(Boolean);

    const rows = [`
      <div class="row subject-head" data-action="toggle-subject" data-id="${s.id}" aria-expanded="${open}">
        <i class="dot lg" style="background:${s.color}"></i>
        <div class="row-main">
          <div class="row-title">${esc(s.name)}</div>
          <div class="row-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>
        </div>
        ${icon(open ? 'up' : 'down')}
      </div>`];

    if (open) {
      rows.push(...topics.map((x) => `
        <div class="row topic">
          <div class="row-main" data-action="edit-topic" data-id="${x.id}">
            <div class="row-title">${esc(x.title)}</div>
            <div class="row-meta"><span>${x.lastStudied ? `Estudado ${relDays(-daysBetween(x.lastStudied, t))}` : 'Nunca estudado'}</span></div>
          </div>
          ${levelHtml(x)}
        </div>`));
      rows.push(...exams.map((e) => examHtml(e, { showSubject: false }).replace('class="row"', 'class="row topic"')));
      const suggested = topicSuggestions(s);
      if (suggested.length && ui.openSuggestions.has(s.id)) {
        rows.push(`
          <div class="row topic suggestions">
            <div class="row-main">
              <div class="row-meta" style="margin:0 0 8px">Toque para adicionar. Confira com a ementa da faculdade.</div>
              <div class="tags">${suggested.map((n) =>
                `<button class="tag" data-action="quick-topic" data-subject="${s.id}" data-name="${esc(n)}">${icon('plus', 'sm')}${esc(n)}</button>`).join('')}</div>
            </div>
          </div>`);
      }
      rows.push(`
        <div class="row row-actions">
          <button class="btn text" data-action="new-topic" data-subject="${s.id}">${icon('plus', 'sm')}Conteúdo</button>
          <button class="btn text" data-action="new-exam" data-subject="${s.id}">${icon('plus', 'sm')}Prova</button>
          ${suggested.length ? `<button class="btn text" data-action="toggle-suggestions" data-id="${s.id}">${ui.openSuggestions.has(s.id) ? 'Fechar sugestões' : 'Sugestões'}</button>` : ''}
          <button class="btn text" data-action="edit-subject" data-id="${s.id}">Editar</button>
        </div>`);
    }
    return list(rows);
  }).join('') + `<button class="btn week-back" data-action="new-subject">${icon('plus')}Nova matéria</button>${suggestionsHtml()}`;
}

function viewEstudar() {
  if (!db.topics.length) {
    return `
      <p class="empty-lead">Nenhum conteúdo cadastrado ainda.</p>
      <button class="btn primary" data-action="go" data-tab="materias">Ir para Matérias</button>`;
  }
  const items = rankedTopics(ui.studySubject);
  return `
    <p class="eyebrow">Ordem pela dificuldade, tempo sem revisar e provas próximas.</p>
    <div style="height:12px"></div>
    ${filterHtml([['todas', 'Todas'], ...db.subjects.map((s) => [s.id, s.name])], ui.studySubject, 'study-filter')}
    <div style="height:12px"></div>
    ${items.length ? list(items.map((x, i) => rankHtml(x, i + 1))) : '<p class="empty">Nenhum conteúdo nessa matéria.</p>'}`;
}

const VIEWS = {
  hoje: { title: 'Hoje', render: viewHoje },
  semana: { title: 'Semana', render: viewSemana },
  materias: { title: 'Matérias', render: viewMaterias },
  estudar: { title: 'O que estudar', render: viewEstudar },
};

// ---------- Tema ----------

const THEMES = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']];
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const isDark = () => db.settings.theme === 'dark' || (db.settings.theme !== 'light' && darkQuery.matches);

function applyTheme() {
  const root = document.documentElement;
  if (db.settings.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = db.settings.theme;
  const dark = isDark();
  document.querySelector('meta[name=theme-color]').content = dark ? '#141312' : '#f7f6f3';
  const btn = document.getElementById('btn-theme');
  btn.innerHTML = icon(dark ? 'sun' : 'moon');
  btn.setAttribute('aria-label', dark ? 'Usar modo claro' : 'Usar modo escuro');
}

function setTheme(theme) {
  db.settings.theme = theme;
  save();
  applyTheme();
}

darkQuery.addEventListener('change', applyTheme);

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
    ${canDelete ? `<button class="btn text danger" value="delete" formnovalidate>${deleteLabel}</button>` : ''}
    <span class="spacer"></span>
    <button class="btn" value="cancel" formnovalidate>Cancelar</button>
    <button class="btn primary" value="save">Salvar</button>
  </div>`;

const radios = (name, opts, checked, cls = '') => `
  <div class="seg ${cls}">${opts.map(([v, label]) => `
    <label><input type="${cls === 'days' ? 'checkbox' : 'radio'}" name="${name}" value="${v}"
      ${(Array.isArray(checked) ? checked.includes(v) : checked === v) ? 'checked' : ''}><span>${label}</span></label>`).join('')}
  </div>`;

function taskModal(task, presetDate) {
  const isNew = !task;
  task = task || { title: '', cat: ui.catFilter !== 'todas' ? ui.catFilter : 'faculdade', date: presetDate || today(), time: '', repeatDays: [], remind: 10 };
  const days = task.repeatDays || [];
  openModal(`
    <h2>${isNew ? 'Nova tarefa' : 'Editar tarefa'}</h2>
    <label class="field"><span class="label">O que fazer</span>
      <input type="text" name="title" required maxlength="140" value="${esc(task.title)}" placeholder="Ler capítulo 3, estágio, academia">
    </label>
    ${radios('cat', Object.entries(CATEGORIES).map(([k, v]) => [k, `<i class="dot" style="background:${v.color}"></i>${v.label}`]), task.cat)}
    <div class="grid-2">
      <label class="field"><span class="label">${days.length ? 'A partir de' : 'Dia'}</span><input type="date" name="date" required value="${task.date}"></label>
      <label class="field"><span class="label">Horário</span><input type="time" name="time" value="${esc(task.time)}"></label>
    </div>
    <label class="field"><span class="label">Lembrete</span>
      <select name="remind">${REMIND_OPTIONS.map(([v, l]) => `
        <option value="${v}" ${String(task.remind ?? '') === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </label>
    <div class="field"><span class="label">Repetir toda semana</span>
      ${radios('repeat', [1, 2, 3, 4, 5, 6, 0].map((d) => [d, WEEKDAYS_SHORT[d]]), days, 'days')}
    </div>
    ${isNew ? '' : `
      <div class="btn-row">
        <button class="btn" value="gcal" formnovalidate>${icon('calendarPlus', 'sm')}Google Agenda</button>
        <button class="btn" value="ics" formnovalidate>${icon('calendarPlus', 'sm')}Agenda do celular</button>
      </div>`}
    ${actionsHtml(!isNew, days.length ? 'Excluir todas' : 'Excluir')}`,
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
    <label class="field"><span class="label">Nome</span>
      <input type="text" name="name" required maxlength="80" value="${esc(subject.name)}" placeholder="Direito Civil III" list="direito-list">
      <datalist id="direito-list">${DIREITO_SUBJECTS.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
    </label>
    <div class="field"><span class="label">Cor</span>
      <div class="colors">${SUBJECT_COLORS.map((c) => `
        <label><input type="radio" name="color" value="${c}" ${subject.color === c ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}
      </div>
    </div>
    ${actionsHtml(!isNew, 'Excluir matéria')}`,
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
  return `<label class="field"><span class="label">Matéria</span>
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
    <label class="field"><span class="label">Conteúdo</span>
      <input type="text" name="title" required maxlength="120" value="${esc(topic.title)}" placeholder="Controle de constitucionalidade">
    </label>
    <div class="field"><span class="label">Dificuldade</span>
      ${radios('level', [3, 2, 1].map((l) => [l, LEVELS[l]]), topic.level)}
    </div>
    <label class="field"><span class="label">Anotações</span>
      <textarea name="notes" maxlength="1000" placeholder="Dúvidas, páginas, artigos de lei">${esc(topic.notes)}</textarea>
    </label>
    ${!isNew && topic.lastStudied ? `<p class="hint">Último estudo em ${fmtDate(topic.lastStudied)}. ${topic.studyCount || 0}x no total.</p>` : ''}
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
    <h2>${isNew ? 'Nova prova' : 'Editar prova'}</h2>
    ${subjectSelect(exam.subjectId)}
    <div class="grid-2">
      <label class="field"><span class="label">Nome</span><input type="text" name="title" maxlength="60" value="${esc(exam.title)}" placeholder="P1, seminário"></label>
      <label class="field"><span class="label">Data</span><input type="date" name="date" required value="${exam.date}"></label>
    </div>
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
  const opt = (value, ic, label) => `<button class="row row-btn" value="${value}">${icon(ic)}<span>${label}</span></button>`;
  openModal(`
    <h2>Adicionar</h2>
    <div class="list">
      ${opt('task', 'square', 'Tarefa')}
      ${opt('topic', 'bookmark', 'Conteúdo para estudar')}
      ${opt('exam', 'flag', 'Prova ou entrega')}
      ${opt('subject', 'book', 'Matéria')}
    </div>
    <div class="modal-actions"><span class="spacer"></span><button class="btn" value="cancel" formnovalidate>Cancelar</button></div>`,
  (action) => {
    modal.close();
    ({ task: () => taskModal(), topic: () => topicModal(), exam: () => examModal(), subject: () => subjectModal() })[action]?.();
    return false;
  });
}

function notifStatus() {
  if (!('Notification' in window)) {
    return isIos()
      ? 'No iPhone, instale o app pela opção Compartilhar, Adicionar à Tela de Início.'
      : 'Este navegador não mostra notificações.';
  }
  return {
    granted: 'Notificações ativadas.',
    denied: 'Notificações bloqueadas. Libere nas configurações do site no navegador.',
    default: 'Notificações desativadas.',
  }[Notification.permission];
}

function cloudBoxHtml() {
  const c = window.cloud;
  if (!c.user) {
    return `
      <p class="hint">Entre com a conta Google para guardar tudo na nuvem e usar o app no celular e no computador.</p>
      <button class="btn" value="cloud-signin" formnovalidate>Entrar com Google</button>`;
  }
  const time = c.lastSync ? c.lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const status = {
    saving: 'Sincronizando…',
    synced: time ? `Sincronizado às ${time}.` : 'Sincronizado.',
    offline: 'Sem internet. Sincroniza quando a conexão voltar.',
    error: 'Não foi possível sincronizar agora.',
  }[c.state] || '';
  return `
    <p class="hint">Conectada como ${esc(c.user.email)}. ${status}</p>
    <button class="btn" value="cloud-signout" formnovalidate>Sair da conta</button>`;
}

function settingsModal() {
  const st = db.settings;
  const canAsk = 'Notification' in window && Notification.permission === 'default';
  openModal(`
    <h2>Configurações</h2>
    <label class="field"><span class="label">Nome</span>
      <input type="text" name="name" maxlength="40" value="${esc(st.name)}" placeholder="Como quer ser chamada?">
    </label>
    <div class="field"><span class="label">Aparência</span>${radios('theme', THEMES, st.theme)}</div>

    ${window.cloud?.configured ? `<h3>Conta</h3><div id="cloud-box" class="field">${cloudBoxHtml()}</div>` : ''}

    <h3>Lembretes</h3>
    <p class="hint">${notifStatus()}</p>
    ${canAsk ? `<button class="btn" value="notif-on" formnovalidate>${icon('bell', 'sm')}Ativar notificações</button>` : ''}
    <div class="grid-2">
      <label class="field"><span class="label">Hora de estudar</span>
        <input type="time" name="studyReminder" value="${esc(st.studyReminder)}">
      </label>
    </div>
    <label class="check-line"><input type="checkbox" name="examReminders" ${st.examReminders ? 'checked' : ''}>Avisar 7 dias e 1 dia antes das provas</label>
    <button class="btn primary" value="save-settings">Salvar</button>

    <h3>Agenda do celular</h3>
    <p class="hint">O alarme da agenda toca mesmo com o app fechado.</p>
    <button class="btn" value="export-ics" formnovalidate>${icon('calendarPlus', 'sm')}Exportar rotina e provas</button>
    <details class="hint">
      <summary>Como importar</summary>
      <p>Samsung: toque no arquivo baixado e abra com o app Calendário. Se não aparecer essa opção, importe em calendar.google.com pelo computador.</p>
      <p>Mudou a rotina? Exporte de novo e apague os eventos antigos.</p>
      ${isIos() ? '' : '<p>Se os avisos do app atrasarem: Configurações do celular, Bateria, Limites de uso em segundo plano, e tire o Chrome dos apps em suspensão.</p>'}
    </details>

    <h3>Backup</h3>
    <p class="hint">Os dados ficam só neste aparelho.</p>
    <div class="btn-row">
      <button class="btn" value="export" formnovalidate>${icon('download', 'sm')}Baixar</button>
      <label class="btn">${icon('upload', 'sm')}Restaurar<input type="file" accept="application/json,.json" id="import-file" hidden></label>
    </div>
    <div class="modal-actions">
      <button class="btn text danger" value="wipe" formnovalidate>Apagar tudo</button>
      <span class="spacer"></span>
      <button class="btn" value="cancel" formnovalidate>Fechar</button>
    </div>`,
  (action, f) => {
    if (action === 'cloud-signin') {
      window.cloud.signIn().catch(() => toast('Não foi possível entrar agora.'));
      return false;
    }
    if (action === 'cloud-signout') {
      if (confirm('Sair da conta? Os dados continuam neste aparelho.')) window.cloud.signOut();
      return false;
    }
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
      downloadIcs(icsCalendar(allEvents()), `animus-agenda-${today()}.ics`);
      return false;
    } else if (action === 'export') {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `animus-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (action === 'wipe') {
      const where = window.cloud?.user ? 'deste aparelho e da sua conta' : 'deste aparelho';
      if (!confirm(`Isso apaga tarefas, matérias e conteúdos ${where}. Continuar?`)) return false;
      db = emptyState();
      save();
      applyTheme();
      toast('Dados apagados.');
    }
  });
  // O tema muda na hora, sem precisar salvar.
  modalForm.querySelectorAll('[name=theme]').forEach((r) => r.addEventListener('change', () => setTheme(r.value)));
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.tasks) || !Array.isArray(data.subjects)) throw new Error();
      if (!confirm('Substituir os dados atuais pelos do backup?')) return;
      db = normalize(data);
      save();
      applyTheme();
      modal.close();
      render();
      toast('Backup restaurado.');
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
          title: db.settings.name.trim() ? `Hora de estudar, ${db.settings.name.trim()}` : 'Hora de estudar',
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
    showNotification({ key: 'teste', title: 'Lembretes ativados', body: 'Você vai receber avisos das tarefas, das provas e da hora de estudar.' });
    checkReminders();
  } else {
    toast('Sem permissão, não dá pra mostrar notificações.');
  }
  render();
}

// Convite para entrar na conta, enquanto ela não entrou.
function cloudBannerHtml() {
  const c = window.cloud;
  if (!c?.configured || c.user || c.state !== 'signed-out' || db.settings.cloudBannerHidden) return '';
  return `
    <div class="notice">
      ${icon('upload')}
      <div class="row-main">
        <div class="row-title">Salvar na nuvem</div>
        <div class="row-meta">Entre para não perder nada e usar no computador também.</div>
      </div>
      <button class="btn primary" data-action="cloud-signin">Entrar</button>
      <button class="icon-btn" data-action="hide-cloud-banner" aria-label="Dispensar">${icon('x')}</button>
    </div>`;
}

function notifBannerHtml() {
  if (db.settings.notifBannerHidden || notifGranted()) return '';
  const supported = 'Notification' in window;
  if (supported && Notification.permission === 'denied') return '';
  return `
    <div class="notice">
      ${icon('bell')}
      <div class="row-main">
        <div class="row-title">Lembretes</div>
        ${supported ? '' : `<div class="row-meta">${esc(notifStatus())}</div>`}
      </div>
      ${supported ? '<button class="btn primary" data-action="enable-notif">Ativar</button>' : ''}
      <button class="icon-btn" data-action="hide-notif-banner" aria-label="Dispensar">${icon('x')}</button>
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
      summary: `${exam.title || 'Prova'}: ${subj ? subj.name : ''}`,
      allDay: compact(exam.date),
      allDayEnd: compact(addDays(exam.date, 1)),
      alarms: ['-P6DT15H', '-PT15H'], // 9h de 7 dias antes e 9h do dia anterior
    });
  }
  if (db.settings.studyReminder) {
    events.push({
      uid: 'estudo-diario',
      summary: 'Hora de estudar',
      description: 'Abra o Animus para ver o que estudar primeiro.',
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
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Animus//PT-BR', 'CALSCALE:GREGORIAN'];
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
    case 'cat-filter': ui.catFilter = id; break;
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
    case 'toggle-suggestions':
      ui.openSuggestions.has(id) ? ui.openSuggestions.delete(id) : ui.openSuggestions.add(id);
      break;
    case 'quick-topic':
      db.topics.push({ id: uid(), subjectId: el.dataset.subject, title: el.dataset.name, level: 2, notes: '', lastStudied: null, studyCount: 0 });
      save();
      break;
    case 'quick-subject':
      db.subjects.push({ id: uid(), name: el.dataset.name, color: SUBJECT_COLORS[db.subjects.length % SUBJECT_COLORS.length] });
      save();
      toast(`${el.dataset.name} adicionada`);
      break;
    case 'enable-notif': enableNotifications(); return;
    case 'hide-notif-banner': db.settings.notifBannerHidden = true; save(); break;
    case 'hide-cloud-banner': db.settings.cloudBannerHidden = true; save(); break;
    case 'cloud-signin':
      window.cloud.signIn().catch(() => toast('Não foi possível entrar agora.'));
      return;
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
document.getElementById('btn-theme').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));

// Atualiza o quadro da conta em Configurações, se estiver aberto.
window.addEventListener('cloud-status', () => {
  const box = document.getElementById('cloud-box');
  if (box) box.innerHTML = cloudBoxHtml();
  if (ui.tab === 'hoje' && !modal.open) render();
});

// Atualiza a tela ao virar o dia ou ao voltar para o app.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  checkReminders();
  if (!modal.open) render();
});

setInterval(checkReminders, 30000);

document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = icon(el.dataset.icon);
});
seedSemester();
applyTheme();
render();
checkReminders();

// Pede ao navegador para não apagar os dados do app quando o celular estiver sem espaço.
// Isso protege as tarefas salvas no aparelho e o login da conta. Em apps instalados o
// Chrome costuma aceitar sem perguntar nada.
navigator.storage?.persist?.().catch(() => {});

if (navigator.serviceWorker && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
