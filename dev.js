/* ─────────────────────────────────────────────────────────────
   URCOD Dev Panel — إدارة العملاء والتراخيص
   • «الهَب»: مشروع Firebase واحد بتاعك فيه سجل العملاء + تاريخ التراخيص.
   • كل عميل: اتصال منفصل بمشروعه (Firebase app باسم c_<id>) بحساب المطوّر.
   • كل القراءات والكتابات صغيرة ومن جهازك بس، فمفيش أي ضغط على خطة أي عميل.
   ───────────────────────────────────────────────────────────── */
(function () {
"use strict";
const H = window.HUB_CONFIG, V = H.firebaseSdk;
const SDK = n => `https://www.gstatic.com/firebasejs/${V}/${n}.js`;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const fmt = n => (+n).toLocaleString("ar-EG");
const day = 864e5;
const dateAr = iso => iso ? new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }) : "";
const dtAr = iso => iso ? new Date(iso).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const toLocal = iso => { if (!iso) return ""; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const slug = s => String(s || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const PLANS = { trial: "تجريبي", monthly: "شهري", custom: "مدة مخصّصة", annual: "سنوي", lifetime: "دائم" };
const I = {
  plus: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  ref: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
  link: '<svg class="ic" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  warn: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
  info: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  user: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  store: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 10h16l-1.5-5h-13zM5 10v9h14v-9M10 19v-5h4v5"/></svg>'
};
function toast(m, bad) { const t = $("#toast"); t.textContent = m; t.className = "toast on" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = "toast", 3000); }

/* ═════════ licence helpers ═════════ */
function licState(l) {
  if (!l) return { k: "none", t: "بدون ترخيص", pill: "draft" };
  if (l.status === "suspended") return { k: "suspended", t: "موقوف", pill: "paused" };
  if (l.endsAt && new Date(l.endsAt) <= Date.now()) return { k: "expired", t: "منتهي", pill: "ended" };
  if (!l.endsAt) return { k: "active", t: "دائم", pill: "active" };
  const d = Math.ceil((new Date(l.endsAt) - Date.now()) / day);
  return d <= 7 ? { k: "soon", t: `باقي ${fmt(d)} يوم`, pill: "scheduled", d } : { k: "active", t: `باقي ${fmt(d)} يوم`, pill: "active", d };
}
const pill = l => { const s = licState(l); return `<span class="pill ${s.pill}">${s.t}</span>`; };

/* ═════════ backends ═════════ */
let fb = null;
async function sdk() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([import(SDK("firebase-app")), import(SDK("firebase-auth")), import(SDK("firebase-firestore-lite"))]);
  return fb = { app, auth, fs };
}
const plain = v => { if (v && typeof v.toDate === "function") return v.toDate().toISOString(); if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = plain(v[k]); return o; } return v; };
const errMsg = e => { const c = e?.code || e?.message || "";
  if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c)) return "البريد أو كلمة المرور غلط.";
  if (/too-many/.test(c)) return "محاولات كتير. استنى شوية.";
  if (/network|unavailable/.test(c)) return "مفيش اتصال.";
  if (/permission/.test(c)) return "مرفوض من قواعد الأمان. اتأكد إن صلاحية المطوّر مفعّلة في المشروع ده.";
  if (/email-already-in-use/.test(c)) return "البريد ده عليه حساب بالفعل في المشروع ده.";
  if (/invalid-email/.test(c)) return "البريد مش صحيح.";
  if (/weak-password/.test(c)) return "كلمة المرور ضعيفة.";
  if (/operation-not-allowed/.test(c)) return "تسجيل الدخول بالبريد مش مفعّل في Authentication للمشروع ده.";
  return "حصلت مشكلة: " + c; };

/* role check + first-time bootstrap (verified dev email may grant itself dev) */
async function ensureDev(fsMod, db, authMod, auth) {
  const u = auth.currentUser, ref = fsMod.doc(db, "roles", u.uid);
  const r = await fsMod.getDoc(ref);
  if (r.exists() && r.data().role === "dev") return { ok: true };
  if ((u.email || "").toLowerCase() !== (H.devEmail || "").toLowerCase()) return { ok: false, why: "role" };
  await u.reload();
  if (!u.emailVerified) { return { ok: false, why: "verify" }; }
  /* الـ token القديم لسه مكتوب فيه إن البريد مش متأكد؛ لازم token جديد قبل ما القواعد تشوفه */
  await u.getIdToken(true);
  await fsMod.setDoc(ref, { role: "dev", email: u.email });
  return { ok: true, bootstrapped: true };
}

