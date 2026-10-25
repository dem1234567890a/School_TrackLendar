/* =====================================================================
   School-TrackLendar: application logic
   Sections: 1 Setup | 2 Data | 3 Helpers | 4 Shared views |
             5 Dashboards | 6 Login and policy | 7 Rendering |
             8 Click actions | 9 Form submissions | 10 Start up
   ===================================================================== */


/* ---------- 1. Setup: accounts and constants ---------- */

const USERS = [
  { id: 'T-100',  pw: 'teacher123',   name: 'Ms. Villanueva', role: 'teacher' },
  { id: 'O-100',  pw: 'organizer123', name: 'Mr. Garcia',     role: 'organizer' },
  { id: 'S-1001', pw: 'student123',   name: 'Ana Reyes',      role: 'student' },
  { id: 'S-1002', pw: 'student123',   name: 'Ben Cruz',       role: 'student' },
  { id: 'S-1003', pw: 'student123',   name: 'Carla Santos',   role: 'student' },
  { id: 'S-1004', pw: 'student123',   name: 'Dan Lim',        role: 'student' }
];

const STUDENTS = USERS.filter(u => u.role === 'student');

const ROLE = {
  teacher: 'Teacher',
  student: 'Student',
  organizer: 'Event Organizer'
};

const STATUS_LABEL = {
  todo: 'Not started',
  doing: 'In progress',
  done: 'Finished',
  overdue: 'Overdue'
};

const DAY = 864e5;                 // milliseconds in one day
const STORE_KEY = 'schoolyear_v1'; // localStorage key


/* ---------- 2. Data: sample data, saving, loading ---------- */

function seed() {
  const now = Date.now();
  const daysFromNow = n => new Date(now + n * DAY).toISOString();
  const allStudentIds = STUDENTS.map(s => s.id);

  return {
    me: null,      // logged-in user
    calM: null,    // month shown on the calendar

    tasks: [
      {
        id: 't1',
        title: 'Science lab report',
        desc: 'Write up the pendulum experiment results and include a graph.',
        due: daysFromNow(2),
        to: allStudentIds,
        prog: { 'S-1002': 'doing' },
        file: {
          name: 'lab-guide.txt',
          url: 'data:text/plain;charset=utf-8,' + encodeURIComponent(
            'Pendulum lab guide\n1. Time 10 swings\n2. Graph period against length'
          )
        }
      },
      {
        id: 't2',
        title: 'Math worksheet 4',
        desc: 'Complete problems 1 to 20 on quadratic equations.',
        due: daysFromNow(-1),
        to: allStudentIds,
        prog: { 'S-1001': 'done' },
        file: null
      },
      {
        id: 't3',
        title: 'Reading journal: Chapter 5',
        desc: 'One-page reflection on the chapter.',
        due: daysFromNow(6),
        to: allStudentIds,
        prog: {},
        file: null
      }
    ],

    events: [
      { id: 'e1', title: 'Science Fair', when: daysFromNow(5), place: 'Main gym', desc: 'Student projects on display all afternoon.' },
      { id: 'e2', title: 'Intramurals Opening', when: daysFromNow(12), place: 'School oval', desc: 'Parade of teams and opening games.' },
      { id: 'e3', title: 'Parent-Teacher Conference', when: daysFromNow(20), place: 'Classrooms', desc: 'Report card day.' }
    ],

    ann: [
      { id: 'a1', text: 'Bring your lab notebooks on Monday. Quiz on pendulum motion.', by: 'Ms. Villanueva', at: daysFromNow(-0.2) }
    ],

    rsvp: { e1: { 'S-1001': 'yes', 'S-1002': 'no' } }
  };
}

let S; // the whole app state

function load() {
  try {
    S = JSON.parse(localStorage.getItem(STORE_KEY));
  } catch (err) {
    S = null;
  }
  if (!S) S = seed();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (err) {
    // storage unavailable: the app still works for this visit
  }
}


/* ---------- 3. Helpers ---------- */

const $ = selector => document.querySelector(selector);

// Escape text before putting it in HTML
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const uid = () => Math.random().toString(36).slice(2, 9);

