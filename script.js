const USERS=[
{id:'T-100',pw:'teacher123',name:'Ms. Villanueva',role:'teacher'},
{id:'O-100',pw:'organizer123',name:'Mr. Garcia',role:'organizer'},
{id:'S-1001',pw:'student123',name:'Ana Reyes',role:'student'},
{id:'S-1002',pw:'student123',name:'Ben Cruz',role:'student'},
{id:'S-1003',pw:'student123',name:'Carla Santos',role:'student'},
{id:'S-1004',pw:'student123',name:'Dan Lim',role:'student'}];
const STU=USERS.filter(u=>u.role==='student'),ROLE={teacher:'Teacher',student:'Student',organizer:'Event Organizer'};
const LBL={todo:'Not started',doing:'In progress',done:'Finished',overdue:'Overdue'},D=864e5,K='schoolyear_v1';
const $=s=>document.querySelector(s),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9),fmt=d=>new Date(d).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'});
const nm=id=>(USERS.find(u=>u.id===id)||{}).name||id;
function seed(){const n=Date.now(),iso=o=>new Date(n+o*D).toISOString(),all=STU.map(s=>s.id);
return{me:null,calM:null,
tasks:[{id:'t1',title:'Science lab report',desc:'Write up the pendulum experiment results and include a graph.',due:iso(2),to:all,prog:{'S-1002':'doing'},file:{name:'lab-guide.txt',url:'data:text/plain;charset=utf-8,'+encodeURIComponent('Pendulum lab guide\n1. Time 10 swings\n2. Graph period against length')}},
{id:'t2',title:'Math worksheet 4',desc:'Complete problems 1 to 20 on quadratic equations.',due:iso(-1),to:all,prog:{'S-1001':'done'},file:null},
{id:'t3',title:'Reading journal: Chapter 5',desc:'One-page reflection on the chapter.',due:iso(6),to:all,prog:{},file:null}],
events:[{id:'e1',title:'Science Fair',when:iso(5),place:'Main gym',desc:'Student projects on display all afternoon.'},
{id:'e2',title:'Intramurals Opening',when:iso(12),place:'School oval',desc:'Parade of teams and opening games.'},
{id:'e3',title:'Parent-Teacher Conference',when:iso(20),place:'Classrooms',desc:'Report card day.'}],
ann:[{id:'a1',text:'Bring your lab notebooks on Monday. Quiz on pendulum motion.',by:'Ms. Villanueva',at:iso(-0.2)}],
rsvp:{e1:{'S-1001':'yes','S-1002':'no'}}}}
let S;function load(){try{S=JSON.parse(localStorage.getItem(K))}catch(x){S=null}if(!S)S=seed()}
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch(x){}}
function toast(t){const o=$('#toast');o.textContent=t;o.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>o.classList.remove('on'),1800)}
function status(t,sid){const p=t.prog[sid];if(p==='done')return'done';if(Date.now()>new Date(t.due))return'overdue';return p==='doing'?'doing':'todo'}
const cnt=ev=>{const r=S.rsvp[ev.id]||{},v=Object.values(r);const y=v.filter(x=>x==='yes').length,n=v.filter(x=>x==='no').length;return{y,n,w:STU.length-y-n}};
const stat=(n,l,c='')=>`<div class="stat ${c}"><b>${n}</b><span>${l}</span></div>`;
const upcoming=()=>S.events.filter(x=>new Date(x.when)>=Date.now()-D).sort((a,b)=>new Date(a.when)-new Date(b.when));