/* ── real hub ── */
function realHub() {
  let app, auth, db;
  return {
    async init() { const { app: A, auth: Au, fs } = await sdk(); app = A.getApps().find(a => a.name === "hub") || A.initializeApp(H.firebase, "hub");
      auth = Au.getAuth(app); db = fs.getFirestore(app); await auth.authStateReady(); return !!auth.currentUser; },
    get email() { return auth?.currentUser?.email || ""; },
    async login(e, p) { await fb.auth.signInWithEmailAndPassword(auth, e, p); },
    async logout() { await fb.auth.signOut(auth); },
    async check() { return ensureDev(fb.fs, db, fb.auth, auth); },
    async sendVerify() { await fb.auth.sendEmailVerification(auth.currentUser); },
    async list() { const s = await fb.fs.getDocs(fb.fs.collection(db, "clients")); return s.docs.map(d => plain(d.data())); },
    async save(c) { await fb.fs.setDoc(fb.fs.doc(db, "clients", c.id), Object.assign({}, c, { updatedAt: fb.fs.serverTimestamp() })); },
    async patch(id, data) { await fb.fs.updateDoc(fb.fs.doc(db, "clients", id), data); },
    async remove(id) { await fb.fs.deleteDoc(fb.fs.doc(db, "clients", id)); },
    async addHistory(id, e) { await fb.fs.addDoc(fb.fs.collection(db, "clients", id, "history"), Object.assign(e, { at: fb.fs.serverTimestamp(), by: auth.currentUser.email })); },
    async history(id) { const q = fb.fs.query(fb.fs.collection(db, "clients", id, "history"), fb.fs.orderBy("at", "desc"), fb.fs.limit(30));
      return (await fb.fs.getDocs(q)).docs.map(d => plain(d.data())); }
  };
}
/* ── real client connection ── */
function realConn(c) {
  const name = "c_" + c.id; let app, auth, db, fs, Au;
  const D = (...p) => fs.doc(db, ...p);
  const log = (action, target, note = "") => fs.addDoc(fs.collection(db, "auditLogs"), { uid: auth.currentUser.uid, action, target, note, at: fs.serverTimestamp() }).catch(() => {});
  return {
    async init() { await sdk(); fs = fb.fs; Au = fb.auth; app = fb.app.getApps().find(a => a.name === name) || fb.app.initializeApp(c.firebase, name);
      auth = Au.getAuth(app); db = fs.getFirestore(app); await auth.authStateReady(); return !!auth.currentUser; },
    async publicMeta() { await this.init(); const m = await fs.getDoc(D("public", "meta")); return m.exists() ? plain(m.data()) : null; },
    async login(e, p) { await Au.signInWithEmailAndPassword(auth, e, p); },
    async createDevAccount(e, p) { await Au.createUserWithEmailAndPassword(auth, e, p); await Au.sendEmailVerification(auth.currentUser); },
    async sendVerify() { await Au.sendEmailVerification(auth.currentUser); },
    async logout() { await Au.signOut(auth); },
    get email() { return auth?.currentUser?.email || ""; },
    async check() { return ensureDev(fs, db, Au, auth); },
    async meta() { const m = await fs.getDoc(D("public", "meta")); return m.exists() ? plain(m.data()) : null; },
    async setLicense(l) {
      const lic = { status: l.status, plan: l.plan, menuOnExpiry: l.menuOnExpiry, endsAt: l.endsAt ? fs.Timestamp.fromDate(new Date(l.endsAt)) : null, renewedAt: fs.serverTimestamp() };
      const m = await fs.getDoc(D("public", "meta"));
      if (m.exists()) await fs.updateDoc(D("public", "meta"), { license: lic }); else await fs.setDoc(D("public", "meta"), { version: 0, updatedAt: fs.serverTimestamp(), license: lic });
      log("license_update", "public/meta", `${l.status} / ${l.plan} / ${l.endsAt || "دائم"}`);
    },
    async menuStats() { const m = await fs.getDoc(D("public", "menu")); if (!m.exists()) return null; const d = m.data();
      return { categories: (d.categories || []).length, products: (d.products || []).length, ads: (d.ads || []).length, name: d.brand?.name?.ar || d.brand?.name?.en || "" }; },
    async seed(menu) { const m = await fs.getDoc(D("public", "meta")); const b = fs.writeBatch(db);
      b.set(D("public", "menu"), Object.assign(clone(menu), { updatedAt: fs.serverTimestamp() }));
      if (m.exists()) b.update(D("public", "meta"), { version: (m.data().version || 0) + 1, updatedAt: fs.serverTimestamp() });
      else b.set(D("public", "meta"), { version: 1, updatedAt: fs.serverTimestamp(), license: { status: "active", plan: "trial", endsAt: fs.Timestamp.fromDate(new Date(Date.now() + 7 * day)), menuOnExpiry: "show" } });
      await b.commit(); log("seed_menu", "public/menu"); },
    async roles() { const s = await fs.getDocs(fs.collection(db, "roles")); return s.docs.map(d => Object.assign({ uid: d.id }, d.data())); },
    async createAdmin(email) {
      /* حساب جديد من app مؤقت عشان جلسة المطوّر ماتتقفلش */
      const tmp = fb.app.initializeApp(c.firebase, name + "_mk_" + Date.now()), ta = Au.getAuth(tmp);
      const pass = crypto.getRandomValues(new Uint32Array(4)).join("-") + "Aa!";
      try { const cr = await Au.createUserWithEmailAndPassword(ta, email, pass); const uid = cr.user.uid; await Au.signOut(ta);
        await fs.setDoc(D("roles", uid), { role: "admin", email, createdAt: fs.serverTimestamp() });
        await Au.sendPasswordResetEmail(auth, email); log("grant_admin", "roles/" + uid, email); return uid;
      } finally { fb.app.deleteApp(tmp).catch(() => {}); }
    },
    async grantUid(uid, email) { await fs.setDoc(D("roles", uid), { role: "admin", email: email || "", createdAt: fs.serverTimestamp() }); log("grant_admin", "roles/" + uid, email || ""); },
    async revoke(uid) { await fs.deleteDoc(D("roles", uid)); log("revoke_admin", "roles/" + uid); },
    async reset(email) { await Au.sendPasswordResetEmail(auth, email); log("reset_password", email); },
    async audit() { const q = fs.query(fs.collection(db, "auditLogs"), fs.orderBy("at", "desc"), fs.limit(60)); return (await fs.getDocs(q)).docs.map(d => plain(d.data())); },
    async notes() { const s = await fs.getDoc(D("private", "devNotes")); return s.exists() ? s.data().text || "" : ""; },
    async saveNotes(t) { await fs.setDoc(D("private", "devNotes"), { text: t, updatedAt: fs.serverTimestamp() }); },
    async gh() { const s = await fs.getDoc(D("secure", "github")); return s.exists() ? s.data() : null; },
    async saveGh(g) { await fs.setDoc(D("secure", "github"), g); log("github_config", "secure/github", g.owner + "/" + g.repo); }
  };
}