const fmt = date => new Date(date).toLocaleString('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const nameOf = id => (USERS.find(u => u.id === id) || {}).name || id;

function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('on'), 1800);
}

// Task status for one student: todo, doing, done or overdue
function getStatus(task, studentId) {
  const progress = task.prog[studentId];
  if (progress === 'done') return 'done';
  if (Date.now() > new Date(task.due)) return 'overdue';
  return progress === 'doing' ? 'doing' : 'todo';
}

// Attendance totals for one event
function attendanceCounts(event) {
  const answers = Object.values(S.rsvp[event.id] || {});
  const yes = answers.filter(a => a === 'yes').length;
  const no = answers.filter(a => a === 'no').length;
  return { yes, no, waiting: STUDENTS.length - yes - no };
}

function upcomingEvents() {
  return S.events
    .filter(ev => new Date(ev.when) >= Date.now() - DAY)
    .sort((a, b) => new Date(a.when) - new Date(b.when));
}

// One counter box
const statCard = (number, label, color = '') =>
  `<div class="stat ${color}"><b>${number}</b><span>${label}</span></div>`;


/* ---------- 4. Shared views: calendar and announcements ---------- */

function calendar(tasks) {
  const base = S.calM ? new Date(S.calM) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Group tasks and events by day
  const items = {};
  const addItem = (date, cls, label) => {
    const d = new Date(date);
    const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    (items[key] = items[key] || []).push({ cls, label });
  };
  tasks.forEach(t => addItem(t.due, t.cls || 's-todo', 'Due: ' + t.title));
  S.events.forEach(ev => addItem(ev.when, 'ev', ev.title));

  // Weekday headings, blank cells, then one cell per day
  let cells = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    .map(d => `<div class="h">${d}</div>`)
    .join('');
  for (let i = 0; i < first.getDay(); i++) cells += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const list = items[year + '-' + month + '-' + d] || [];
    const isToday = today.getFullYear() === year
      && today.getMonth() === month
      && today.getDate() === d;
    const chips = list
      .map(i => `<span class="chip ${i.cls}" title="${esc(i.label)}">${esc(i.label)}</span>`)
      .join('');
    cells += `<div class="day${isToday ? ' today' : ''}"><b>${d}</b>${chips}</div>`;
  }

  const title = first.toLocaleString('en', { month: 'long', year: 'numeric' });
  return `
    <div class="panel">
      <div class="row sb">
        <h2>${title}</h2>
        <div class="row">
          <button class="sm" data-act="cal" data-d="-1" aria-label="Previous month">‹</button>
          <button class="sm" data-act="cal" data-d="0">Today</button>
          <button class="sm" data-act="cal" data-d="1" aria-label="Next month">›</button>
        </div>
      </div>
      <div class="cal">${cells}</div>
      <p class="mut">Yellow marks events. Colored marks show task deadlines.</p>
    </div>`;
}

function announcementList(canDelete) {
  if (!S.ann.length) return '<p class="mut">No announcements yet.</p>';
  return [...S.ann]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .map(a => `
      <div class="card">
        <div class="row sb">
          <span class="mut">${esc(a.by)} · ${fmt(a.at)}</span>
          ${canDelete ? `<button class="sm del" data-act="delann" data-id="${a.id}">Delete</button>` : ''}
        </div>
        <p style="margin:6px 0 0">${esc(a.text)}</p>
      </div>`)
    .join('');
}


/* ---------- 5. Dashboards ---------- */

/* 5a. Student */

