/* storage.js - shared data layer. Every page reads/writes the same localStorage keys,
   so what the Admin Control Panel saves shows up on the other pages. */
const CSD = (function () {
  const P = "csd_v1_";
  const DEPTS = ["Art Department", "CS Department", "Science Department",
                 "Business Management Department", "Commerce Department", "BCA Department"];
  const ICONS = { "Art Department": "🎨", "CS Department": "💻", "Science Department": "🔬",
                  "Business Management Department": "📊", "Commerce Department": "📚", "BCA Department": "🖥️" };
  const SPORTS = ["Cricket", "Football", "Basketball", "Badminton"];
  const VENUES = { Cricket: "Sports Ground", Football: "Main Ground", Basketball: "Basketball Court", Badminton: "Indoor Stadium" };
  const AWARDS = ["Best Player", "Top Scorer", "Best Defender", "Best Team Player", "Rising Star", "Fair Play Award"];
  const PROGRESS = ["Not started", "1st Half", "Half Time", "2nd Half", "Full Time", "Innings 1", "Innings 2", "Game in progress"];

  const now = () => new Date().toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  function defaults() {
    return {
      announcements: [
        { id: 3, text: "Sportsmanship: All participants are expected to follow tournament rules and respect fellow teams.", time: "" },
        { id: 2, text: "Schedule: Official fixtures and venue details will be announced after confirmation.", time: "" },
        { id: 1, text: "Registration: All six departments are invited to participate. Team captains can submit their details on the registration page.", time: "" }
      ],
      registrations: [],
      fixtures: [
        { id: 1, date: "To be announced", sport: "Football", teamA: "CS Department", teamB: "BCA Department", venue: "Main Ground", status: "Upcoming" },
        { id: 2, date: "To be announced", sport: "Cricket", teamA: "Art Department", teamB: "Science Department", venue: "Sports Ground", status: "Upcoming" },
        { id: 3, date: "To be announced", sport: "Basketball", teamA: "Commerce Department", teamB: "Business Management Department", venue: "Basketball Court", status: "Upcoming" }
      ],
      results: [],
      live: {
        sport: "Football", teamA: "CS Department", teamB: "BCA Department", scoreA: 2, scoreB: 1,
        progress: "2nd Half", isLive: true, demo: true, updated: "",
        timeline: [
          { min: "00'", text: "Match started" },
          { min: "18'", text: "CS Department goal (sample)" },
          { min: "32'", text: "BCA Department goal (sample)" },
          { min: "61'", text: "CS Department goal (sample)" }
        ]
      },
      awards: {},
      podium: { first: "", second: "", third: "" },
      inquiries: []
    };
  }

  function get(key) {
    try { const raw = localStorage.getItem(P + key); if (raw !== null) return JSON.parse(raw); } catch (e) { /* fall through */ }
    return defaults()[key];
  }
  function set(key, value) {
    try { localStorage.setItem(P + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function reset() { Object.keys(defaults()).forEach(k => { try { localStorage.removeItem(P + k); } catch (e) {} }); }
  function nextId(list) { return list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1; }

  function setFixtureStatus(sport, a, b, status) {
    const fx = get("fixtures"); let changed = false;
    fx.forEach(f => {
      const same = f.sport === sport && ((f.teamA === a && f.teamB === b) || (f.teamA === b && f.teamB === a));
      if (same && f.status !== "Completed") { f.status = status; changed = true; }
    });
    if (changed) set("fixtures", fx);
  }

  function addResult(r) {
    const list = get("results");
    list.unshift({ id: nextId(list), sport: r.sport, teamA: r.teamA, teamB: r.teamB, scoreA: r.scoreA, scoreB: r.scoreB, time: now() });
    set("results", list);
    setFixtureStatus(r.sport, r.teamA, r.teamB, "Completed");
  }

  function standings() {
    const t = {};
    DEPTS.forEach(d => { t[d] = { dept: d, played: 0, points: 0 }; });
    get("results").forEach(r => {
      if (!t[r.teamA] || !t[r.teamB]) return;
      t[r.teamA].played++; t[r.teamB].played++;
      if (r.scoreA > r.scoreB) t[r.teamA].points += 3;
      else if (r.scoreB > r.scoreA) t[r.teamB].points += 3;
      else { t[r.teamA].points += 1; t[r.teamB].points += 1; }
    });
    return Object.values(t).sort((a, b) => b.points - a.points || a.played - b.played || DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept));
  }

  return { DEPTS, ICONS, SPORTS, VENUES, AWARDS, PROGRESS, now, get, set, reset, nextId, standings, addResult, setFixtureStatus };
})();
if (typeof module !== "undefined") module.exports = CSD;
