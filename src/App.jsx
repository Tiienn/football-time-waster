import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

const CATEGORIES = [
  { id: "gk", label: "Goal Kick Delay", icon: "🧤", color: "#00ff87" },
  { id: "corner", label: "Corner Kick Delay", icon: "🚩", color: "#e17055" },
  { id: "freekick", label: "Set Piece Delay", icon: "⚽", color: "#1e90ff" },
  { id: "throwin", label: "Throw In Delay", icon: "🤾", color: "#fd79a8" },
  { id: "injury", label: "Injury Delay", icon: "🩹", color: "#ff4757" },
  { id: "ref", label: "Referee Delay", icon: "🟨", color: "#fdcb6e" },
  { id: "var", label: "VAR Check", icon: "📺", color: "#a29bfe" },
  { id: "sub", label: "Sub Delay", icon: "🔄", color: "#ffa502" },
  { id: "other", label: "Other Wasting", icon: "⏱️", color: "#b2bec3" },
];

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const loadSaved = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

export default function App() {
  const [events, setEvents] = useState(() => loadSaved("tw_events", []));
  const [timers, setTimers] = useState({});
  const [matchInfo, setMatchInfo] = useState(() => loadSaved("tw_matchInfo", { home: "HOME", away: "AWAY", half: "1st Half" }));
  const [view, setView] = useState("tracker");
  const [matchHistory, setMatchHistory] = useState(() => loadSaved("tw_history", []));
  const [viewingHistoryIdx, setViewingHistoryIdx] = useState(null);
  const [editingMatch, setEditingMatch] = useState(false);
  const [tempMatch, setTempMatch] = useState({ home: "", away: "", half: "1st Half" });
  const [selectedTeam, setSelectedTeam] = useState("home");
  const [matchClock, setMatchClock] = useState(() => loadSaved("tw_matchClock", null));
  const [matchElapsed, setMatchElapsed] = useState(0);
  const intervals = useRef({});
  const matchClockRef = useRef(null);
  const shareCardRef = useRef(null);

  useEffect(() => { localStorage.setItem("tw_events", JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem("tw_matchInfo", JSON.stringify(matchInfo)); }, [matchInfo]);
  useEffect(() => { localStorage.setItem("tw_history", JSON.stringify(matchHistory)); }, [matchHistory]);
  useEffect(() => { if (matchClock) localStorage.setItem("tw_matchClock", JSON.stringify(matchClock)); else localStorage.removeItem("tw_matchClock"); }, [matchClock]);

  useEffect(() => {
    if (!matchClock) return;
    const tick = () => setMatchElapsed(Math.floor((Date.now() - matchClock.startedAt) / 1000) + (matchClock.offset || 0));
    tick();
    matchClockRef.current = setInterval(tick, 1000);
    return () => clearInterval(matchClockRef.current);
  }, [matchClock]);

  const startTimer = (id) => {
    if (timers[id]?.running) return;
    const startTime = Date.now() - ((timers[id]?.elapsed || 0) * 1000);
    intervals.current[id] = setInterval(() => {
      setTimers(prev => ({ ...prev, [id]: { ...prev[id], elapsed: Math.floor((Date.now() - startTime) / 1000), running: true } }));
    }, 1000);
    setTimers(prev => ({ ...prev, [id]: { ...(prev[id] || { elapsed: 0 }), running: true } }));
  };

  const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch {} };

  const cancelTimer = (id) => {
    clearInterval(intervals.current[id]);
    setTimers(prev => ({ ...prev, [id]: { elapsed: 0, running: false } }));
  };

  const toggleTimer = (cat) => {
    if (timers[cat.id]?.running) {
      vibrate([50, 30, 50]);
      const elapsed = timers[cat.id]?.elapsed || 0;
      clearInterval(intervals.current[cat.id]);
      updateEvents(prev => [...prev, { id: Date.now(), catId: cat.id, label: cat.label, icon: cat.icon, color: cat.color, duration: elapsed, wasting: true, team: selectedTeam, teamName: selectedTeam === "home" ? matchInfo.home : matchInfo.away, half: matchInfo.half, matchMinute: matchClock ? matchElapsed : null, time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }]);
      setTimers(prev => ({ ...prev, [cat.id]: { elapsed: 0, running: false } }));
    } else {
      vibrate(30);
      startTimer(cat.id);
    }
  };

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const updateEvents = (fn) => {
    setHistory(prev => [...prev, events]);
    setFuture([]);
    setEvents(fn);
  };
  const undo = () => {
    if (history.length === 0) return;
    setFuture(prev => [events, ...prev]);
    setEvents(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
  };
  const redo = () => {
    if (future.length === 0) return;
    setHistory(prev => [...prev, events]);
    setEvents(future[0]);
    setFuture(prev => prev.slice(1));
  };
  const [editingEventId, setEditingEventId] = useState(null);
  const toggleWasting = (id) => updateEvents(prev => prev.map(e => e.id === id ? { ...e, wasting: !e.wasting } : e));
  const changeCategory = (id, cat) => { updateEvents(prev => prev.map(e => e.id === id ? { ...e, catId: cat.id, label: cat.label, icon: cat.icon, color: cat.color } : e)); setEditingEventId(null); };
  const changeTeam = (id, team) => { updateEvents(prev => prev.map(e => e.id === id ? { ...e, team, teamName: team === "home" ? matchInfo.home : matchInfo.away } : e)); };
  const changeDuration = (id, seconds) => { updateEvents(prev => prev.map(e => e.id === id ? { ...e, duration: Math.max(0, seconds) } : e)); };
  const removeEvent = (id) => updateEvents(prev => prev.filter(e => e.id !== id));

  useEffect(() => {
    const handleKey = (e) => {
      if (editingMatch) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === "Tab") { e.preventDefault(); setSelectedTeam(p => p === "home" ? "away" : "home"); return; }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < CATEGORIES.length) toggleTimer(CATEGORIES[idx]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [timers, editingMatch, history, future]);

  const totalWasted = events.filter(e => e.wasting).reduce((acc, e) => acc + (e.duration || 0), 0);
  const totalOther = events.filter(e => !e.wasting).reduce((acc, e) => acc + (e.duration || 0), 0);
  const incidentCount = events.length;
  const homeWasted = events.filter(e => e.wasting && e.team === "home").reduce((acc, e) => acc + (e.duration || 0), 0);
  const awayWasted = events.filter(e => e.wasting && e.team === "away").reduce((acc, e) => acc + (e.duration || 0), 0);
  const halves = ["1st Half", "2nd Half", "ET"];
  const halfStats = halves.map(h => ({ half: h, wasted: events.filter(e => e.wasting && e.half === h).reduce((a, e) => a + (e.duration || 0), 0), count: events.filter(e => e.wasting && e.half === h).length })).filter(h => h.count > 0);
  const matchMinutes = halfStats.some(h => h.half === "ET") ? 120 : 90;
  const wastedPct = matchMinutes > 0 ? ((totalWasted / (matchMinutes * 60)) * 100).toFixed(1) : "0.0";

  const catSummary = CATEGORIES.map(cat => {
    const catEvents = events.filter(e => e.catId === cat.id && e.wasting);
    return { ...cat, count: catEvents.length, total: catEvents.reduce((a, e) => a + (e.duration || 0), 0) };
  }).filter(c => c.count > 0);

  const catNotWasting = CATEGORIES.map(cat => {
    const catEvents = events.filter(e => e.catId === cat.id && !e.wasting);
    return { ...cat, count: catEvents.length, total: catEvents.reduce((a, e) => a + (e.duration || 0), 0) };
  }).filter(c => c.count > 0);

  const getSummaryText = () => {
    const lines = [
      `⏱️ TIME WASTING TRACKER`,
      `${matchInfo.home} vs ${matchInfo.away} | ${matchInfo.half}`,
      ``,
      `📊 TOTAL: ${incidentCount} incidents | ${formatTime(totalWasted)} wasted (${wastedPct}% of ${matchMinutes}min)${totalOther > 0 ? ` | ${formatTime(totalOther)} other delays` : ""}`,
      `🏠 ${matchInfo.home}: ${formatTime(homeWasted)} | 🏟️ ${matchInfo.away}: ${formatTime(awayWasted)}`,
      ...(halfStats.length > 1 ? [halfStats.map(h => `${h.half}: ${formatTime(h.wasted)}`).join(" | ")] : []),
      ``,
      ...catSummary.map(c => `${c.icon} ${c.label}: ${c.count}x${c.total > 0 ? ` (${formatTime(c.total)})` : ""}`),
      ...(catNotWasting.length > 0 ? [``, `Not wasting:`, ...catNotWasting.map(c => `${c.icon} ${c.label}: ${c.count}x${c.total > 0 ? ` (${formatTime(c.total)})` : ""}`)] : []),
      ``,
      `#FootballStats #TimeWasting #${matchInfo.home.replace(/\s/g,"")}vs${matchInfo.away.replace(/\s/g,"")}`,
    ];
    return lines.join("\n");
  };

  const copied = useRef(false);
  const [justCopied, setJustCopied] = useState(false);
  const copyText = () => {
    navigator.clipboard.writeText(getSummaryText());
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const downloadCSV = () => {
    const header = "Match Minute,Time,Category,Team,Duration (s),Duration,Wasting,Half\n";
    const rows = events.map(e => `${e.matchMinute != null ? formatTime(e.matchMinute) : ""},${e.time},${e.label},${e.teamName || ""},${e.duration || 0},${formatTime(e.duration || 0)},${e.wasting ? "Yes" : "No"},${e.half || ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = `${matchInfo.home}-vs-${matchInfo.away}-events.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const getTweetText = () => {
    const lines = [
      `⏱️ ${matchInfo.home} vs ${matchInfo.away} | ${matchInfo.half}`,
      `${incidentCount} incidents · ${formatTime(totalWasted)} wasted (${wastedPct}% of ${matchMinutes}min)`,
      `🏠 ${matchInfo.home}: ${formatTime(homeWasted)} | ✈️ ${matchInfo.away}: ${formatTime(awayWasted)}`,
      ``,
      `#FootballStats #TimeWasting`,
      `timewasted.live`,
    ];
    return lines.join("\n");
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(getTweetText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const downloadImage = async () => {
    if (!shareCardRef.current) return;
    const canvas = await html2canvas(shareCardRef.current, { backgroundColor: "#0a0a0f", scale: 2 });
    const link = document.createElement("a");
    link.download = `${matchInfo.home}-vs-${matchInfo.away}-time-wasted.png`;
    link.href = canvas.toDataURL();
    link.click();
    // Prompt to share on Twitter after download
    setTimeout(() => {
      const openTwitter = window.confirm("Image downloaded! 🎉\n\nOpen Twitter/X to share it?");
      if (openTwitter) {
        const text = encodeURIComponent(getTweetText());
        window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
      }
    }, 500);
  };

  const runningCat = CATEGORIES.find(c => timers[c.id]?.running);

  const popOut = () => {
    const w = 320;
    const h = 220;
    const left = window.screen.width - w - 30;
    const popup = window.open("", "tw_mini", `width=${w},height=${h},left=${left},top=30,toolbar=no,menubar=no,location=no,status=no`);
    if (!popup) return;
    popup.document.write(`<!DOCTYPE html><html><head><title>⚽ Time Wasted</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#0a0a0f;color:#fff;font-family:sans-serif;padding:12px;overflow:hidden}
      .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
      .big{font-size:32px;letter-spacing:1px}
      .sm{font-size:11px;color:#555}
      .green{color:#00ff87}
      .orange{color:#ffa502}
      .cat{background:#111827;border:1px solid #222;border-radius:8px;padding:6px;text-align:center;cursor:pointer;font-size:11px;color:#ccc}
      .cat:active{transform:scale(0.95)}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px}
    </style></head><body>
      <div class="row"><span class="green" style="font-size:16px;font-weight:700">⚽ TIME WASTED</span><span class="sm" id="clock"></span></div>
      <div class="row"><span class="big green" id="total">00:00</span><span class="big orange" id="count">0</span></div>
      <div class="row"><span class="sm">time wasted</span><span class="sm">incidents</span></div>
      <div class="grid" id="cats"></div>
      <script>
        const fmt=s=>\`\${String(Math.floor(s/60)).padStart(2,"0")}:\${String(s%60).padStart(2,"0")}\`;
        const cats=${JSON.stringify(CATEGORIES.map((c,i)=>({id:c.id,label:c.label,icon:c.icon,key:i+1})))};
        const grid=document.getElementById("cats");
        cats.forEach(c=>{const d=document.createElement("div");d.className="cat";d.textContent=c.icon+" "+c.key;d.title=c.label;d.onclick=()=>window.opener.postMessage({type:"toggle",idx:c.key-1},"*");grid.appendChild(d);});
        setInterval(()=>{try{
          const ev=JSON.parse(localStorage.getItem("tw_events")||"[]");
          const tw=ev.filter(e=>e.wasting).reduce((a,e)=>a+(e.duration||0),0);
          document.getElementById("total").textContent=fmt(tw);
          document.getElementById("count").textContent=ev.length;
          const mc=JSON.parse(localStorage.getItem("tw_matchClock")||"null");
          document.getElementById("clock").textContent=mc?fmt(Math.floor((Date.now()-mc.startedAt)/1000)+(mc.offset||0)):"";
        }catch{}},1000);
      <\/script></body></html>`);
    popup.document.close();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "toggle" && typeof e.data.idx === "number") {
        const idx = e.data.idx;
        if (idx >= 0 && idx < CATEGORIES.length) toggleTimer(CATEGORIES[idx]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [timers]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Bebas Neue', 'Impact', sans-serif", padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-cat { background: #111827; border: 1px solid #222; border-radius: 12px; padding: 14px 10px; cursor: pointer; transition: all 0.15s; text-align: center; color: white; min-height: 100px; }
        .btn-cat:active { transform: scale(0.96); }
        .btn-cat.running { border-width: 2px; animation: pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        .tab { background: transparent; border: none; color: #666; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; padding: 8px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; letter-spacing: 0.5px; }
        .tab.active { color: #00ff87; border-bottom-color: #00ff87; }
        .event-row { display: flex; align-items: center; gap: 8px; background: #111827; border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; }
        .remove-btn { background: none; border: none; color: #444; cursor: pointer; font-size: 16px; margin-left: auto; }
        .remove-btn:hover { color: #ff4757; }
        input[type=text] { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 8px 12px; color: white; font-family: 'DM Sans', sans-serif; font-size: 14px; width: 100%; }
        .share-card { background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); border: 1px solid #30363d; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; }
        .share-card::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 30%, rgba(0,255,135,0.05) 0%, transparent 50%); pointer-events: none; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#050508", borderBottom: "1px solid #1a1a2e", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 22, letterSpacing: 2, color: "#00ff87" }}>⚽ TIME WASTED</div>
            <button onClick={popOut} title="Pop out mini tracker" style={{ background: "none", border: "1px solid #333", borderRadius: 4, color: "#555", fontSize: 12, padding: "2px 6px", cursor: "pointer", lineHeight: 1 }}>↗</button>
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: runningCat ? runningCat.color : "#555", marginTop: 2, animation: runningCat ? "pulse 1s infinite" : "none" }}>
            {runningCat ? `${runningCat.icon} ${runningCat.label} recording...` : "Football Match Tracker"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {matchClock ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setMatchClock(null)}>
                <div style={{ fontSize: 22, color: "#ffa502", letterSpacing: 1 }}>{formatTime(matchElapsed)}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#ff4757" }}>⏸ pause</div>
              </div>
              <button onClick={() => { setMatchClock(null); setMatchElapsed(0); }} style={{ background: "none", border: "1px solid #ff4757", borderRadius: 6, color: "#ff4757", padding: "4px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600 }}>⏹</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setMatchClock({ startedAt: Date.now(), offset: matchElapsed > 0 ? matchElapsed : 0 })} style={{ background: "#00ff87", border: "none", borderRadius: 8, color: "#000", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700 }}>{matchElapsed > 0 ? "▶ Resume" : "⚽ Kick Off"}</button>
              {matchElapsed > 0 && <button onClick={() => setMatchElapsed(0)} style={{ background: "none", border: "1px solid #ff4757", borderRadius: 6, color: "#ff4757", padding: "4px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600 }}>⏹</button>}
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, color: runningCat ? runningCat.color : "#fff", letterSpacing: 1 }}>
              {runningCat ? formatTime(timers[runningCat.id]?.elapsed || 0) : formatTime(totalWasted)}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>
              {runningCat ? `${formatTime(totalWasted)} total` : `${incidentCount} incidents`}
            </div>
          </div>
        </div>
      </div>

      {/* Match bar */}
      <div style={{ background: "#0d1117", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a2e" }}>
        {!editingMatch ? (
          <>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>{matchInfo.home}</span>
              <span style={{ color: "#444" }}>vs</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{matchInfo.away}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[["1st Half", 0], ["2nd Half", 2700], ["ET", 5400]].map(([h, offset]) => (
                <button key={h} onClick={() => { setMatchInfo(p => ({ ...p, half: h })); if (matchClock) setMatchClock({ startedAt: Date.now(), offset }); }} style={{ background: matchInfo.half === h ? "#00ff87" : "transparent", border: "1px solid " + (matchInfo.half === h ? "#00ff87" : "#333"), borderRadius: 6, color: matchInfo.half === h ? "#000" : "#666", fontSize: 11, padding: "4px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{h}</button>
              ))}
              <button onClick={() => { setTempMatch(matchInfo); setEditingMatch(true); }} style={{ background: "none", border: "1px solid #333", borderRadius: 6, color: "#666", fontSize: 11, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginLeft: 4 }}>Edit</button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
            <input type="text" placeholder="Home Team" value={tempMatch.home} onChange={e => setTempMatch(p => ({ ...p, home: e.target.value }))} style={{ flex: 1, minWidth: 80 }} />
            <input type="text" placeholder="Away Team" value={tempMatch.away} onChange={e => setTempMatch(p => ({ ...p, away: e.target.value }))} style={{ flex: 1, minWidth: 80 }} />
            <button onClick={() => { setMatchInfo(tempMatch); setEditingMatch(false); }} style={{ background: "#00ff87", border: "none", borderRadius: 8, color: "#000", padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>Save</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", padding: "0 16px" }}>
        <button className={`tab ${view === "tracker" ? "active" : ""}`} onClick={() => setView("tracker")}>TRACKER</button>
        <button className={`tab ${view === "log" ? "active" : ""}`} onClick={() => setView("log")}>LOG ({incidentCount})</button>
        <button className={`tab ${view === "summary" ? "active" : ""}`} onClick={() => setView("summary")}>SHARE</button>
        <button className={`tab ${view === "history" ? "active" : ""}`} onClick={() => { setView("history"); setViewingHistoryIdx(null); }}>HISTORY</button>
      </div>

      <div style={{ padding: 16 }}>

        {/* TRACKER VIEW */}
        {view === "tracker" && (
          <>
            {/* Team selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setSelectedTeam("home")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "2px solid " + (selectedTeam === "home" ? "#00ff87" : "#222"), background: selectedTeam === "home" ? "rgba(0,255,135,0.1)" : "#111827", color: selectedTeam === "home" ? "#00ff87" : "#666", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{matchInfo.home}</button>
              <button onClick={() => setSelectedTeam("away")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "2px solid " + (selectedTeam === "away" ? "#ff4757" : "#222"), background: selectedTeam === "away" ? "rgba(255,71,87,0.1)" : "#111827", color: selectedTeam === "away" ? "#ff4757" : "#666", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{matchInfo.away}</button>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#555", marginBottom: 12, letterSpacing: 0.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>TAP to start · TAP again to stop & log</span>
              {history.length > 0 && <button onClick={undo} style={{ background: "none", border: "1px solid #333", borderRadius: 4, color: "#888", fontSize: 11, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>↩ Undo</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {CATEGORIES.map((cat, idx) => {
                const t = timers[cat.id] || {};
                const running = t.running;
                return (
                  <div key={cat.id}
                    className={`btn-cat ${running ? "running" : ""}`}
                    style={{ borderColor: running ? cat.color : "#222", position: "relative" }}
                    onClick={() => toggleTimer(cat)}
                  >
                    <div style={{ position: "absolute", top: 6, right: 8, fontSize: 12, color: "#888", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, background: "#1a1a2e", borderRadius: 4, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</div>
                    <div style={{ fontSize: 28 }}>{cat.icon}</div>
                    <div style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: running ? cat.color : "#ccc", marginTop: 4 }}>{cat.label}</div>
                    {running && <div style={{ fontSize: 20, color: cat.color, marginTop: 4 }}>{formatTime(t.elapsed || 0)}</div>}
                    {running && <button onClick={(e) => { e.stopPropagation(); cancelTimer(cat.id); }} style={{ position: "absolute", top: 6, left: 8, background: "rgba(255,71,87,0.2)", border: "1px solid #ff4757", borderRadius: 4, color: "#ff4757", fontSize: 10, padding: "1px 5px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✕</button>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* LOG VIEW */}
        {view === "log" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
              <button onClick={undo} style={{ background: "none", border: "1px solid " + (history.length > 0 ? "#555" : "#222"), borderRadius: 4, color: history.length > 0 ? "#aaa" : "#333", fontSize: 11, padding: "4px 10px", cursor: history.length > 0 ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>↩ Undo</button>
              <button onClick={redo} style={{ background: "none", border: "1px solid " + (future.length > 0 ? "#555" : "#222"), borderRadius: 4, color: future.length > 0 ? "#aaa" : "#333", fontSize: 11, padding: "4px 10px", cursor: future.length > 0 ? "pointer" : "default", fontFamily: "'DM Sans', sans-serif" }}>↪ Redo</button>
            </div>
            {events.length === 0 && <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#444", textAlign: "center", marginTop: 40 }}>No incidents logged yet.</div>}
            {[...events].reverse().map(e => (
              <div key={e.id}>
                <div className="event-row" style={{ opacity: e.wasting ? 1 : 0.5 }}>
                  <span style={{ fontSize: 18, cursor: "pointer" }} onClick={() => setEditingEventId(editingEventId === e.id ? null : e.id)}>{e.icon}</span>
                  <div style={{ cursor: "pointer" }} onClick={() => setEditingEventId(editingEventId === e.id ? null : e.id)}>
                    <div style={{ fontWeight: 600, color: e.color, fontSize: 13 }}>{e.label}</div>
                    <div style={{ color: "#555", fontSize: 11 }}>{e.teamName}{e.matchMinute != null ? ` · ${formatTime(e.matchMinute)}` : ` · ${e.time}`}{e.duration ? ` · ${formatTime(e.duration)}` : ""}</div>
                  </div>
                  <button onClick={() => toggleWasting(e.id)} style={{ background: e.wasting ? "rgba(255,71,87,0.1)" : "rgba(0,255,135,0.1)", border: "1px solid " + (e.wasting ? "#ff4757" : "#00ff87"), borderRadius: 4, color: e.wasting ? "#ff4757" : "#00ff87", cursor: "pointer", fontSize: 11, padding: "2px 6px", fontFamily: "'DM Sans', sans-serif", marginLeft: "auto", whiteSpace: "nowrap" }}>{e.wasting ? "⏱ Wasting" : "✓ Not wasting"}</button>
                  <button className="remove-btn" onClick={() => removeEvent(e.id)}>✕</button>
                </div>
                {editingEventId === e.id && (
                  <div style={{ padding: "6px 12px 10px", background: "#0d1117", borderRadius: "0 0 8px 8px", marginTop: -6, marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <button onClick={() => changeTeam(e.id, "home")} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (e.team === "home" ? "#00ff87" : "#333"), background: e.team === "home" ? "rgba(0,255,135,0.1)" : "#1a1a2e", color: e.team === "home" ? "#00ff87" : "#666", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>{matchInfo.home}</button>
                      <button onClick={() => changeTeam(e.id, "away")} style={{ flex: 1, padding: "5px", borderRadius: 4, border: "1px solid " + (e.team === "away" ? "#ff4757" : "#333"), background: e.team === "away" ? "rgba(255,71,87,0.1)" : "#1a1a2e", color: e.team === "away" ? "#ff4757" : "#666", fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>{matchInfo.away}</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555" }}>Duration:</span>
                      <button onClick={() => changeDuration(e.id, (e.duration || 0) - 5)} style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 4, color: "#aaa", fontSize: 12, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>-5s</button>
                      <button onClick={() => changeDuration(e.id, (e.duration || 0) - 1)} style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 4, color: "#aaa", fontSize: 12, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>-1s</button>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#fff", fontWeight: 700, minWidth: 50, textAlign: "center" }}>{formatTime(e.duration || 0)}</span>
                      <button onClick={() => changeDuration(e.id, (e.duration || 0) + 1)} style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 4, color: "#aaa", fontSize: 12, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+1s</button>
                      <button onClick={() => changeDuration(e.id, (e.duration || 0) + 5)} style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 4, color: "#aaa", fontSize: 12, padding: "2px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+5s</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => changeCategory(e.id, cat)} style={{ background: e.catId === cat.id ? cat.color : "#1a1a2e", border: "1px solid " + (e.catId === cat.id ? cat.color : "#333"), borderRadius: 4, color: e.catId === cat.id ? "#000" : "#aaa", fontSize: 11, padding: "3px 8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{cat.icon} {cat.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* SUMMARY / SHARE VIEW */}
        {view === "summary" && (
          <>
            {/* Graphic card */}
            <div ref={shareCardRef} className="share-card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#555", fontFamily: "'DM Sans', sans-serif", marginBottom: 12, letterSpacing: 1 }}>MATCH REPORT</div>
              <div style={{ fontSize: 26, letterSpacing: 2, marginBottom: 4 }}>
                {matchInfo.home} <span style={{ color: "#333" }}>vs</span> {matchInfo.away}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#555", fontSize: 13, marginBottom: 20 }}>{matchInfo.half}</div>

              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, color: "#00ff87" }}>{formatTime(totalWasted)}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>TIME WASTED ({wastedPct}% of {matchMinutes}min)</div>
                </div>
                <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, color: "#ffa502" }}>{incidentCount}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>INCIDENTS</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, color: "#00ff87" }}>{formatTime(homeWasted)}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>{matchInfo.home}</div>
                </div>
                <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, color: "#ff4757" }}>{formatTime(awayWasted)}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>{matchInfo.away}</div>
                </div>
              </div>
              {halfStats.length > 1 && (
                <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                  {halfStats.map(h => (
                    <div key={h.half} style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, color: "#ccc" }}>{formatTime(h.wasted)}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 2 }}>{h.half}</div>
                    </div>
                  ))}
                </div>
              )}
              {totalOther > 0 && (
                <div style={{ background: "#0a0a0f", borderRadius: 12, padding: "12px 16px", marginBottom: 24, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
                  <span style={{ fontSize: 13, color: "#888" }}>Other delays (not wasting): </span>
                  <span style={{ fontSize: 13, color: "#aaa", fontWeight: 700 }}>{formatTime(totalOther)}</span>
                </div>
              )}

              {catSummary.length === 0 && <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#444", textAlign: "center" }}>No data yet</div>}
              {catSummary.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
                  <span style={{ fontSize: 18 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "#ccc" }}>{c.label}</span>
                      <span style={{ fontSize: 13, color: c.color, fontWeight: 700 }}>{c.count}x {c.total > 0 ? `· ${formatTime(c.total)}` : ""}</span>
                    </div>
                    <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2 }}>
                      <div style={{ height: "100%", borderRadius: 2, background: c.color, width: `${Math.min(100, (c.count / Math.max(...catSummary.map(x => x.count))) * 100)}%`, transition: "width 0.5s" }} />
                    </div>
                  </div>
                </div>
              ))}

              {catNotWasting.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a2e" }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#555", marginBottom: 10, letterSpacing: 0.5 }}>NOT WASTING</div>
                  {catNotWasting.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                      <span style={{ fontSize: 13, color: "#888" }}>{c.label}</span>
                      <span style={{ fontSize: 13, color: "#666", marginLeft: "auto" }}>{c.count}x {c.total > 0 ? `· ${formatTime(c.total)}` : ""}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a2e", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#444", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>⏱️ TIME WASTED TRACKER</span>
                <span style={{ color: "#333" }}>⚽ timewasted.live</span>
              </div>
            </div>

            {/* Text for social */}
            <div style={{ background: "#111827", borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: 1 }}>TEXT FOR SOCIAL MEDIA</div>
              <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#ccc", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{getSummaryText()}</pre>
            </div>

            <button onClick={shareOnTwitter} style={{ width: "100%", background: "#000", border: "1px solid #333", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 2, transition: "all 0.2s", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.628 5.905-5.628zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              POST TO X / TWITTER
            </button>

            <button onClick={downloadImage} style={{ width: "100%", background: "#1a1a2e", border: "1px solid #333", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 2, transition: "all 0.2s", marginBottom: 8 }}>
              📸 DOWNLOAD IMAGE
            </button>

            <button onClick={copyText} style={{ width: "100%", background: justCopied ? "#00ff87" : "#1a1a2e", border: "1px solid " + (justCopied ? "#00ff87" : "#333"), borderRadius: 10, padding: "14px", color: justCopied ? "#000" : "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 2, transition: "all 0.2s" }}>
              {justCopied ? "✓ COPIED!" : "📋 COPY TEXT"}
            </button>

            <button onClick={downloadCSV} style={{ width: "100%", background: "#1a1a2e", border: "1px solid #333", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: 2, transition: "all 0.2s", marginTop: 8 }}>
              📊 EXPORT CSV
            </button>

            <button onClick={() => { if (events.length > 0 && !confirm("Reset all data and start a new match?")) return; if (events.length > 0) setMatchHistory(prev => [{ matchInfo, events, date: new Date().toISOString() }, ...prev]); setEvents([]); setTimers({}); setHistory([]); setFuture([]); setMatchClock(null); setMatchElapsed(0); setMatchInfo({ home: "HOME", away: "AWAY", half: "1st Half" }); setView("tracker"); }} style={{ width: "100%", background: "transparent", border: "1px solid #ff4757", borderRadius: 10, padding: "12px", color: "#ff4757", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginTop: 10 }}>
              🗑 Reset & New Match
            </button>
          </>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <>
            {viewingHistoryIdx === null ? (
              <>
                {matchHistory.length === 0 && <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#444", textAlign: "center", marginTop: 40 }}>No past matches yet. Matches are saved when you reset.</div>}
                {matchHistory.map((m, i) => {
                  const mWasted = m.events.filter(e => e.wasting).reduce((a, e) => a + (e.duration || 0), 0);
                  const mCount = m.events.length;
                  return (
                    <div key={i} className="event-row" style={{ cursor: "pointer" }} onClick={() => setViewingHistoryIdx(i)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#ccc", fontSize: 14 }}>{m.matchInfo.home} vs {m.matchInfo.away}</div>
                        <div style={{ color: "#555", fontSize: 11 }}>{new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {mCount} incidents · {formatTime(mWasted)} wasted</div>
                      </div>
                      <span style={{ color: "#444", fontSize: 16 }}>›</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <button onClick={() => setViewingHistoryIdx(null)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, padding: "4px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>← Back</button>
                {(() => {
                  const m = matchHistory[viewingHistoryIdx];
                  const mEvents = m.events;
                  const mWasted = mEvents.filter(e => e.wasting).reduce((a, e) => a + (e.duration || 0), 0);
                  const mHome = mEvents.filter(e => e.wasting && e.team === "home").reduce((a, e) => a + (e.duration || 0), 0);
                  const mAway = mEvents.filter(e => e.wasting && e.team === "away").reduce((a, e) => a + (e.duration || 0), 0);
                  const mCats = CATEGORIES.map(cat => {
                    const ce = mEvents.filter(e => e.catId === cat.id && e.wasting);
                    return { ...cat, count: ce.length, total: ce.reduce((a, e) => a + (e.duration || 0), 0) };
                  }).filter(c => c.count > 0);
                  return (
                    <div className="share-card">
                      <div style={{ fontSize: 13, color: "#555", fontFamily: "'DM Sans', sans-serif", marginBottom: 12, letterSpacing: 1 }}>PAST MATCH</div>
                      <div style={{ fontSize: 24, letterSpacing: 2, marginBottom: 4 }}>{m.matchInfo.home} <span style={{ color: "#333" }}>vs</span> {m.matchInfo.away}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#555", fontSize: 12, marginBottom: 16 }}>{new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 30, color: "#00ff87" }}>{formatTime(mWasted)}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>WASTED</div>
                        </div>
                        <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 30, color: "#ffa502" }}>{mEvents.length}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 4 }}>INCIDENTS</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, color: "#00ff87" }}>{formatTime(mHome)}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 2 }}>{m.matchInfo.home}</div>
                        </div>
                        <div style={{ flex: 1, background: "#0a0a0f", borderRadius: 12, padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, color: "#ff4757" }}>{formatTime(mAway)}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#555", marginTop: 2 }}>{m.matchInfo.away}</div>
                        </div>
                      </div>
                      {mCats.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ fontSize: 16 }}>{c.icon}</span>
                          <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>{c.label}</span>
                          <span style={{ fontSize: 13, color: c.color, fontWeight: 700 }}>{c.count}x {c.total > 0 ? `· ${formatTime(c.total)}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <button onClick={() => { if (!confirm("Delete this match from history?")) return; setMatchHistory(prev => prev.filter((_, i) => i !== viewingHistoryIdx)); setViewingHistoryIdx(null); }} style={{ width: "100%", background: "transparent", border: "1px solid #ff4757", borderRadius: 10, padding: "12px", color: "#ff4757", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginTop: 12 }}>
                  🗑 Delete Match
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