function studentTaskCard(task, status) {
  task.cls = 's-' + status; // colors the deadline on the calendar

  const attachment = task.file
    ? `<a href="${task.file.url}" download="${esc(task.file.name)}">Download ${esc(task.file.name)}</a>`
    : '';

  const overdueNote = status === 'overdue'
    ? '<div class="warn">Overdue: no completed submission was made before the deadline. Submissions are now closed.</div>'
    : '';

  // Overdue tasks are locked: no Start or Finish buttons
  let buttons;
  if (status === 'overdue') {
    buttons = '<button class="sm" disabled aria-disabled="true" title="The deadline has passed">Submission closed</button>';
  } else {
    const start = status === 'todo'
      ? `<button class="sm" data-act="start" data-id="${task.id}">Start working</button>`
      : '';
    const finish = status !== 'done'
      ? `<button class="sm pri" data-act="finish" data-id="${task.id}">Mark as finished</button>`
      : '<span class="mut">Nice work.</span>';
    buttons = start + finish;
  }

  return `
    <div class="card">
      <div class="row sb">
        <h3>${esc(task.title)}</h3>
        <span class="badge s-${status}">${STATUS_LABEL[status]}</span>
      </div>
      <div class="mut">Due ${fmt(task.due)} · from ${esc(nameOf('T-100'))}</div>
      <p style="margin:6px 0">${esc(task.desc)}</p>
      ${overdueNote}
      <div class="row" style="margin-top:8px">
        ${attachment}
        <span class="sp"></span>
        ${buttons}
      </div>
    </div>`;
}

function studentEventCard(event, studentId) {
  const answer = (S.rsvp[event.id] || {})[studentId];
  const c = attendanceCounts(event);
  return `
    <div class="card">
      <h3>${esc(event.title)}</h3>
      <div class="mut">${fmt(event.when)} · ${esc(event.place)}</div>
      <p style="margin:6px 0">${esc(event.desc)}</p>
      <div class="row">
        <button class="sm yes" aria-pressed="${answer === 'yes'}" data-act="rsvp" data-id="${event.id}" data-v="yes">Attending</button>
        <button class="sm no" aria-pressed="${answer === 'no'}" data-act="rsvp" data-id="${event.id}" data-v="no">Not attending</button>
        <span class="mut">${c.yes} going · ${c.no} not going</span>
      </div>
    </div>`;
}

function student() {
  const me = S.me;
  const myTasks = S.tasks
    .filter(t => t.to.includes(me.id))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  const statuses = myTasks.map(t => getStatus(t, me.id));

  const finished = statuses.filter(s => s === 'done').length;
  const overdue = statuses.filter(s => s === 'overdue').length;
  const inProgress = statuses.filter(s => s === 'doing').length;

  const taskCards = myTasks.map((t, i) => studentTaskCard(t, statuses[i])).join('')
    || '<p class="mut">No tasks assigned yet.</p>';
  const eventCards = upcomingEvents().map(ev => studentEventCard(ev, me.id)).join('')
    || '<p class="mut">No upcoming events.</p>';

  return `
    <h1>Hi, ${esc(me.name.split(' ')[0])}</h1>
    <p class="sub">Your tasks, deadlines, and school events.</p>
    <div class="stats">
      ${statCard(finished, 'Tasks finished', 'ok')}
      ${statCard(myTasks.length - finished, 'Tasks not finished', 'pg')}
      ${statCard(inProgress, 'In progress')}
      ${statCard(overdue, 'Overdue', 'bad')}
    </div>
    <div class="grid">
      <div>
        <div class="panel"><h2>My tasks</h2>${taskCards}</div>
        <div class="panel"><h2>Upcoming events</h2>${eventCards}</div>
      </div>
      <div>
        ${calendar(myTasks)}
        <div class="panel"><h2>Announcements</h2>${announcementList(false)}</div>
      </div>
    </div>`;
}

/* 5b. Teacher */

function teacherTaskCard(task) {
  const counts = { todo: 0, doing: 0, done: 0, overdue: 0 };
  task.to.forEach(id => counts[getStatus(task, id)]++);
  const total = task.to.length || 1;
  task.cls = 's-todo';

  return `
    <div class="card">
      <div class="row sb">
        <h3>${esc(task.title)}</h3>
        <button class="sm del" data-act="deltask" data-id="${task.id}">Delete</button>
      </div>
      <div class="mut">Due ${fmt(task.due)} · ${task.to.length} students${task.file ? ' · ' + esc(task.file.name) : ''}</div>
      <div class="bar" aria-hidden="true">
        <i style="width:${counts.done / total * 100}%;background:var(--ok)"></i>
        <i style="width:${counts.doing / total * 100}%;background:var(--pg)"></i>
        <i style="width:${counts.overdue / total * 100}%;background:var(--bad)"></i>
      </div>
      <div class="row">
        <span class="badge s-done">${counts.done} finished</span>
        <span class="badge s-doing">${counts.doing} in progress</span>
        <span class="badge s-todo">${counts.todo} not started</span>
        <span class="badge s-overdue">${counts.overdue} overdue</span>
      </div>
    </div>`;
}

