import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { validNickname } from '../../systems/leaderboard';
import { loginAdmin, logoutAdmin, useIsAdmin } from '../../systems/auth';
import { Icon } from '../Icon';
import { click, go } from '../../actions';

/**
 * Optional sign-in page. Participants can type a name (used on the leaderboard) or skip as a guest;
 * nothing in the game requires signing in. The Admin tab is for facilitators only.
 */
export function LoginScreen() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<'player' | 'admin'>(isAdmin ? 'admin' : 'player');
  const [name, setName] = useState(settings.playerName);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const finish = () => {
    update({ welcomed: true });
    go('menu');
  };

  const continueWithName = () => {
    const clean = validNickname(name);
    if (!clean) {
      setError('Use 1–16 letters, numbers, spaces, dots, dashes or underscores.');
      return;
    }
    update({ playerName: clean, namePrompted: true });
    finish();
  };

  const guest = () => {
    update({ playerName: '' });
    finish();
  };

  const adminLogin = async () => {
    click();
    setBusy(true);
    setError(null);
    const r = await loginAdmin(password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'Login failed.');
      return;
    }
    setPassword('');
    setNotice(r.offline ? 'Logged in (server offline: you can manage this device’s board).' : 'Logged in as admin.');
    update({ welcomed: true });
    useApp.setState({ returnTo: 'menu' });
    go('leaderboard');
  };

  return (
    <div className="screen login-screen">
      <div className="login-card card">
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src={`${import.meta.env.BASE_URL}assets/brand/people4good-logo.png`} alt="People4good" style={{ height: 92, width: 'auto' }} />
          <div className="logo-sub" style={{ color: 'var(--muted)', opacity: 1 }}>Escape the Digital Chaos</div>
        </div>

        <div className="seg login-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'player'} className={tab === 'player' ? 'on' : ''} onClick={() => { setTab('player'); setError(null); }}>
            Participant
          </button>
          <button role="tab" aria-selected={tab === 'admin'} className={tab === 'admin' ? 'on' : ''} onClick={() => { setTab('admin'); setError(null); }}>
            Admin
          </button>
        </div>

        {tab === 'player' ? (
          <>
            <h2 style={{ fontSize: 24, margin: '14px 0 4px' }}>Who’s running?</h2>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
              Your name appears on the leaderboard. No account or password needed.
            </p>
            <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>
              Name or nickname
              <input
                className="field"
                autoFocus
                maxLength={16}
                placeholder="e.g. Asha or Team Blue"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') continueWithName(); }}
              />
            </label>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Shown to everyone, so a first name, nickname or team name is best.</div>
            {error && <div className="login-error">{error}</div>}
            <button className="btn primary big block" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={() => { click(); continueWithName(); }}>
              <Icon name="play" color="#14213d" /> Let’s go
            </button>
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => { click(); guest(); }}>
              Play as guest
            </button>
          </>
        ) : isAdmin ? (
          <>
            <h2 style={{ fontSize: 24, margin: '14px 0 4px' }}>Admin</h2>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>{notice ?? 'You are logged in as admin for this browser tab.'}</p>
            <button className="btn violet block" onClick={() => { useApp.setState({ returnTo: 'menu' }); go('leaderboard'); }}>
              <Icon name="trophy" color="#fff" /> Manage leaderboard
            </button>
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => { click(); logoutAdmin(); setNotice(null); }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 24, margin: '14px 0 4px' }}>Admin login</h2>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>For facilitators: reset the leaderboard and remove entries.</p>
            <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>
              Password
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void adminLogin(); }}
              />
            </label>
            {error && <div className="login-error">{error}</div>}
            <button className="btn violet big block" style={{ marginTop: 14 }} disabled={busy || !password} onClick={() => void adminLogin()}>
              {busy ? 'Checking…' : 'Log in'}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Demo build: the admin password is fixed in the code.</p>
          </>
        )}

        <button className="login-skip" onClick={() => { click(); finish(); }}>
          Back to menu
        </button>
      </div>
    </div>
  );
}