function calendar(tasks){
const base=S.calM?new Date(S.calM):new Date();const y=base.getFullYear(),m=base.getMonth(),first=new Date(y,m,1),dim=new Date(y,m+1,0).getDate(),now=new Date();
const items={};const add=(d,c,l)=>{const k=new Date(d);const key=k.getFullYear()+'-'+k.getMonth()+'-'+k.getDate();(items[key]=items[key]||[]).push({c,l})};
tasks.forEach(t=>add(t.due,t.cls||'s-todo','Due: '+t.title));S.events.forEach(x=>add(x.when,'ev',x.title));
let h=['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="h">${d}</div>`).join('');
for(let i=0;i<first.getDay();i++)h+='<div></div>';
for(let d=1;d<=dim;d++){const it=items[y+'-'+m+'-'+d]||[],td=now.getFullYear()===y&&now.getMonth()===m&&now.getDate()===d;
h+=`<div class="day${td?' today':''}"><b>${d}</b>${it.map(i=>`<span class="chip ${i.c}" title="${e(i.l)}">${e(i.l)}</span>`).join('')}</div>`}
return`<div class="panel"><div class="row sb"><h2>${first.toLocaleString('en',{month:'long',year:'numeric'})}</h2><div class="row"><button class="sm" data-act="cal" data-d="-1" aria-label="Previous month">‹</button><button class="sm" data-act="cal" data-d="0">Today</button><button class="sm" data-act="cal" data-d="1" aria-label="Next month">›</button></div></div><div class="cal">${h}</div><p class="mut">Yellow marks events. Colored marks show task deadlines.</p></div>`}

function annList(del){return S.ann.length?[...S.ann].sort((a,b)=>new Date(b.at)-new Date(a.at)).map(a=>`<div class="card"><div class="row sb"><span class="mut">${e(a.by)} · ${fmt(a.at)}</span>${del?`<button class="sm del" data-act="delann" data-id="${a.id}">Delete</button>`:''}</div><p style="margin:6px 0 0">${e(a.text)}</p></div>`).join(''):'<p class="mut">No announcements yet.</p>'}

function student(){const m=S.me,my=S.tasks.filter(t=>t.to.includes(m.id)).sort((a,b)=>new Date(a.due)-new Date(b.due));
const sts=my.map(t=>status(t,m.id)),fin=sts.filter(x=>x==='done').length,od=sts.filter(x=>x==='overdue').length,doing=sts.filter(x=>x==='doing').length;
const tasks=my.map((t,i)=>{const s=sts[i];t.cls='s-'+s;return`<div class="card"><div class="row sb"><h3>${e(t.title)}</h3><span class="badge s-${s}">${LBL[s]}</span></div>
<div class="mut">Due ${fmt(t.due)} · from ${e(nm('T-100'))}</div><p style="margin:6px 0">${e(t.desc)}</p>
${s==='overdue'?'<div class="warn">Overdue: no completed submission was made before the deadline. Submissions are now closed.</div>':''}
<div class="row" style="margin-top:8px">${t.file?`<a href="${t.file.url}" download="${e(t.file.name)}">Download ${e(t.file.name)}</a>`:''}<span class="sp"></span>
${s==='overdue'?'<button class="sm" disabled aria-disabled="true" title="The deadline has passed">Submission closed</button>':`${s==='todo'?`<button class="sm" data-act="start" data-id="${t.id}">Start working</button>`:''}${s!=='done'?`<button class="sm pri" data-act="finish" data-id="${t.id}">Mark as finished</button>`:'<span class="mut">Nice work.</span>'}`}</div></div>`}).join('')||'<p class="mut">No tasks assigned yet.</p>';
const evs=upcoming().map(ev=>{const r=(S.rsvp[ev.id]||{})[m.id],c=cnt(ev);return`<div class="card"><h3>${e(ev.title)}</h3><div class="mut">${fmt(ev.when)} · ${e(ev.place)}</div><p style="margin:6px 0">${e(ev.desc)}</p>
<div class="row"><button class="sm yes" aria-pressed="${r==='yes'}" data-act="rsvp" data-id="${ev.id}" data-v="yes">Attending</button><button class="sm no" aria-pressed="${r==='no'}" data-act="rsvp" data-id="${ev.id}" data-v="no">Not attending</button><span class="mut">${c.y} going · ${c.n} not going</span></div></div>`}).join('')||'<p class="mut">No upcoming events.</p>';
return`<h1>Hi, ${e(m.name.split(' ')[0])}</h1><p class="sub">Your tasks, deadlines, and school events.</p>
<div class="stats">${stat(fin,'Tasks finished','ok')}${stat(my.length-fin,'Tasks not finished','pg')}${stat(doing,'In progress')}${stat(od,'Overdue','bad')}</div>
<div class="grid"><div><div class="panel"><h2>My tasks</h2>${tasks}</div><div class="panel"><h2>Upcoming events</h2>${evs}</div></div>
<div>${calendar(my)}<div class="panel"><h2>Announcements</h2>${annList(false)}</div></div></div>`}

function teacher(){const T=S.tasks,sub=T.reduce((a,t)=>a+t.to.filter(s=>t.prog[s]==='done').length,0),od=T.reduce((a,t)=>a+t.to.filter(s=>status(t,s)==='overdue').length,0);
const list=[...T].sort((a,b)=>new Date(a.due)-new Date(b.due)).map(t=>{const c={todo:0,doing:0,done:0,overdue:0};t.to.forEach(s=>c[status(t,s)]++);const n=t.to.length||1;t.cls='s-todo';
return`<div class="card"><div class="row sb"><h3>${e(t.title)}</h3><button class="sm del" data-act="deltask" data-id="${t.id}">Delete</button></div><div class="mut">Due ${fmt(t.due)} · ${t.to.length} students${t.file?' · '+e(t.file.name):''}</div>
<div class="bar" aria-hidden="true"><i style="width:${c.done/n*100}%;background:var(--ok)"></i><i style="width:${c.doing/n*100}%;background:var(--pg)"></i><i style="width:${c.overdue/n*100}%;background:var(--bad)"></i></div>
<div class="row"><span class="badge s-done">${c.done} finished</span><span class="badge s-doing">${c.doing} in progress</span><span class="badge s-todo">${c.todo} not started</span><span class="badge s-overdue">${c.overdue} overdue</span></div></div>`}).join('')||'<p class="mut">No tasks yet. Create one on the right.</p>';
return`<h1>Teacher dashboard</h1><p class="sub">Assign work, set deadlines, and post announcements.</p>
<div class="stats">${stat(T.length,'Tasks assigned')}${stat(sub,'Finished submissions','ok')}${stat(od,'Overdue submissions','bad')}${stat(S.ann.length,'Announcements')}</div>
<div class="grid"><div><div class="panel"><h2>Task progress</h2>${list}</div>${calendar(T)}</div>
<div><div class="panel"><h2>Create a task</h2><form id="f-task"><label for="tt">Title</label><input id="tt" required maxlength="80"><label for="td">Instructions</label><textarea id="td" rows="3" maxlength="400"></textarea>
<label for="tdue">Deadline</label><input id="tdue" type="datetime-local" required><label for="tf">Attachment (up to 400 KB)</label><input id="tf" type="file">
<label>Assign to</label><div class="checks">${STU.map(s=>`<label><input type="checkbox" name="to" value="${s.id}" checked> ${e(s.name)}</label>`).join('')}</div>
<p class="err" id="terr"></p><button class="pri" type="submit">Assign task</button></form></div>
<div class="panel"><h2>Post an announcement</h2><form id="f-ann"><label for="at">Message</label><textarea id="at" rows="2" required maxlength="300"></textarea><p></p><button class="pri" type="submit">Publish announcement</button></form><div style="margin-top:14px">${annList(true)}</div></div></div></div>`}

function organizer(){const ev=[...S.events].sort((a,b)=>new Date(a.when)-new Date(b.when)),tot=ev.reduce((a,x)=>{const c=cnt(x);a.y+=c.y;a.n+=c.n;a.w+=c.w;return a},{y:0,n:0,w:0});
const list=ev.map(x=>{const c=cnt(x),r=S.rsvp[x.id]||{};return`<div class="card"><div class="row sb"><h3>${e(x.title)}</h3><button class="sm del" data-act="delev" data-id="${x.id}">Delete</button></div><div class="mut">${fmt(x.when)} · ${e(x.place)}</div>
<div class="row" style="margin:8px 0"><span class="badge s-done">${c.y} attending</span><span class="badge s-overdue">${c.n} not attending</span><span class="badge s-todo">${c.w} no response</span></div>
<details><summary class="mut">See who responded</summary>${STU.map(s=>`<div class="row sb"><span>${e(s.name)}</span><span class="mut">${r[s.id]==='yes'?'Attending':r[s.id]==='no'?'Not attending':'No response'}</span></div>`).join('')}</details></div>`}).join('')||'<p class="mut">No events yet. Create one on the right.</p>';
return`<h1>Event organizer dashboard</h1><p class="sub">Manage school events and watch responses come in.</p>
<div class="stats">${stat(ev.length,'Events')}${stat(tot.y,'Attending (all events)','ok')}${stat(tot.n,'Not attending','bad')}${stat(tot.w,'No response','pg')}</div>
<div class="grid"><div><div class="panel"><h2>Events and attendance</h2>${list}</div>${calendar([])}</div>
<div class="panel"><h2>Create an event</h2><form id="f-ev"><label for="et">Event name</label><input id="et" required maxlength="80"><label for="ew">Date and time</label><input id="ew" type="datetime-local" required>
<label for="ep">Place</label><input id="ep" required maxlength="60"><label for="ed">Details</label><textarea id="ed" rows="3" maxlength="300"></textarea><p></p><button class="pri" type="submit">Publish event</button></form></div></div>`}

let LR='student';
function login(err=''){return`<main><div class="panel login"><div class="logo" style="color:var(--brand);margin-bottom:12px"><i></i>Schoolyear</div><h1>Log in</h1><p class="sub">Choose your role, then enter your ID and password.</p><div class="roles" role="group" aria-label="Log in as">${Object.keys(ROLE).map(r=>`<button type="button" data-act="role" data-r="${r}" aria-pressed="${r===LR}">${ROLE[r]}</button>`).join('')}</div>
<form id="f-login"><label for="li">${LR==='student'?'Student ID':ROLE[LR]+' ID'}</label><input id="li" autocomplete="username" required><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required>
<p class="err" role="alert">${err}</p><button class="pri" type="submit" style="width:100%">Log in as ${ROLE[LR]}</button></form>
<p class="mut" style="margin:16px 0 0">Demo accounts (tap to fill):</p><div class="demo">${USERS.filter(u=>u.role===LR).map(u=>`<button class="sm" type="button" data-act="demo" data-id="${u.id}">${e(u.name)} (${u.id})</button>`).join('')}</div></div></main>`}

function render(){if(!S.me){$('#app').innerHTML=login();return}
const m=S.me;$('#app').innerHTML=`<header><div class="logo"><i></i>Schoolyear</div><span class="sp"></span><div class="who"><b>${e(m.name)}</b><br>${ROLE[m.role]} · ${m.id}</div><button class="ghost" data-act="logout">Log out</button></header><main>${m.role==='student'?student():m.role==='teacher'?teacher():organizer()}</main>`}
const typing=()=>/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'');
function go(msg){save();render();if(msg)toast(msg)}