function teacher() {
  const tasks = S.tasks;
  const finishedTotal = tasks.reduce((sum, t) => sum + t.to.filter(id => t.prog[id] === 'done').length, 0);
  const overdueTotal = tasks.reduce((sum, t) => sum + t.to.filter(id => getStatus(t, id) === 'overdue').length, 0);

  const taskCards = [...tasks]
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .map(teacherTaskCard)
    .join('') || '<p class="mut">No tasks yet. Create one on the right.</p>';

  const studentChecks = STUDENTS
    .map(s => `<label><input type="checkbox" name="to" value="${s.id}" checked> ${esc(s.name)}</label>`)
    .join('');

  return `
    <h1>Teacher dashboard</h1>
    <p class="sub">Assign work, set deadlines, and post announcements.</p>
    <div class="stats">
      ${statCard(tasks.length, 'Tasks assigned')}
      ${statCard(finishedTotal, 'Finished submissions', 'ok')}
      ${statCard(overdueTotal, 'Overdue submissions', 'bad')}
      ${statCard(S.ann.length, 'Announcements')}
    </div>
    <div class="grid">
      <div>
        <div class="panel"><h2>Task progress</h2>${taskCards}</div>
        ${calendar(tasks)}
      </div>
      <div>
        <div class="panel">
          <h2>Create a task</h2>
          <form id="f-task">
            <label for="tt">Title</label>
            <input id="tt" required maxlength="80">
            <label for="td">Instructions</label>
            <textarea id="td" rows="3" maxlength="400"></textarea>
            <label for="tdue">Deadline</label>
            <input id="tdue" type="datetime-local" required>
            <label for="tf">Attachment (up to 400 KB)</label>
            <input id="tf" type="file">
            <label>Assign to</label>
            <div class="checks">${studentChecks}</div>
            <p class="err" id="terr"></p>
            <button class="pri" type="submit">Assign task</button>
          </form>
        </div>
        <div class="panel">
          <h2>Post an announcement</h2>
          <form id="f-ann">
            <label for="at">Message</label>
            <textarea id="at" rows="2" required maxlength="300"></textarea>
            <p></p>
            <button class="pri" type="submit">Publish announcement</button>
          </form>
          <div style="margin-top:14px">${announcementList(true)}</div>
        </div>
      </div>
    </div>`;
}

/* 5c. Event organizer */

function organizerEventCard(event) {
  const c = attendanceCounts(event);
  const answers = S.rsvp[event.id] || {};
  const responseRows = STUDENTS.map(s => {
    const text = answers[s.id] === 'yes' ? 'Attending'
      : answers[s.id] === 'no' ? 'Not attending'
      : 'No response';
    return `<div class="row sb"><span>${esc(s.name)}</span><span class="mut">${text}</span></div>`;
  }).join('');

  return `
    <div class="card">
      <div class="row sb">
        <h3>${esc(event.title)}</h3>
        <button class="sm del" data-act="delev" data-id="${event.id}">Delete</button>
      </div>
      <div class="mut">${fmt(event.when)} · ${esc(event.place)}</div>
      <div class="row" style="margin:8px 0">
        <span class="badge s-done">${c.yes} attending</span>
        <span class="badge s-overdue">${c.no} not attending</span>
        <span class="badge s-todo">${c.waiting} no response</span>
      </div>
      <details>
        <summary class="mut">See who responded</summary>
        ${responseRows}
      </details>
    </div>`;
}