/* ── demo (no Firebase): same API, data in this browser ── */
const DK = "urcod.devpanel.demo";
const dget = () => { try { return JSON.parse(localStorage.getItem(DK)); } catch { return null; } };
const dset = v => { try { localStorage.setItem(DK, JSON.stringify(v)); } catch {} };
function demoData() {
  let d = dget(); if (d) return d;
  const now = Date.now(), iso = ms => new Date(ms).toISOString();
  const mk = (id, name, lic) => ({ id, name, owner: "", phone: "", menuUrl: `https://urcod-eg.github.io/${id}/`, repo: `https://github.com/urcod-eg/${id}`, notes: "",
    firebase: { apiKey: "demo", authDomain: id + ".firebaseapp.com", projectId: id, appId: "demo" }, license: lic, createdAt: iso(now - 40 * day) });
  d = { clients: [
      mk("cafe-elnil", "كافيه النيل", { status: "active", plan: "annual", endsAt: iso(now + 200 * day), menuOnExpiry: "show" }),
      mk("pizza-house", "بيتزا هاوس", { status: "active", plan: "monthly", endsAt: iso(now + 4 * day), menuOnExpiry: "show" }),
      mk("grill-time", "جريل تايم", { status: "active", plan: "trial", endsAt: iso(now - 2 * day), menuOnExpiry: "hide" }),
      mk("sweet-corner", "سويت كورنر", { status: "active", plan: "lifetime", endsAt: null, menuOnExpiry: "show" })],
    projects: {}, history: {} };
  d.clients.forEach(c => d.projects[c.id] = { meta: { version: 3, license: c.license }, menu: { categories: 5, products: 32, ads: 2 },
    roles: [{ uid: "dev1", role: "dev", email: H.devEmail || "dev@urcod" }, { uid: "adm-" + c.id, role: "admin", email: "owner@" + c.id + ".com" }],
    audit: [{ action: "publish_menu", target: "public/menu", note: "4 changes", at: iso(now - 3 * 36e5), uid: "adm-" + c.id }], notes: "", gh: null });
  dset(d); return d;
}
function demoHub() {
  let logged = !!sessionStorage.getItem(DK + ".in");
  return {
    async init() { demoData(); return logged; },
    get email() { return H.devEmail || "dev@urcod"; },
    async login() { logged = true; sessionStorage.setItem(DK + ".in", "1"); }, async logout() { sessionStorage.removeItem(DK + ".in"); },
    async check() { return { ok: true } }, async sendVerify() {},
    async list() { return clone(demoData().clients); },
    async save(c) { const d = demoData(), k = d.clients.findIndex(x => x.id === c.id); if (k < 0) { d.clients.push(c); d.projects[c.id] = { meta: null, menu: null, roles: [{ uid: "dev1", role: "dev", email: H.devEmail || "dev@urcod" }], audit: [], notes: "", gh: null }; } else d.clients[k] = c; dset(d); },
    async patch(id, data) { const d = demoData(); Object.assign(d.clients.find(x => x.id === id), clone(data)); dset(d); },
    async remove(id) { const d = demoData(); d.clients = d.clients.filter(x => x.id !== id); dset(d); },
    async addHistory(id, e) { const d = demoData(); (d.history[id] ||= []).unshift(Object.assign(e, { at: new Date().toISOString(), by: this.email })); dset(d); },
    async history(id) { return clone(demoData().history[id] || []); }
  };
}
function demoConn(c) {
  const P = () => demoData().projects[c.id], save = fn => { const d = demoData(); fn(d.projects[c.id], d); dset(d); };
  const log = (action, target, note = "") => save(p => p.audit.unshift({ action, target, note, at: new Date().toISOString(), uid: "dev1" }));
  let inn = !!sessionStorage.getItem(DK + ".c." + c.id);
  return {
    async init() { return inn; }, async publicMeta() { return clone(P()?.meta || null); },
    async login() { inn = true; sessionStorage.setItem(DK + ".c." + c.id, "1"); }, async createDevAccount() { inn = true; }, async sendVerify() {},
    async logout() { inn = false; sessionStorage.removeItem(DK + ".c." + c.id); }, get email() { return H.devEmail || "dev@urcod"; },
    async check() { return { ok: true }; }, async meta() { return clone(P().meta); },
    async setLicense(l) { save(p => { p.meta ||= { version: 0 }; p.meta.license = clone(l); }); log("license_update", "public/meta", `${l.status} / ${l.plan}`); },
    async menuStats() { return P().menu ? Object.assign({ name: c.name }, P().menu) : null; },
    async seed(menu) { save(p => { p.menu = { categories: menu.categories.length, products: menu.products.length, ads: menu.ads.length };
      p.meta ||= { version: 0, license: { status: "active", plan: "trial", endsAt: new Date(Date.now() + 7 * day).toISOString(), menuOnExpiry: "show" } }; p.meta.version++; }); log("seed_menu", "public/menu"); },
    async roles() { return clone(P().roles); },
    async createAdmin(email) { const uid = "adm-" + Math.random().toString(36).slice(2, 8); save(p => p.roles.push({ uid, role: "admin", email })); log("grant_admin", "roles/" + uid, email); return uid; },
    async grantUid(uid, email) { save(p => p.roles.push({ uid, role: "admin", email })); log("grant_admin", "roles/" + uid, email); },
    async revoke(uid) { save(p => p.roles = p.roles.filter(r => r.uid !== uid)); log("revoke_admin", "roles/" + uid); },
    async reset(email) { log("reset_password", email); },
    async audit() { return clone(P().audit); }, async notes() { return P().notes; }, async saveNotes(t) { save(p => p.notes = t); },
    async gh() { return clone(P().gh); }, async saveGh(g) { save(p => p.gh = g); log("github_config", "secure/github", g.owner + "/" + g.repo); }
  };
}
const hub = H.demo ? demoHub() : realHub();
const conns = {};
const conn = c => conns[c.id] ||= (H.demo ? demoConn(c) : realConn(c));

/* ═════════ state + routing ═════════ */
let clients = [], filter = "all", q = "", cur = null, ctab = "license";