document.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,m=S.me;
if(a==='role'){LR=b.dataset.r;$('#app').innerHTML=login();return}
if(a==='demo'){const u=USERS.find(x=>x.id===id);$('#li').value=u.id;$('#lp').value=u.pw;return}
if(a==='logout'){S.me=null;S.calM=null;return go()}
if(a==='cal'){const d=+b.dataset.d,c=S.calM?new Date(S.calM):new Date();S.calM=d?new Date(c.getFullYear(),c.getMonth()+d,1).toISOString():null;return go()}
if(m.role==='student'){const t=S.tasks.find(x=>x.id===id);
if((a==='start'||a==='finish')&&t&&status(t,m.id)==='overdue'){go();return toast('Submissions are closed for overdue tasks')}
if(a==='start'&&t){t.prog[m.id]='doing';go('Task started')}
if(a==='finish'&&t){t.prog[m.id]='done';go('Marked as finished')}
if(a==='rsvp'){const r=S.rsvp[id]=S.rsvp[id]||{};r[m.id]=r[m.id]===b.dataset.v?undefined:b.dataset.v;if(!r[m.id])delete r[m.id];go('Response saved')}}
if(m.role==='teacher'){if(a==='deltask'){S.tasks=S.tasks.filter(x=>x.id!==id);go('Task deleted')}if(a==='delann'){S.ann=S.ann.filter(x=>x.id!==id);go('Announcement deleted')}}
if(m.role==='organizer'&&a==='delev'){S.events=S.events.filter(x=>x.id!==id);delete S.rsvp[id];go('Event deleted')}});