function organizer() {
  const events = [...S.events].sort((a, b) => new Date(a.when) - new Date(b.when));
  const totals = events.reduce((sum, ev) => {
    const c = attendanceCounts(ev);
    sum.yes += c.yes;
    sum.no += c.no;
    sum.waiting += c.waiting;
    return sum;
  }, { yes: 0, no: 0, waiting: 0 });

  const eventCards = events.map(organizerEventCard).join('')
    || '<p class="mut">No events yet. Create one on the right.</p>';

  return `
    <h1>Event organizer dashboard</h1>
    <p class="sub">Manage school events and watch responses come in.</p>
    <div class="stats">
      ${statCard(events.length, 'Events')}
      ${statCard(totals.yes, 'Attending (all events)', 'ok')}
      ${statCard(totals.no, 'Not attending', 'bad')}
      ${statCard(totals.waiting, 'No response', 'pg')}
    </div>
    <div class="grid">
      <div>
        <div class="panel"><h2>Events and attendance</h2>${eventCards}</div>
        ${calendar([])}
      </div>
      <div class="panel">
        <h2>Create an event</h2>
        <form id="f-ev">
          <label for="et">Event name</label>
          <input id="et" required maxlength="80">
          <label for="ew">Date and time</label>
          <input id="ew" type="datetime-local" required>
          <label for="ep">Place</label>
          <input id="ep" required maxlength="60">
          <label for="ed">Details</label>
          <textarea id="ed" rows="3" maxlength="300"></textarea>
          <p></p>
          <button class="pri" type="submit">Publish event</button>
        </form>
      </div>
    </div>`;
}


/* ---------- 6. Login and Privacy Policy ---------- */

let selectedRole = 'student'; // role button chosen on the login screen
let showPolicy = false;       // true while the Privacy Policy page is open

// Each entry is [heading, text]. Edit the contact line before submitting.
const POLICY = [
  [
    '1. What data is collected and why',
    'School-TrackLendar has no server or database run by the developer, and the ' +
    'developer does not receive your information. While you use the app, the following ' +
    'is stored only in your own web browser (localStorage) so the app can work: the role ' +
    'and ID you log in with, tasks and your progress on them, announcements, events and ' +
    'attendance responses, and any file you attach (up to 400 KB). This information is ' +
    'used only to show your dashboard, calendar, task statuses and attendance counts.'
  ],
  [
    '2. How information is used, stored and shared',
    'Information is used only inside the app and is stored only on your own device. It ' +
    'is not sold, shared or transferred, and the developer cannot see it. The site loads ' +
    'the Lexend font from Google Fonts, so Google may receive your IP address and ' +
    'browser details, as described in Google’s own privacy policy. The website host may ' +
    'also keep standard technical server logs, such as IP address and time of visit, ' +
    'which the developer does not control. The app uses no analytics, advertising or ' +
    'tracking cookies.'
  ],
  [
    '3. Deleting your information',
    'Because your data is kept only in your browser, you can remove it at any time: ' +
    'delete tasks, announcements or events inside the app, or clear the site data for ' +
    'this website in your browser settings. The developer holds no copy, so cannot ' +
    'recover or delete it for you remotely. Clearing site data cannot be undone.'
  ],
  [
    '4. Safeguards and limitations',
    'Your data is not sent anywhere by the app, and each role only sees its own ' +
    'dashboard. This is a coursework project, not a secure production system: logins are ' +
    'checked inside the page itself, test accounts are used, and data in browser storage ' +
    'is not encrypted. Anyone with access to your device or browser, or with technical ' +
    'knowledge, may be able to view this data. Please use fictitious or test data only ' +
    'and do not enter real passwords, student records, or other sensitive personal ' +
    'information.'
  ],
  [
    '5. Changes to this policy',
    'This policy may be updated as the app changes. The date at the top shows the latest ' +
    'version.'
  ],
  [
    '6. Contact',
    'For privacy questions, contact the developer at [your email address].'
  ]
];

function policyPage() {
  const sections = POLICY
    .map(([heading, text]) => `<h2>${esc(heading)}</h2><p>${esc(text)}</p>`)
    .join('');
  return `
    <main>
      <div class="panel pol" style="max-width:760px;margin:0 auto">
        <button class="sm" data-act="back">‹ Back</button>
        <h1 style="margin-top:14px">Privacy Policy</h1>
        <p class="mut">School-TrackLendar · Last updated: October 25, 2026</p>
        ${sections}
      </div>
    </main>`;
}

