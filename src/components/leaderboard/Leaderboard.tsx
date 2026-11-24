import { useEffect, useState } from 'react';
import { ENV_BY_ID } from '../../data/environments';
import type { EnvId } from '../../data/types';
import { fetchBoard, resetBoard, clearLocalBoard, removeEntry, rememberBoard, type LbEntry } from '../../systems/leaderboard';
import { adminToken, logoutAdmin, useIsAdmin } from '../../systems/auth';
import { useApp } from '../../store/appStore';
import { ScreenHeader } from '../ScreenHeader';
import { Icon } from '../Icon';
import { click, go } from '../../actions';

const MEDAL = ['#ffc93c', '#c9d1d9', '#e0a26b'];

export function LeaderboardTable({ entries, highlight, onRemove }: { entries: LbEntry[]; highlight?: string; onRemove?: (e: LbEntry) => void }) {
  if (!entries.length) return <p className="muted" style={{ margin: 0 }}>No scores yet — be the first on the board!</p>;
  const hl = highlight?.toLocaleLowerCase();
  return (
    <ol className="lb-list">
      {entries.map((e) => (
        <li key={e.rank + e.name} className={`lb-row ${hl && e.name.toLocaleLowerCase() === hl ? 'me' : ''} ${onRemove ? 'admin' : ''}`}>
          <span className="lb-rank" style={{ background: MEDAL[e.rank - 1] ?? 'var(--cream)' }}>{e.rank}</span>
          <span className="lb-name">{e.name}</span>
          <span className="lb-meta">{e.distance.toLocaleString()} m · {ENV_BY_ID[e.env as EnvId]?.name ?? e.env}</span>
          <span className="lb-score">{e.score.toLocaleString()}</span>
          {onRemove && (
            <button className="icon-btn lb-del" style={{ width: 36, height: 36 }} aria-label={`Remove ${e.name}`} title={`Remove ${e.name}`} onClick={() => onRemove(e)}>
              <Icon name="trash" size={16} color="#e63946" />
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

export function BoardStatus({ online }: { online: boolean }) {
  return online ? (
    <span className="tag" style={{ background: '#e3f7e9' }}>● Shared leaderboard</span>
  ) : (
    <span className="tag" title="The leaderboard server isn't reachable, so scores are kept on this device.">○ This device only</span>
  );
}

export function Leaderboard() {
  const isAdmin = useIsAdmin();
  const playerName = useApp((s) => s.settings.playerName);
  const [entries, setEntries] = useState<LbEntry[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<LbEntry | null>(null);

  const refresh = async () => {
    setLoading(true);
    const b = await fetchBoard();
    setEntries(b.entries);
    setOnline(b.online);
    setLoading(false);
    if (b.online) rememberBoard(useApp.getState().settings.playerName, b.entries);
  };
  useEffect(() => {
    void refresh();
  }, []);

  const doReset = async () => {
    click();
    setConfirmReset(false);
    if (!online) {
      clearLocalBoard();
      setMsg('This device’s board was cleared.');
      return void refresh();
    }
    const r = await resetBoard(adminToken() ?? '');
    if (!r.ok && /unauthori/i.test(r.error ?? '')) logoutAdmin(); // password changed on the server
    setMsg(r.ok ? 'Leaderboard cleared for a new group.' : r.error ?? 'Reset failed.');
    if (r.ok) void refresh();
  };

  const doRemove = async (e: LbEntry) => {
    click();
    setConfirmRemove(null);
    const r = await removeEntry(e.name, adminToken() ?? '');
    if (!r.ok) {
      if (/unauthori/i.test(r.error ?? '')) logoutAdmin();
      setMsg(r.error ?? 'Could not remove entry.');
      return;
    }
    setEntries(r.entries);
    setOnline(r.online);
    setMsg(`Removed ${e.name}.`);
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="Leaderboard"
        sub="Top 10 participants — each name keeps its best run."
        right={<button className="btn small" onClick={() => { click(); void refresh(); }}><Icon name="restart" size={16} color="#14213d" /> Refresh</button>}
      />
      <div className="screen-body ui-scroll">
        <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Top 10</h3>
            {isAdmin && <span className="admin-badge">Admin</span>}
            <div className="spacer" />
            {!loading && <BoardStatus online={online} />}
          </div>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <LeaderboardTable entries={entries} highlight={playerName || undefined} onRemove={isAdmin ? (e) => setConfirmRemove(e) : undefined} />
          )}
          {confirmRemove && (
            <div className="note row" style={{ marginTop: 12 }}>
              <span>Remove <b>{confirmRemove.name}</b> ({confirmRemove.score.toLocaleString()}) from the board?</span>
              <div className="spacer" />
              <button className="btn coral small" onClick={() => void doRemove(confirmRemove)}>Remove</button>
              <button className="btn small" onClick={() => setConfirmRemove(null)}>Cancel</button>
            </div>
          )}
          {!loading && !online && (
            <div className="note" style={{ marginTop: 12 }}>
              The shared leaderboard server isn’t reachable, so this list only includes runs saved on this device. Facilitators: run
              <code> npm run workshop</code> and have participants open the address it prints.
            </div>
          )}
          {msg && <p className="muted" style={{ marginBottom: 0 }}>{msg}</p>}
        </div>

        <div className="card" style={{ maxWidth: 720, margin: '16px auto 0' }}>
          {isAdmin ? (
            <>
              <h3 style={{ marginBottom: 8 }}>Admin tools</h3>
              <p className="muted" style={{ margin: '0 0 10px', fontSize: 14 }}>
                Remove a single entry with its bin button, or clear the whole board before the next group.
              </p>
              {confirmReset ? (
                <div className="row">
                  <b>Delete every score on the {online ? 'shared' : 'device'} board? This can’t be undone.</b>
                  <button className="btn coral small" onClick={() => void doReset()}>Yes, clear it</button>
                  <button className="btn small" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
              ) : (
                <div className="row">
                  <button className="btn coral small" onClick={() => setConfirmReset(true)}>
                    <Icon name="trash" size={16} color="#fff" /> {online ? 'Reset shared board' : 'Clear this device’s board'}
                  </button>
                  <button className="btn small" onClick={() => { click(); logoutAdmin(); setMsg('Logged out.'); }}>Log out</button>
                </div>
              )}
            </>
          ) : (
            <div className="row">
              <span className="muted" style={{ fontSize: 14 }}>Facilitator? Log in as admin to manage the board.</span>
              <div className="spacer" />
              <button className="btn small" onClick={() => { useApp.setState({ returnTo: 'leaderboard' }); go('login'); }}>
                <Icon name="lock" size={16} color="#14213d" /> Admin login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
