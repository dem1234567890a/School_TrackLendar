// 1. Configuration and constants
const USERS = [...];
const STU = USERS.filter(u => u.role === 'student');
const ROLE = { ... };
const LBL = { ... };
const D = 864e5;
const K = 'schoolyear_v1';

// 2. Utility functions
const $ = ...;
const e = ...;
const uid = ...;
const fmt = ...;
const nm = ...;

// 3. Initial application data
function seed() { ... }

// 4. Storage and notifications
let S;
function load() { ... }
function save() { ... }
function toast(t) { ... }

// 5. Task and event calculations
function status(t, sid) { ... }
const cnt = ...;
const stat = ...;
const upcoming = ...;

// 6. Shared UI components
function calendar(tasks) { ... }
function annList(del) { ... }

// 7. Role-based dashboards
function student() { ... }
function teacher() { ... }
function organizer() { ... }

// 8. Login and application rendering
let LR = 'student';
function login(err = '') { ... }
function render() { ... }

// 9. Shared event handlers
const typing = ...;
function go(msg) { ... }

// 10. Click events
document.addEventListener('click', ...);

// 11. Form submissions
document.addEventListener('submit', ...);

// 12. Cross-tab synchronization and initialization
window.addEventListener('storage', ...);
setInterval(...);
load();
render();