function loginPage(error = '') {
  const roleButtons = Object.keys(ROLE)
    .map(r => `<button type="button" data-act="role" data-r="${r}" aria-pressed="${r === selectedRole}">${ROLE[r]}</button>`)
    .join('');

  const demoButtons = USERS
    .filter(u => u.role === selectedRole)
    .map(u => `<button class="sm" type="button" data-act="demo" data-id="${u.id}">${esc(u.name)} (${u.id})</button>`)
    .join('');

  const demoPassword = { teacher: 'teacher123', organizer: 'organizer123', student: 'student123' }[selectedRole];
  const idLabel = selectedRole === 'student' ? 'Student ID' : ROLE[selectedRole] + ' ID';

  return `
    <main>
      <div class="panel login">
        <div class="logo" style="color:var(--brand);margin-bottom:12px"><i></i>School-TrackLendar</div>
        <h1>Log in</h1>
        <p class="sub">Choose your role, then enter your ID and password.</p>
        <div class="roles" role="group" aria-label="Log in as">${roleButtons}</div>
        <form id="f-login">
          <label for="li">${idLabel}</label>
          <input id="li" autocomplete="username" required>
          <label for="lp">Password</label>
          <input id="lp" type="password" autocomplete="current-password" required>
          <p class="err" role="alert">${error}</p>
          <button class="pri" type="submit" style="width:100%">Log in as ${ROLE[selectedRole]}</button>
        </form>
        <p class="mut" style="margin:16px 0 0">Demo accounts (tap to fill):</p>
        <div class="demo">${demoButtons}</div>
        <p class="mut" style="margin:8px 0 0">Password for ${ROLE[selectedRole]} demo accounts: <b>${demoPassword}</b></p>
        <p class="foot" style="padding:8px 0 0"><a href="#privacy" data-act="privacy">Privacy Policy</a></p>
      </div>
    </main>`;
}


/* ---------- 7. Rendering ---------- */

function render() {
  if (showPolicy) { $('#app').innerHTML = policyPage(); return; }
  if (!S.me) { $('#app').innerHTML = loginPage(); return; }

  const me = S.me;
  const dashboard = me.role === 'student' ? student()
    : me.role === 'teacher' ? teacher()
    : organizer();

  $('#app').innerHTML = `
    <header>
      <div class="logo"><i></i>School-TrackLendar</div>
      <span class="sp"></span>
      <div class="who"><b>${esc(me.name)}</b><br>${ROLE[me.role]} · ${me.id}</div>
      <button class="ghost" data-act="logout">Log out</button>
    </header>
    <main>${dashboard}</main>
    <footer class="foot"><a href="#privacy" data-act="privacy">Privacy Policy</a></footer>`;
}

// True while the user is typing, so a refresh does not erase their input
const isTyping = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');

// Save, redraw, and optionally show a message
function update(message) {
  save();
  render();
  if (message) toast(message);
}


/* ---------- 8. Click actions (buttons use data-act) ---------- */