document.addEventListener('submit',async ev=>{ev.preventDefault();const f=ev.target.id,v=i=>$('#'+i).value.trim();
if(f==='f-login'){const u=USERS.find(x=>x.id.toLowerCase()===v('li').toLowerCase()&&x.pw===$('#lp').value);if(!u){$('#app').innerHTML=login('ID or password is incorrect. Check both and try again.');return}
if(u.role!==LR){$('#app').innerHTML=login(`This ID is registered as a ${ROLE[u.role]}. Select ${ROLE[u.role]} above to log in.`);return}S.me=u;return go()}
if(f==='f-task'){const to=[...document.querySelectorAll('[name=to]:checked')].map(x=>x.value);if(!to.length){$('#terr').textContent='Choose at least one student.';return}
let file=null;const fl=$('#tf').files[0];if(fl){if(fl.size>4e5){$('#terr').textContent='That file is over 400 KB. Choose a smaller one.';return}
file=await new Promise(r=>{const x=new FileReader();x.onload=()=>r({name:fl.name,url:x.result});x.readAsDataURL(fl)})}
S.tasks.push({id:uid(),title:v('tt'),desc:v('td'),due:new Date($('#tdue').value).toISOString(),to,prog:{},file});return go('Task assigned')}
if(f==='f-ann'){S.ann.push({id:uid(),text:v('at'),by:S.me.name,at:new Date().toISOString()});return go('Announcement published')}
if(f==='f-ev'){S.events.push({id:uid(),title:v('et'),when:new Date($('#ew').value).toISOString(),place:v('ep'),desc:v('ed')});return go('Event published')}});

window.addEventListener('storage',x=>{if(x.key===K&&!typing()){load();render()}});
setInterval(()=>{if(S.me&&!typing())render()},6e4);
load();render();