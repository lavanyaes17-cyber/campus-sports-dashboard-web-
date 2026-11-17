/* app.js - page logic. Each page sets <body data-page="..."> and the matching function runs. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const opts = (arr, sel) => arr.map(a => `<option${a === sel ? " selected" : ""}>${esc(a)}</option>`).join("");
  const pad = n => String(n).padStart(2, "0");
  const num = v => { const n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; };

  function toast(msg, bad) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ""; }, 3200);
  }

  /* ---------- shared renderers ---------- */
  function renderLive(box) {
    if (!box) return;
    const L = CSD.get("live");
    const badge = L.isLive ? '<span class="badge live">● LIVE</span>' : '<span class="badge done">Full time</span>';
    const sample = L.demo ? '<p class="note-small">Demonstration scoreboard (sample data). Post a real score from the Admin Control Panel.</p>' : "";
    box.innerHTML = `
      <div class="scoreboard">
        <div class="sb-top">${badge}<span>${esc(L.sport)} · ${esc(L.progress)}</span></div>
        <div class="sb-row">
          <div class="sb-team"><span class="dot a"></span><strong>${esc(L.teamA)}</strong></div>
          <div class="sb-score"><span>${num(L.scoreA)}</span><em>–</em><span>${num(L.scoreB)}</span></div>
          <div class="sb-team right"><strong>${esc(L.teamB)}</strong><span class="dot b"></span></div>
        </div>
        ${L.updated ? `<p class="note-small">Last updated: ${esc(L.updated)}</p>` : ""}
        ${sample}
      </div>`;
  }
  function renderTimeline(box) {
    if (!box) return;
    const L = CSD.get("live");
    box.innerHTML = L.timeline.length
      ? L.timeline.map(e => `<li><b>${esc(e.min)}</b><span>${esc(e.text)}</span></li>`).join("")
      : '<li class="empty">No events yet.</li>';
  }
  function matchResultRows(list) {
    return list.map(r => `<tr><td>${esc(r.sport)}</td><td>${esc(r.teamA)} <b>${num(r.scoreA)} – ${num(r.scoreB)}</b> ${esc(r.teamB)}</td><td>${esc(r.time)}</td></tr>`).join("");
  }

  /* ---------- HOME ---------- */
  function home() {
    const regs = CSD.get("registrations");
    $("#mTeams").textContent = pad(CSD.DEPTS.length);
    $("#mSports").textContent = pad(CSD.SPORTS.length);
    $("#mRegs").textContent = pad(regs.length);
    const ann = CSD.get("announcements");
    $("#announcementList").innerHTML = ann.length
      ? ann.map(a => `<article class="note"><p>${esc(a.text)}</p>${a.time ? `<time>${esc(a.time)}</time>` : ""}</article>`).join("")
      : '<p class="empty">No announcements yet.</p>';
    renderLive($("#liveCard"));
    const res = CSD.get("results").slice(0, 3);
    $("#latestResults").innerHTML = res.length
      ? `<table><thead><tr><th>Sport</th><th>Match</th><th>When</th></tr></thead><tbody>${matchResultRows(res)}</tbody></table>`
      : '<p class="empty">No match results yet.</p>';
    const p = CSD.get("podium");
    $("#champion").innerHTML = p.first ? `🏆 Champion: <strong>${esc(p.first)}</strong>` : "";
    $("#deptList").innerHTML = CSD.DEPTS.map(d => `<li>${CSD.ICONS[d]} ${esc(d)}</li>`).join("");
  }

  /* ---------- SCHEDULE ---------- */
  function schedule() {
    const fx = CSD.get("fixtures");
    $("#fixtureBody").innerHTML = fx.length ? fx.map(f =>
      `<tr><td>${esc(f.date)}</td><td>${esc(f.sport)} · ${esc(f.teamA)} vs ${esc(f.teamB)}</td><td>${esc(f.venue)}</td><td><span class="badge ${esc(f.status.toLowerCase())}">${esc(f.status)}</span></td></tr>`).join("")
      : '<tr><td colspan="4" class="empty">No fixtures yet.</td></tr>';
    $("#standingsBody").innerHTML = CSD.standings().map(s => `<tr><td>${CSD.ICONS[s.dept]} ${esc(s.dept)}</td><td>${s.played}</td><td><b>${s.points}</b></td></tr>`).join("");
    $("#matchResultsBody").innerHTML = CSD.get("results").length
      ? matchResultRows(CSD.get("results")) : '<tr><td colspan="3" class="empty">No completed matches yet.</td></tr>';
  }

  /* ---------- REGISTER ---------- */
  function register() {
    $("#dept").innerHTML = opts(CSD.DEPTS);
    $("#sport").innerHTML = opts(CSD.SPORTS);
    const draw = () => {
      const r = CSD.get("registrations");
      $("#regBody").innerHTML = r.length ? r.map(x =>
        `<tr><td>${esc(x.dept)}</td><td>${esc(x.sport)}</td><td>${esc(x.branch)}</td><td>${esc(x.captain)}</td><td><span class="badge ${x.status === "Approved" ? "completed" : x.status === "Rejected" ? "rejected" : "upcoming"}">${esc(x.status)}</span></td></tr>`).join("")
        : '<tr><td colspan="5" class="empty">No teams registered yet. Be the first!</td></tr>';
    };
    draw();
    $("#regForm").addEventListener("submit", e => {
      e.preventDefault();
      const v = id => $("#" + id).value.trim();
      const dept = v("dept"), sport = v("sport"), branch = v("branch"), captain = v("captain"), email = v("email");
      const msg = $("#regMsg");
      const fail = t => { msg.textContent = t; msg.className = "form-msg bad"; };
      if (!branch || !captain) return fail("Please fill in the branch and the captain's full name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
      const list = CSD.get("registrations");
      if (list.some(r => r.dept === dept && r.sport === sport)) return fail(dept + " is already registered for " + sport + ".");
      list.push({ id: CSD.nextId(list), dept, sport, branch, captain, email, status: "Pending review", time: CSD.now() });
      CSD.set("registrations", list);
      $("#regForm").reset(); draw();
      msg.textContent = "Registration submitted. The coordinators will review it in the Admin Control Panel."; msg.className = "form-msg ok";
    });
  }

  /* ---------- LIVE ---------- */
  function live() {
    const draw = () => { renderLive($("#liveCard")); renderTimeline($("#timeline")); };
    draw();
    window.addEventListener("storage", draw);     // updates instantly when admin changes data in another tab
    setInterval(draw, 4000);
  }

  /* ---------- RESULTS ---------- */
  function results() {
    const aw = CSD.get("awards"), pod = CSD.get("podium");
    $("#awardGrid").innerHTML = CSD.AWARDS.map(a =>
      `<div class="card"><h3>${esc(a)}</h3><p>${aw[a] ? "Winner: <strong>" + esc(aw[a]) + "</strong>" : "Winner: To be announced"}</p></div>`).join("");
    $("#prizeBody").innerHTML = [["🥇 First Place", "Champion trophy + prize", pod.first], ["🥈 Second Place", "Runner-up trophy + prize", pod.second], ["🥉 Third Place", "Third-place award", pod.third]]
      .map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2] ? "<strong>" + esc(r[2]) + "</strong>" : "—"}</td></tr>`).join("");
    const any = pod.first || pod.second || pod.third;
    $("#finalResults").innerHTML = any
      ? `<ol class="podium">${pod.first ? `<li>🥇 ${esc(pod.first)}</li>` : ""}${pod.second ? `<li>🥈 ${esc(pod.second)}</li>` : ""}${pod.third ? `<li>🥉 ${esc(pod.third)}</li>` : ""}</ol>`
      : '<p class="empty">No official results published yet.</p>';
    const list = CSD.get("results");
    $("#matchBody").innerHTML = list.length ? matchResultRows(list) : '<tr><td colspan="3" class="empty">No match results yet.</td></tr>';
  }

  /* ---------- ADMIN ---------- */
  function admin() {
    const teamOpts = sel => opts(CSD.DEPTS, sel);
    ["lvA", "lvB", "rsA", "rsB", "fxA", "fxB"].forEach((id, i) => { $("#" + id).innerHTML = teamOpts(CSD.DEPTS[i % 2 === 0 ? 1 : 5]); });
    ["lvSport", "rsSport", "fxSport"].forEach(id => { $("#" + id).innerHTML = opts(CSD.SPORTS); });
    $("#lvProgress").innerHTML = opts(CSD.PROGRESS);
    ["pdFirst", "pdSecond", "pdThird"].forEach(id => { $("#" + id).innerHTML = '<option value="">— not decided —</option>' + opts(CSD.DEPTS); });
    $("#awardInputs").innerHTML = CSD.AWARDS.map((a, i) => `<label>${esc(a)}<input type="text" id="aw${i}" maxlength="60" placeholder="Player / team name"></label>`).join("");

    function fillLive() {
      const L = CSD.get("live");
      $("#lvSport").value = L.sport; $("#lvA").value = L.teamA; $("#lvB").value = L.teamB;
      $("#lvScoreA").value = num(L.scoreA); $("#lvScoreB").value = num(L.scoreB);
      $("#lvProgress").value = L.progress; $("#lvIsLive").checked = !!L.isLive;
    }
    function fillAwards() {
      const aw = CSD.get("awards"), pod = CSD.get("podium");
      CSD.AWARDS.forEach((a, i) => { $("#aw" + i).value = aw[a] || ""; });
      $("#pdFirst").value = pod.first; $("#pdSecond").value = pod.second; $("#pdThird").value = pod.third;
    }
    function drawLists() {
      const ann = CSD.get("announcements");
      $("#annList").innerHTML = ann.length ? ann.map(a => `<li><span>${esc(a.text)}</span><button type="button" class="btn small danger" data-del-ann="${a.id}">Delete</button></li>`).join("") : '<li class="empty">No announcements posted.</li>';
      const fx = CSD.get("fixtures");
      $("#fxList").innerHTML = fx.length ? fx.map(f => `<li><span>${esc(f.sport)} · ${esc(f.teamA)} vs ${esc(f.teamB)} <small>(${esc(f.date)} · ${esc(f.status)})</small></span><button type="button" class="btn small danger" data-del-fx="${f.id}">Delete</button></li>`).join("") : '<li class="empty">No fixtures.</li>';
      const regs = CSD.get("registrations");
      $("#regReview").innerHTML = regs.length ? regs.map(r => `<tr><td>${esc(r.dept)}</td><td>${esc(r.sport)}</td><td>${esc(r.captain)}<br><small>${esc(r.email)}</small></td><td>${esc(r.status)}</td><td class="actions"><button type="button" class="btn small" data-reg="${r.id}" data-st="Approved">Approve</button> <button type="button" class="btn small danger" data-reg="${r.id}" data-st="Rejected">Reject</button></td></tr>`).join("") : '<tr><td colspan="5" class="empty">No registrations yet.</td></tr>';
      const res = CSD.get("results");
      $("#resList").innerHTML = res.length ? res.map(r => `<li><span>${esc(r.sport)} · ${esc(r.teamA)} <b>${num(r.scoreA)}–${num(r.scoreB)}</b> ${esc(r.teamB)}</span><button type="button" class="btn small danger" data-del-res="${r.id}">Delete</button></li>`).join("") : '<li class="empty">No results recorded.</li>';
      const inq = CSD.get("inquiries");
      $("#inqList").innerHTML = inq.length ? inq.map(q => `<li><span><b>${esc(q.name)}</b> (${esc(q.email)}): ${esc(q.message)}</span></li>`).join("") : '<li class="empty">No inquiries yet.</li>';
    }
    fillLive(); fillAwards(); drawLists();

    $("#annForm").addEventListener("submit", e => {
      e.preventDefault();
      const text = $("#annText").value.trim();
      if (!text) return toast("Write an announcement first.", true);
      const list = CSD.get("announcements");
      list.unshift({ id: CSD.nextId(list), text, time: CSD.now() });
      CSD.set("announcements", list); $("#annText").value = ""; drawLists();
      toast("Published. It now appears on the Home page.");
    });

    $("#liveForm").addEventListener("submit", e => {
      e.preventDefault();
      const a = $("#lvA").value, b = $("#lvB").value;
      if (a === b) return toast("Choose two different departments.", true);
      const old = CSD.get("live");
      const same = old.sport === $("#lvSport").value && old.teamA === a && old.teamB === b;
      const L = { sport: $("#lvSport").value, teamA: a, teamB: b, scoreA: num($("#lvScoreA").value), scoreB: num($("#lvScoreB").value),
                  progress: $("#lvProgress").value, isLive: $("#lvIsLive").checked, demo: false, updated: CSD.now(),
                  timeline: same && !old.demo ? old.timeline : [{ min: "00'", text: "Match started" }] };
      CSD.set("live", L);
      if (L.isLive) CSD.setFixtureStatus(L.sport, a, b, "Live");
      toast("Live score updated. Open the Live Match Center or Home page to see it.");
    });

    $("#evForm").addEventListener("submit", e => {
      e.preventDefault();
      const min = $("#evMin").value.trim(), text = $("#evText").value.trim();
      if (!text) return toast("Describe the event.", true);
      const L = CSD.get("live");
      if (L.demo) return toast("Save a live score first, then add events.", true);
      L.timeline.push({ min: (min ? min.replace(/'$/, "") : "--") + "'", text }); L.updated = CSD.now();
      CSD.set("live", L); $("#evMin").value = ""; $("#evText").value = "";
      toast("Event added to the match timeline.");
    });

    $("#finalBtn").addEventListener("click", () => {
      const L = CSD.get("live");
      if (L.demo) return toast("Save a live score first, then finish the match.", true);
      CSD.addResult(L);
      L.isLive = false; L.progress = "Full Time"; L.updated = CSD.now();
      L.timeline.push({ min: "FT", text: `Full time: ${L.teamA} ${L.scoreA} – ${L.scoreB} ${L.teamB}` });
      CSD.set("live", L); fillLive(); drawLists();
      toast("Saved as a final result. Standings and Results pages are updated.");
    });

    $("#resForm").addEventListener("submit", e => {
      e.preventDefault();
      const a = $("#rsA").value, b = $("#rsB").value;
      if (a === b) return toast("Choose two different departments.", true);
      CSD.addResult({ sport: $("#rsSport").value, teamA: a, teamB: b, scoreA: num($("#rsScoreA").value), scoreB: num($("#rsScoreB").value) });
      drawLists(); toast("Result recorded. Standings and Results pages are updated.");
    });

    $("#fxForm").addEventListener("submit", e => {
      e.preventDefault();
      const a = $("#fxA").value, b = $("#fxB").value;
      if (a === b) return toast("Choose two different departments.", true);
      const list = CSD.get("fixtures"), sport = $("#fxSport").value;
      list.push({ id: CSD.nextId(list), date: $("#fxDate").value.trim() || "To be announced", sport, teamA: a, teamB: b, venue: CSD.VENUES[sport], status: "Upcoming" });
      CSD.set("fixtures", list); $("#fxDate").value = ""; drawLists();
      toast("Fixture added to the Schedule page.");
    });

    $("#awardForm").addEventListener("submit", e => {
      e.preventDefault();
      const aw = {}; CSD.AWARDS.forEach((n, i) => { const v = $("#aw" + i).value.trim(); if (v) aw[n] = v; });
      const pods = [$("#pdFirst").value, $("#pdSecond").value, $("#pdThird").value].filter(Boolean);
      if (new Set(pods).size !== pods.length) return toast("Each position needs a different department.", true);
      CSD.set("awards", aw);
      CSD.set("podium", { first: $("#pdFirst").value, second: $("#pdSecond").value, third: $("#pdThird").value });
      toast("Awards and final results published on the Results page.");
    });

    $("#inqForm").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#inqName").value.trim(), email = $("#inqEmail").value.trim(), message = $("#inqMsg").value.trim();
      if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Enter your name, a valid email and a message.", true);
      const list = CSD.get("inquiries"); list.unshift({ id: CSD.nextId(list), name, email, message, time: CSD.now() });
      CSD.set("inquiries", list); $("#inqForm").reset(); drawLists(); toast("Inquiry saved.");
    });

    $("#resetBtn").addEventListener("click", () => {
      if (confirm("Reset all demo data (announcements, scores, results, registrations)?")) { CSD.reset(); location.reload(); }
    });

    document.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      const del = (key, attr) => { CSD.set(key, CSD.get(key).filter(x => String(x.id) !== t.getAttribute(attr))); drawLists(); };
      if (t.hasAttribute("data-del-ann")) del("announcements", "data-del-ann");
      else if (t.hasAttribute("data-del-fx")) del("fixtures", "data-del-fx");
      else if (t.hasAttribute("data-del-res")) del("results", "data-del-res");
      else if (t.hasAttribute("data-reg")) {
        const list = CSD.get("registrations"); const r = list.find(x => String(x.id) === t.getAttribute("data-reg"));
        if (r) { r.status = t.getAttribute("data-st"); CSD.set("registrations", list); drawLists(); }
      }
    });
  }

  const pages = { home, schedule, register, live, results, admin };
  document.addEventListener("DOMContentLoaded", () => { const fn = pages[document.body.dataset.page]; if (fn) fn(); });
})();