document.addEventListener('click', event => {
  const button = event.target.closest('[data-act]');
  if (!button) return;

  const action = button.dataset.act;
  const id = button.dataset.id;
  const me = S.me;

  // Privacy Policy page
  if (action === 'privacy') { event.preventDefault(); showPolicy = true; update(); window.scrollTo(0, 0); return; }
  if (action === 'back') { showPolicy = false; update(); return; }

  // Login screen
  if (action === 'role') { selectedRole = button.dataset.r; $('#app').innerHTML = loginPage(); return; }
  if (action === 'demo') {
    const user = USERS.find(u => u.id === id);
    $('#li').value = user.id;
    $('#lp').value = user.pw;
    return;
  }

  // Header and calendar
  if (action === 'logout') { S.me = null; S.calM = null; update(); return; }
  if (action === 'cal') {
    const step = +button.dataset.d;
    const current = S.calM ? new Date(S.calM) : new Date();
    S.calM = step ? new Date(current.getFullYear(), current.getMonth() + step, 1).toISOString() : null;
    update();
    return;
  }

  // Student actions
  if (me.role === 'student') {
    const task = S.tasks.find(t => t.id === id);

    // Overdue tasks cannot be started or submitted
    if ((action === 'start' || action === 'finish') && task && getStatus(task, me.id) === 'overdue') {
      update();
      toast('Submissions are closed for overdue tasks');
      return;
    }
    if (action === 'start' && task) {
      task.prog[me.id] = 'doing';
      update('Task started');
    }
    if (action === 'finish' && task) {
      task.prog[me.id] = 'done';
      update('Marked as finished');
    }
    if (action === 'rsvp') {
      const answers = S.rsvp[id] = S.rsvp[id] || {};
      // Pressing the same answer again clears it
      answers[me.id] = answers[me.id] === button.dataset.v ? undefined : button.dataset.v;
      if (!answers[me.id]) delete answers[me.id];
      update('Response saved');
    }
  }

  // Teacher actions
  if (me.role === 'teacher') {
    if (action === 'deltask') { S.tasks = S.tasks.filter(t => t.id !== id); update('Task deleted'); }
    if (action === 'delann') { S.ann = S.ann.filter(a => a.id !== id); update('Announcement deleted'); }
  }

  // Event organizer actions
  if (me.role === 'organizer' && action === 'delev') {
    S.events = S.events.filter(ev => ev.id !== id);
    delete S.rsvp[id];
    update('Event deleted');
  }
});


/* ---------- 9. Form submissions ---------- */

document.addEventListener('submit', async event => {
  event.preventDefault();
  const formId = event.target.id;
  const value = fieldId => $('#' + fieldId).value.trim();

  // Login: check ID and password, then check the role matches the button chosen
  if (formId === 'f-login') {
    const user = USERS.find(u => u.id.toLowerCase() === value('li').toLowerCase() && u.pw === $('#lp').value);
    if (!user) {
      $('#app').innerHTML = loginPage('ID or password is incorrect. Check both and try again.');
      return;
    }
    if (user.role !== selectedRole) {
      $('#app').innerHTML = loginPage(`This ID is registered as a ${ROLE[user.role]}. Select ${ROLE[user.role]} above to log in.`);
      return;
    }
    S.me = user;
    update();
    return;
  }

  // Teacher: create a task (with optional attachment up to 400 KB)
  if (formId === 'f-task') {
    const to = [...document.querySelectorAll('[name=to]:checked')].map(box => box.value);
    if (!to.length) { $('#terr').textContent = 'Choose at least one student.'; return; }

    let file = null;
    const chosen = $('#tf').files[0];
    if (chosen) {
      if (chosen.size > 4e5) { $('#terr').textContent = 'That file is over 400 KB. Choose a smaller one.'; return; }
      file = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: chosen.name, url: reader.result });
        reader.readAsDataURL(chosen);
      });
    }

    S.tasks.push({
      id: uid(),
      title: value('tt'),
      desc: value('td'),
      due: new Date($('#tdue').value).toISOString(),
      to,
      prog: {},
      file
    });
    update('Task assigned');
    return;
  }

  // Teacher: publish an announcement
  if (formId === 'f-ann') {
    S.ann.push({ id: uid(), text: value('at'), by: S.me.name, at: new Date().toISOString() });
    update('Announcement published');
    return;
  }

  // Event organizer: publish an event
  if (formId === 'f-ev') {
    S.events.push({
      id: uid(),
      title: value('et'),
      when: new Date($('#ew').value).toISOString(),
      place: value('ep'),
      desc: value('ed')
    });
    update('Event published');
  }
});


/* ---------- 10. Start up ---------- */

// Keep several open tabs in sync
window.addEventListener('storage', event => {
  if (event.key === STORE_KEY && !isTyping()) { load(); render(); }
});

// Refresh every minute so tasks switch to Overdue on time
setInterval(() => { if (S.me && !isTyping()) render(); }, 60000);

load();
render();