async function boot() {
  if (!H.demo && !H.firebase.projectId) { $("#view").innerHTML = `<div class="card login"><h1>لوحة المطور</h1><p class="err">املأ إعدادات مشروع الهَب في hub-config.js الأول.</p></div>`; return; }
  try { const inn = await hub.init(); if (inn) return afterLogin(); } catch (e) { console.error(e); }
  showLogin();
}
function showLogin(msg = "") {
  $("#top").hidden = true;
  $("#view").innerHTML = `<div class="card login"><img src="assets/urcod-logo.jpg" alt="URCOD" class="brandimg">
    <h1>لوحة المطوّر</h1><p class="muted">إدارة عملاء المنيو الإلكتروني وتراخيصهم.</p>
    <form class="form" id="hubF" novalidate>
      <label class="f">البريد<input class="in" id="hE" type="email" dir="ltr" autocomplete="username" value="${esc(H.devEmail)}"></label>
      <label class="f">كلمة المرور<input class="in" id="hP" type="password" dir="ltr" autocomplete="current-password"></label>
      <p class="err" id="hErr">${esc(msg)}</p><button class="btn primary">دخول</button></form>
    ${H.demo ? `<p class="hint">وضع تجريبي: أي بريد وكلمة مرور هيدخلوك، والبيانات وهمية على الجهاز ده.</p>` : ""}</div>`;
  $("#hubF").onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector("button"); b.disabled = true;
    try { await hub.login($("#hE").value.trim(), $("#hP").value); await afterLogin(); } catch (x) { $("#hErr").textContent = errMsg(x); } finally { b.disabled = false; } };
}
async function afterLogin() {
  const r = await hub.check().catch(e => ({ ok: false, why: "err", e }));
  if (!r.ok) {
    if (r.why === "verify") return showVerify(hub, "مشروع الهَب", () => afterLogin());
    await hub.logout();
    return showLogin(r.why === "role" ? "الحساب ده مش حساب المطوّر." : /permission/.test(r.e?.code || "")
      ? "مشروع الهَب رفض الطلب. اتأكد إنك لصقت hub.rules في Firestore › Rules ودوست Publish، وإن البريد اللي فيها هو بريدك." : errMsg(r.e));
  }
  if (r.bootstrapped) toast("صلاحية المطوّر اتفعّلت في مشروع الهَب.");
  $("#top").hidden = false; $("#who").textContent = hub.email;
  clients = await hub.list().catch(() => []);
  const m = location.hash.match(/^#client-(.+)$/); const want = m && decodeURIComponent(m[1]);
  if (want && clients.find(c => c.id === want)) openClient(want); else listView();
}
function showVerify(target, where, done) {
  $("#view").innerHTML = `<div class="card login"><h1>أكّد بريدك</h1>
    <p>عشان صلاحية المطوّر تتفعّل في ${esc(where)}، لازم تأكد البريد <b dir="ltr">${esc(target.email)}</b>. اتبعتلك رسالة فيها رابط.</p>
    <div class="row"><button class="btn primary" id="vDone">أكّدت، كمّل</button><button class="btn" id="vSend">ابعت الرسالة تاني</button></div><p class="err" id="vErr"></p></div>`;
  $("#vDone").onclick = done;
  $("#vSend").onclick = async () => { try { await target.sendVerify(); toast("اتبعتت."); } catch (e) { $("#vErr").textContent = errMsg(e); } };
}
$("#logoutBtn").onclick = async () => { for (const k in conns) await conns[k].logout().catch(() => {}); await hub.logout(); location.hash = ""; location.reload(); };
$("#homeBtn").onclick = () => { cur = null; location.hash = ""; listView(); };

/* ═════════ clients list ═════════ */
function listView() {
  $("#homeBtn").hidden = true; cur = null;
  const st = clients.map(c => licState(c.license).k);
  const n = k => st.filter(x => x === k).length;
  let list = clients.slice().sort((a, b) => { const o = { expired: 0, suspended: 1, soon: 2, none: 3, active: 4 };
    return o[licState(a.license).k] - o[licState(b.license).k] || String(a.name).localeCompare(b.name, "ar"); });
  if (filter !== "all") list = list.filter(c => { const k = licState(c.license).k; return filter === "attention" ? ["expired", "suspended", "soon", "none"].includes(k) : k === filter; });
  if (q) list = list.filter(c => (c.name + " " + c.id + " " + (c.owner || "") + " " + (c.phone || "")).toLowerCase().includes(q));
  $("#view").innerHTML = `<div class="view">
    <div class="row"><h1 class="grow">العملاء</h1><button class="btn" id="refreshAll">${I.ref}تحديث الحالة</button><button class="btn primary" data-act="newClient">${I.plus}عميل</button></div>
    <div class="stats">
      <div class="stat"><b>${fmt(clients.length)}</b><span>عميل</span></div>
      <div class="stat"><b>${fmt(n("active"))}</b><span>ساري</span></div>
      <div class="stat warn"><b>${fmt(n("soon"))}</b><span>هينتهي خلال أسبوع</span></div>
      <div class="stat bad"><b>${fmt(n("expired") + n("suspended"))}</b><span>منتهي أو موقوف</span></div>
    </div>
    <input class="search" id="cq" type="search" placeholder="ابحث بالاسم أو المعرّف أو التليفون…" value="${esc(q)}">
    <div class="filters">${[["all", "الكل"], ["attention", "محتاج متابعة"], ["active", "ساري"], ["soon", "قرب ينتهي"], ["expired", "منتهي"], ["suspended", "موقوف"]]
      .map(([k, t]) => `<button class="chip ${filter === k ? "on" : ""}" data-filt="${k}">${t}</button>`).join("")}</div>
    ${list.length ? `<div class="list">${list.map((c, i) => `<div class="item" style="--i:${i}" data-open="${esc(c.id)}">
        <div class="thumb">${I.store}</div>
        <div class="t"><b>${esc(c.name)}</b><small dir="ltr" style="text-align:end">${esc(c.id)}</small>
          <small>${c.license ? PLANS[c.license.plan] || "" : ""}${c.license?.endsAt ? " · ينتهي " + dateAr(c.license.endsAt) : ""}${c.licenseCheckedAt ? " · اتحدّث " + dtAr(c.licenseCheckedAt) : ""}</small></div>
        ${pill(c.license)}</div>`).join("")}</div>`
      : `<div class="empty">${clients.length ? "مفيش عملاء بالفلتر ده." : "مفيش عملاء لسه. دوس «عميل» عشان تضيف أول واحد."}</div>`}</div>`;
  $("#cq").oninput = e => { q = e.target.value.trim().toLowerCase(); clearTimeout(listView.t); listView.t = setTimeout(() => { listView(); const x = $("#cq"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 200); };
  $("#refreshAll").onclick = refreshAll;
}
async function refreshAll() {
  const b = $("#refreshAll"); b.disabled = true; let ok = 0, bad = 0;
  for (const c of clients) {
    try { const m = await conn(c).publicMeta(); const lic = m?.license || null, at = new Date().toISOString();
      c.license = lic; c.licenseCheckedAt = at; await hub.patch(c.id, { license: lic, licenseCheckedAt: at }); ok++; }
    catch (e) { bad++; console.warn(c.id, e); }
  }
  toast(`اتحدّث ${fmt(ok)} عميل${bad ? ` · ${fmt(bad)} ماقدرتش أوصله` : ""}.`, bad > 0); listView();
}

/* ═════════ client form ═════════ */
function parseConfig(txt) {
  const g = k => (txt.match(new RegExp(k + `\\s*["']?\\s*:\\s*["']([^"']+)["']`)) || [])[1] || "";
  return { apiKey: g("apiKey"), authDomain: g("authDomain"), projectId: g("projectId"), appId: g("appId") };
}
function clientForm(id) {
  const isNew = !id, c = isNew ? { id: "", name: "", owner: "", phone: "", menuUrl: "", repo: "", notes: "", firebase: { apiKey: "", authDomain: "", projectId: "", appId: "" } } : clone(clients.find(x => x.id === id));
  sheet(isNew ? "عميل جديد" : "بيانات العميل", `<div class="form">
    <div class="two stack"><label class="f">اسم المطعم<input class="in" id="fName" value="${esc(c.name)}"></label>
      <label class="f">المعرّف (clientId)<input class="in" id="fId" dir="ltr" value="${esc(c.id)}" ${isNew ? "" : "disabled"} placeholder="cafe-elnil"><small>حروف إنجليزي صغيرة وأرقام و - بس. نفس اللي في config.js</small></label></div>
    <div class="two stack"><label class="f">صاحب المطعم<input class="in" id="fOwner" value="${esc(c.owner)}"></label>
      <label class="f">التليفون<input class="in" id="fPhone" dir="ltr" inputmode="tel" value="${esc(c.phone)}"></label></div>
    <div class="two stack"><label class="f">رابط المنيو<input class="in" id="fUrl" dir="ltr" inputmode="url" placeholder="https://…github.io/…/" value="${esc(c.menuUrl)}"></label>
      <label class="f">رابط الـ repo<input class="in" id="fRepo" dir="ltr" inputmode="url" placeholder="https://github.com/…" value="${esc(c.repo)}"></label></div>
    <fieldset><legend>إعدادات Firebase للعميل</legend>
      <label class="f">الصق كود الإعدادات من Console هنا<textarea class="in" id="fPaste" dir="ltr" placeholder="const firebaseConfig = { apiKey: ... }"></textarea><small>بيتقري تلقائيًا ويملا الخانات اللي تحت.</small></label>
      <div class="two stack"><label class="f">apiKey<input class="in" id="fK" dir="ltr" value="${esc(c.firebase.apiKey)}"></label><label class="f">projectId<input class="in" id="fP" dir="ltr" value="${esc(c.firebase.projectId)}"></label></div>
      <div class="two stack"><label class="f">authDomain<input class="in" id="fD" dir="ltr" value="${esc(c.firebase.authDomain)}"></label><label class="f">appId<input class="in" id="fA" dir="ltr" value="${esc(c.firebase.appId)}"></label></div>
    </fieldset>
    <label class="f">ملاحظات داخلية<textarea class="in" id="fNotes">${esc(c.notes)}</textarea><small>بتتحفظ في الهَب بتاعك بس، والعميل مابيشوفهاش.</small></label>
    <p class="err" id="fErr"></p></div>`,
    [isNew ? null : ["مسح من القايمة", "danger", () => confirmBox("مسح «" + c.name + "» من القايمة؟", "ده بيشيله من لوحتك بس. مشروع Firebase والمنيو بتوعه مش هيتلمسوا.", "مسح").then(async ok => {
      if (!ok) return clientForm(id); await hub.remove(c.id); clients = clients.filter(x => x.id !== c.id); listView(); toast("اتشال من القايمة."); })],
     ["حفظ", "primary", async () => {
      const err = m => $("#fErr").textContent = m;
      c.name = $("#fName").value.trim(); if (isNew) c.id = slug($("#fId").value);
      c.owner = $("#fOwner").value.trim(); c.phone = $("#fPhone").value.trim(); c.menuUrl = $("#fUrl").value.trim(); c.repo = $("#fRepo").value.trim(); c.notes = $("#fNotes").value.trim();
      c.firebase = { apiKey: $("#fK").value.trim(), authDomain: $("#fD").value.trim(), projectId: $("#fP").value.trim(), appId: $("#fA").value.trim() };
      if (!c.name) return err("اكتب اسم المطعم.");
      if (!c.id) return err("اكتب المعرّف.");
      if (isNew && clients.some(x => x.id === c.id)) return err("المعرّف ده مستخدم لعميل تاني.");
      if (!c.firebase.apiKey || !c.firebase.projectId) return err("إعدادات Firebase ناقصة (apiKey و projectId على الأقل).");
      for (const u of [c.menuUrl, c.repo]) if (u && !/^https:\/\//.test(u)) return err("الروابط لازم تبدأ بـ https://");
      if (isNew) c.createdAt = new Date().toISOString();
      try { await hub.save(c); delete conns[c.id];
        const k = clients.findIndex(x => x.id === c.id); if (k < 0) clients.push(c); else clients[k] = c;
        closeSheet(); toast(isNew ? "العميل اتضاف." : "اتحفظ."); openClient(c.id); } catch (e) { err(errMsg(e)); }
    }]]);
  $("#fPaste").addEventListener("input", e => { const p = parseConfig(e.target.value);
    if (p.apiKey) $("#fK").value = p.apiKey; if (p.projectId) $("#fP").value = p.projectId; if (p.authDomain) $("#fD").value = p.authDomain; if (p.appId) $("#fA").value = p.appId;
    if (p.projectId && !$("#fId").value && !$("#fId").disabled) $("#fId").value = slug(p.projectId); });
}

/* ═════════ client detail ═════════ */
async function openClient(id) {
  cur = clients.find(c => c.id === id); if (!cur) return listView();
  location.hash = "client-" + encodeURIComponent(id); $("#homeBtn").hidden = false;
  const cn = conn(cur);
  $("#view").innerHTML = `<div class="view"><p class="hint">بيتصل بمشروع ${esc(cur.firebase.projectId)}…</p></div>`;
  let inn = false; try { inn = await cn.init(); } catch (e) { return clientShell(`<div class="banner bad">${I.warn}<div class="grow">ماقدرتش أتصل بالمشروع: ${esc(errMsg(e))}</div></div>`); }
  if (!inn) return clientLogin();
  const r = await cn.check().catch(e => ({ ok: false, why: "err", e }));
  if (!r.ok) {
    if (r.why === "verify") return showVerify(cn, `مشروع «${cur.name}»`, () => openClient(id));
    return clientShell(`<div class="banner bad">${I.warn}<div class="grow"><b>الحساب ده مالوش صلاحية مطوّر في المشروع ده.</b><br>${r.why === "role" ? "ادخل ببريد المطوّر اللي في firestore.rules." : esc(errMsg(r.e))}</div><button class="btn sm" id="reLogin">دخول بحساب تاني</button></div>`,
      () => $("#reLogin").onclick = async () => { await cn.logout(); clientLogin(); });
  }
  if (r.bootstrapped) toast("صلاحية المطوّر اتفعّلت في مشروع العميل.");
  renderClient();
}
function clientShell(body, after) {
  const c = cur;
  $("#view").innerHTML = `<div class="view">
    <div class="row"><div class="grow"><h1>${esc(c.name)}</h1><small class="muted" dir="ltr">${esc(c.id)} · ${esc(c.firebase.projectId)}</small></div>
      ${pill(c.license)}<button class="btn sm" data-act="editClient">بيانات العميل</button></div>
    <div class="row" style="gap:6px">${c.menuUrl ? `<a class="btn sm" href="${esc(c.menuUrl)}" target="_blank" rel="noopener">${I.link}المنيو</a><a class="btn sm" href="${esc(c.menuUrl.replace(/\/?$/, "/"))}admin.html" target="_blank" rel="noopener">${I.link}لوحة الإدارة</a>` : ""}
      ${c.repo ? `<a class="btn sm" href="${esc(c.repo)}" target="_blank" rel="noopener">${I.link}الـ repo</a>` : ""}${c.phone ? `<a class="btn sm" href="https://wa.me/${esc(c.phone.replace(/\D/g, "").replace(/^0/, "20"))}" target="_blank" rel="noopener">${I.link}واتساب</a>` : ""}</div>
    ${body}</div>`;
  after?.();
}
function clientLogin(msg = "") {
  const cn = conn(cur);
  clientShell(`<div class="card"><h2>دخول مشروع العميل</h2>
    <p class="hint">كل عميل في مشروع Firebase منفصل. ادخل بحساب المطوّر بتاع المشروع ده (غالبًا نفس بريدك وكلمة سرك).</p>
    <form class="form" id="cF" novalidate>
      <label class="f">البريد<input class="in" id="cE" type="email" dir="ltr" autocomplete="username" value="${esc(H.devEmail || hub.email)}"></label>
      <label class="f">كلمة المرور<input class="in" id="cP" type="password" dir="ltr" autocomplete="current-password"></label>
      <p class="err" id="cErr">${esc(msg)}</p>
      <div class="row"><button class="btn primary" type="submit">دخول</button><button class="btn" type="button" id="cNew">مشروع جديد: اعمل حساب المطوّر</button></div>
    </form></div>`);
  $("#cF").onsubmit = async e => { e.preventDefault(); try { await cn.login($("#cE").value.trim(), $("#cP").value); openClient(cur.id); } catch (x) { $("#cErr").textContent = errMsg(x); } };
  $("#cNew").onclick = async () => {
    const em = $("#cE").value.trim(), p = $("#cP").value;
    if (!em || p.length < 8) return $("#cErr").textContent = "اكتب البريد وكلمة مرور ٨ حروف على الأقل.";
    try { await cn.createDevAccount(em, p); toast("الحساب اتعمل، واتبعتت رسالة تأكيد للبريد."); openClient(cur.id); } catch (x) { $("#cErr").textContent = errMsg(x); }
  };
}
const TABS = [["license", "الترخيص"], ["accounts", "الحسابات"], ["menu", "المنيو"], ["images", "الصور"], ["audit", "السجل"], ["notes", "ملاحظات"]];
function renderClient() {
  clientShell(`<div class="filters" role="tablist">${TABS.map(([k, t]) => `<button class="chip ${ctab === k ? "on" : ""}" data-ctab="${k}" role="tab" aria-selected="${ctab === k}">${t}</button>`).join("")}</div>
    <div id="pane"><p class="hint">بيحمّل…</p></div>`);
  ({ license: paneLicense, accounts: paneAccounts, menu: paneMenu, images: paneImages, audit: paneAudit, notes: paneNotes })[ctab]().catch(e => { $("#pane").innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; });
}

/* ── licence ── */
async function paneLicense() {
  const cn = conn(cur), m = await cn.meta(), l = m?.license || { status: "active", plan: "trial", endsAt: null, menuOnExpiry: "show" };
  const hist = await hub.history(cur.id).catch(() => []);
  cur.license = m?.license || null;
  $("#pane").innerHTML = `
    <div class="card"><div class="row"><h2 class="grow">الحالة الحالية</h2>${pill(m?.license)}</div>
      <p class="muted" style="margin:6px 0 0">${m?.license ? `${PLANS[l.plan] || "—"} · ${l.endsAt ? "ينتهي " + dateAr(l.endsAt) : "بدون تاريخ انتهاء"} · المنيو بعد الانتهاء: ${l.menuOnExpiry === "hide" ? "يتقفل" : "يفضل ظاهر"}` : "لسه مفيش ترخيص للمشروع ده."}
      ${m ? ` · إصدار المنيو ${fmt(m.version || 0)}` : ""}</p></div>
    <fieldset><legend>تجديد سريع</legend>
      <div class="quick">${[[7, "+٧ أيام تجربة", "trial"], [30, "+شهر", "monthly"], [60, "+شهرين", "custom"], [365, "+سنة", "annual"], [0, "دائم", "lifetime"]]
        .map(([d, t, p]) => `<button class="btn" data-renew="${d}" data-plan="${p}">${t}</button>`).join("")}</div>
      <p class="hint">التجديد بيتحسب من تاريخ الانتهاء الحالي لو لسه ساري، أو من النهارده لو خلص.</p></fieldset>
    <fieldset><legend>تعديل يدوي</legend>
      <div class="two stack"><label class="f">الحالة<select class="in" id="lS"><option value="active" ${l.status === "active" ? "selected" : ""}>نشط</option><option value="suspended" ${l.status === "suspended" ? "selected" : ""}>موقوف إداريًا</option></select></label>
        <label class="f">الخطة<select class="in" id="lP">${Object.entries(PLANS).map(([k, t]) => `<option value="${k}" ${l.plan === k ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
      <div class="two stack"><label class="f">ينتهي في<input class="in" id="lE" type="datetime-local" value="${toLocal(l.endsAt)}"><small>فاضي = دائم</small></label>
        <label class="f">المنيو بعد الانتهاء أو الإيقاف<select class="in" id="lM"><option value="show" ${l.menuOnExpiry !== "hide" ? "selected" : ""}>يفضل ظاهر للزبون</option><option value="hide" ${l.menuOnExpiry === "hide" ? "selected" : ""}>يتقفل للزبون</option></select></label></div>
      <label class="f">ملاحظة على التغيير (اختياري)<input class="in" id="lN" placeholder="مثلًا: دفع سنة كاملة كاش"></label>
      <button class="btn primary" id="lSave">حفظ الترخيص</button></fieldset>
    <div class="card"><h2>تاريخ الترخيص</h2>${hist.length ? `<div class="list" style="margin-top:8px">${hist.map(h => `<div class="item"><div class="t"><b>${esc(PLANS[h.plan] || h.plan || "")} · ${h.status === "suspended" ? "موقوف" : "نشط"}${h.endsAt ? " · لحد " + dateAr(h.endsAt) : " · دائم"}</b>
      <small>${dtAr(h.at)}${h.note ? " · " + esc(h.note) : ""}</small></div></div>`).join("")}</div>` : `<p class="hint">مفيش تغييرات متسجّلة لسه.</p>`}</div>`;
  const save = async lic => {
    try { await cn.setLicense(lic); await hub.addHistory(cur.id, Object.assign({ note: $("#lN")?.value.trim() || "" }, lic));
      const at = new Date().toISOString(); cur.license = lic; cur.licenseCheckedAt = at; await hub.patch(cur.id, { license: lic, licenseCheckedAt: at });
      toast("الترخيص اتحفظ."); renderClient(); } catch (e) { toast(errMsg(e), true); } };
  $$("[data-renew]").forEach(b => b.onclick = () => {
    const d = +b.dataset.renew, baseT = l.endsAt && new Date(l.endsAt) > Date.now() ? new Date(l.endsAt).getTime() : Date.now();
    const lic = { status: "active", plan: b.dataset.plan, menuOnExpiry: $("#lM").value, endsAt: d ? new Date(baseT + d * day).toISOString() : null };
    confirmBox(`تأكيد: ${b.textContent}`, lic.endsAt ? `الترخيص هيبقى ساري لحد ${dateAr(lic.endsAt)}.` : "الترخيص هيبقى دائم بدون تاريخ انتهاء.", "تأكيد", "primary").then(ok => ok && save(lic));
  });
  $("#lSave").onclick = () => save({ status: $("#lS").value, plan: $("#lP").value, menuOnExpiry: $("#lM").value, endsAt: $("#lE").value ? new Date($("#lE").value).toISOString() : null });
}

/* ── accounts ── */
async function paneAccounts() {
  const cn = conn(cur), rs = await cn.roles();
  const admins = rs.filter(r => r.role === "admin"), devs = rs.filter(r => r.role === "dev");
  $("#pane").innerHTML = `
    <div class="card"><h2>حسابات إدارة المطعم</h2>
      ${admins.length ? `<div class="list" style="margin-top:8px">${admins.map(a => `<div class="item"><div class="thumb">${I.user}</div><div class="t"><b dir="ltr" style="text-align:end">${esc(a.email || "بدون بريد")}</b><small dir="ltr" style="text-align:end">${esc(a.uid)}</small></div>
        ${a.email ? `<button class="btn sm" data-reset="${esc(a.email)}">رابط كلمة مرور</button>` : ""}<button class="btn sm danger" data-revoke="${esc(a.uid)}">شيل الصلاحية</button></div>`).join("")}</div>` : `<p class="hint">مفيش أدمن لسه.</p>`}</div>
    <fieldset><legend>أدمن جديد</legend>
      <label class="f">بريد صاحب المطعم<input class="in" id="aE" type="email" dir="ltr" placeholder="owner@example.com"></label>
      <p class="hint">بيتعمل الحساب بكلمة مرور عشوائية محدش يعرفها، وبيوصل للعميل رابط يحط منه كلمة المرور بتاعته. إنت مابتشوفش كلمة المرور خالص.</p>
      <button class="btn primary" id="aNew">إنشاء الحساب وإرسال الرابط</button>
      <details><summary class="hint" style="cursor:pointer">الحساب موجود بالفعل في Authentication؟</summary>
        <div class="two stack" style="margin-top:8px"><label class="f">UID<input class="in" id="aU" dir="ltr"></label><label class="f">البريد (للعرض)<input class="in" id="aUE" dir="ltr" type="email"></label></div>
        <button class="btn" id="aGrant" style="margin-top:8px">إعطاء صلاحية أدمن</button></details>
      <p class="err" id="aErr"></p></fieldset>
    <div class="card"><h2>حسابات المطوّر</h2><p class="hint" dir="ltr" style="text-align:end">${devs.map(d => esc(d.email || d.uid)).join("<br>") || "—"}</p></div>`;
  const reload = () => paneAccounts().catch(e => toast(errMsg(e), true));
  $("#aNew").onclick = async () => { const em = $("#aE").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return $("#aErr").textContent = "البريد مش صحيح.";
    $("#aNew").disabled = true; try { await cn.createAdmin(em); toast("الحساب اتعمل، والرابط اتبعت لـ " + em); reload(); } catch (e) { $("#aErr").textContent = errMsg(e); } finally { $("#aNew").disabled = false; } };
  $("#aGrant").onclick = async () => { const u = $("#aU").value.trim(); if (!u) return $("#aErr").textContent = "اكتب الـ UID.";
    try { await cn.grantUid(u, $("#aUE").value.trim()); toast("الصلاحية اتدّت."); reload(); } catch (e) { $("#aErr").textContent = errMsg(e); } };
  $$("[data-reset]").forEach(b => b.onclick = async () => { try { await cn.reset(b.dataset.reset); toast("رابط تغيير كلمة المرور اتبعت."); } catch (e) { toast(errMsg(e), true); } });
  $$("[data-revoke]").forEach(b => b.onclick = () => confirmBox("شيل صلاحية الأدمن؟", "الحساب هيفضل موجود بس مش هيقدر يدخل لوحة الإدارة.", "شيل").then(async ok => {
    if (!ok) return; try { await cn.revoke(b.dataset.revoke); toast("الصلاحية اتشالت."); reload(); } catch (e) { toast(errMsg(e), true); } }));
}

/* ── menu ── */
async function paneMenu() {
  const cn = conn(cur), s = await cn.menuStats(), m = await cn.meta();
  $("#pane").innerHTML = `<div class="card"><h2>المنيو</h2>${s ? `<div class="stats" style="margin-top:8px">
      <div class="stat"><b>${fmt(s.categories)}</b><span>قسم</span></div><div class="stat"><b>${fmt(s.products)}</b><span>صنف</span></div>
      <div class="stat"><b>${fmt(s.ads)}</b><span>إعلان</span></div><div class="stat"><b>${fmt(m?.version || 0)}</b><span>رقم الإصدار</span></div></div>
      ${s.name ? `<p class="hint">الاسم في المنيو: ${esc(s.name)}</p>` : ""}` : `<p class="hint">المشروع ده لسه مافيهوش منيو.</p>`}</div>
    <fieldset><legend>${s ? "استبدال بالمنيو التجريبي" : "بداية العميل"}</legend>
      <p class="hint">${s ? "بيمسح المنيو الحالي ويحط المنيو التجريبي مكانه. استخدمه بس لو العميل لسه مابدأش." : "بيرفع منيو تجريبي يبدأ منه العميل، ولو مفيش ترخيص بيعمل تجربة ٧ أيام."}</p>
      <button class="btn ${s ? "danger" : "primary"}" id="seed">${s ? "استبدال بالتجريبي" : "رفع المنيو التجريبي"}</button></fieldset>`;
  $("#seed").onclick = () => (s ? confirmBox("استبدال المنيو؟", "المنيو الحالي للعميل هيتمسح. مفيش رجوع.", "استبدال") : Promise.resolve(true)).then(async ok => {
    if (!ok) return; try { await cn.seed(window.SAMPLE_MENU); toast("المنيو التجريبي اترفع."); renderClient(); } catch (e) { toast(errMsg(e), true); } });
}

/* ── images ── */
async function paneImages() {
  const cn = conn(cur), g = await cn.gh() || {};
  $("#pane").innerHTML = `<fieldset><legend>رفع الصور من الجهاز (GitHub)</legend>
    <p class="hint">repo عام للصور بس، عليه GitHub Pages، وFine-grained token بصلاحية Contents: Read and write على الـ repo ده بس.</p>
    <div class="two stack"><label class="f">owner<input class="in" id="gO" dir="ltr" value="${esc(g.owner)}" placeholder="urcod-eg"></label><label class="f">repo<input class="in" id="gR" dir="ltr" value="${esc(g.repo)}" placeholder="${esc(cur.id)}-img"></label></div>
    <div class="two stack"><label class="f">الفرع<input class="in" id="gB" dir="ltr" value="${esc(g.branch || "main")}"></label><label class="f">الرابط العام (اختياري)<input class="in" id="gU" dir="ltr" value="${esc(g.publicBase)}" placeholder="https://owner.github.io/repo"></label></div>
    <label class="f">Token<input class="in" id="gT" dir="ltr" type="password" autocomplete="off" placeholder="${g.token ? "محفوظ — اكتب جديد لو عايز تغيّره" : "github_pat_…"}"></label>
    <div class="row"><button class="btn" id="gTest">اختبار الاتصال</button><button class="btn primary" id="gSave">حفظ</button></div><p class="err" id="gErr"></p></fieldset>`;
  const cfg = () => ({ owner: $("#gO").value.trim(), repo: $("#gR").value.trim(), branch: $("#gB").value.trim() || "main", publicBase: $("#gU").value.trim(), token: $("#gT").value.trim() || g.token || "" });
  $("#gTest").onclick = async () => { const c = cfg(); if (!c.owner || !c.repo || !c.token) return $("#gErr").textContent = "املأ owner و repo و token.";
    if (H.demo) return toast("وضع تجريبي: مفيش اتصال حقيقي.");
    try { const r = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`, { headers: { Authorization: "Bearer " + c.token, Accept: "application/vnd.github+json" } });
      if (!r.ok) return $("#gErr").textContent = "GitHub رد بـ " + r.status + ". اتأكد من الاسم وصلاحية الـ token.";
      const j = await r.json(); if (j.private) return $("#gErr").textContent = "الـ repo private، والصور لازم تبقى في repo عام.";
      toast(j.permissions?.push ? "الاتصال تمام وفيه صلاحية رفع." : "الـ token مالوش صلاحية رفع.", !j.permissions?.push); } catch { $("#gErr").textContent = "فشل الاتصال بـ GitHub."; } };
  $("#gSave").onclick = async () => { const c = cfg(); if (!c.owner || !c.repo || !c.token) return $("#gErr").textContent = "املأ owner و repo و token.";
    if (c.publicBase && !/^https:\/\//.test(c.publicBase)) return $("#gErr").textContent = "الرابط العام لازم يبدأ بـ https://";
    try { await cn.saveGh(c); toast("رفع الصور اتفعّل للعميل ده."); paneImages(); } catch (e) { $("#gErr").textContent = errMsg(e); } };
}

/* ── audit ── */
const ACT = { publish_menu: "نشر المنيو", seed_menu: "رفع منيو تجريبي", license_update: "تعديل الترخيص", grant_admin: "إضافة أدمن", revoke_admin: "شيل أدمن",
  reset_password: "رابط كلمة مرور", github_config: "إعداد رفع الصور" };
async function paneAudit() {
  const rows = await conn(cur).audit();
  $("#pane").innerHTML = `<div class="card"><h2>آخر العمليات</h2>${rows.length ? `<div class="xt" style="margin-top:8px"><table><thead><tr><th>الوقت</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${dtAr(r.at)}</td><td>${esc(ACT[r.action] || r.action)}</td><td>${esc(r.note || r.target || "")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">مفيش عمليات متسجّلة.</p>`}</div>`;
}

/* ── notes ── */
async function paneNotes() {
  const t = await conn(cur).notes();
  $("#pane").innerHTML = `<fieldset><legend>ملاحظات خاصة بالعميل</legend>
    <textarea class="in" id="nT" style="min-height:200px" placeholder="الاتفاق، المدفوعات، طلبات التعديل…">${esc(t)}</textarea>
    <p class="hint">بتتحفظ في مشروع العميل في مكان المطوّر بس يقدر يقراه (private/devNotes). الأدمن مايقدرش يشوفها.</p>
    <button class="btn primary" id="nSave">حفظ</button></fieldset>`;
  $("#nSave").onclick = async () => { try { await conn(cur).saveNotes($("#nT").value); toast("اتحفظت."); } catch (e) { toast(errMsg(e), true); } };
}

/* ═════════ sheet + confirm ═════════ */
function sheet(title, body, actions) {
  $("#sheetT").textContent = title; const old = $("#sheetBody"), fresh = old.cloneNode(false); fresh.innerHTML = body; old.replaceWith(fresh);
  const acts = actions.filter(Boolean), left = acts.filter(a => a[1] === "danger" && acts.length > 1), right = acts.filter(a => !left.includes(a));
  $("#sheetFoot").innerHTML = left.map((a, i) => `<button class="btn ${a[1]}" data-k="l${i}">${a[0]}</button>`).join("") +
    `<div class="grow"><button class="btn" data-k="cancel">إلغاء</button>${right.map((a, i) => `<button class="btn ${a[1]}" data-k="r${i}">${a[0]}</button>`).join("")}</div>`;
  $("#sheetFoot").onclick = e => { const k = e.target.closest("[data-k]")?.dataset.k; if (!k) return; if (k === "cancel") return closeSheet(); (k[0] === "l" ? left : right)[+k.slice(1)][2](); };
  $("#sheet").classList.add("open"); $("#scrim").classList.add("open"); document.body.style.overflow = "hidden";
}
function closeSheet() { $("#sheet").classList.remove("open"); $("#scrim").classList.remove("open"); document.body.style.overflow = ""; }
function confirmBox(title, text, ok, kind = "danger") {
  return new Promise(res => { sheet(title, `<p>${text}</p>`, [[ok, kind, () => { closeSheet(); res(true); }]]);
    $("#sheetFoot [data-k=cancel]").onclick = e => { e.stopPropagation(); closeSheet(); res(false); }; });
}
$("#scrim").onclick = closeSheet; $("#sheetX").onclick = closeSheet;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

/* ═════════ delegated ═════════ */
document.addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (o) { ctab = "license"; return openClient(o.dataset.open); }
  const f = e.target.closest("[data-filt]"); if (f) { filter = f.dataset.filt; return listView(); }
  const t = e.target.closest("[data-ctab]"); if (t) { ctab = t.dataset.ctab; return renderClient(); }
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "newClient") clientForm(null);
  if (a === "editClient") clientForm(cur.id);
});
addEventListener("hashchange", () => { const m = location.hash.match(/^#client-(.+)$/); if (!m && cur) listView(); });

boot();
})();
