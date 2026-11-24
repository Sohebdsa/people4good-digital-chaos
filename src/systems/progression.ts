import { ACHIEVEMENTS, MISSIONS, reqProgress, reqsMet, type MissionDef } from '../data/progression';
import { useApp, type Profile } from '../store/appStore';
import { useRun } from '../store/runStore';
import { audio } from './audio/AudioManager';
import type { EnvId } from '../data/types';

/**
 * Tracks lifetime + per-run counters, completes missions and unlocks achievements live.
 * Lifetime counters are held in memory during a run and committed to the profile at the end.
 */
class Progression {
  life: Record<string, number> = {};
  run: Record<string, number> = {};
  missionsDone = new Set<string>();
  achievements = new Set<string>();
  newMissions: string[] = [];
  newAchievements: string[] = [];
  discoveredRisks = new Set<string>();
  discoveredTools = new Set<string>();
  unlockedEnvs = new Set<EnvId>();
  impactGained = 0;
  private dirty = false;

  begin() {
    const p = useApp.getState().profile;
    this.life = { ...(p.counters ?? {}) };
    this.run = {};
    this.missionsDone = new Set(p.missionsDone);
    this.achievements = new Set(p.achievements);
    this.discoveredRisks = new Set(p.discoveredRisks);
    this.discoveredTools = new Set(p.discoveredTools);
    this.unlockedEnvs = new Set(p.unlockedEnvs);
    this.newMissions = [];
    this.newAchievements = [];
    this.impactGained = 0;
    this.dirty = true;
  }

  add(key: string, n = 1) {
    this.life[key] = (this.life[key] ?? 0) + n;
    this.run[key] = (this.run[key] ?? 0) + n;
    this.dirty = true;
  }

  discoverRisk(id: string) {
    this.discoveredRisks.add(id);
  }
  discoverTool(id: string) {
    this.discoveredTools.add(id);
  }
  /** Unlock an environment as a start point (no achievement credit). */
  unlockEnv(id: EnvId) {
    this.unlockedEnvs.add(id);
  }

  /** Count an environment as genuinely reached (run into it, or ran far enough inside it). */
  reachEnv(id: EnvId) {
    if (!this.run[`env:${id}`]) this.add(`env:${id}`);
    this.unlockedEnvs.add(id);
  }

  /** Returns the mission shown in the HUD. */
  focusMission(): MissionDef | null {
    const focus = useApp.getState().profile.focusMission;
    if (focus && !this.missionsDone.has(focus)) return MISSIONS.find((m) => m.id === focus) ?? null;
    return MISSIONS.find((m) => !this.missionsDone.has(m.id)) ?? null;
  }

  check() {
    if (!this.dirty) return;
    this.dirty = false;
    const run = useRun.getState();
    for (const m of MISSIONS) {
      if (this.missionsDone.has(m.id)) continue;
      const counters = m.scope === 'run' ? this.run : this.life;
      if (reqsMet(m.reqs, counters)) {
        this.missionsDone.add(m.id);
        this.newMissions.push(m.id);
        this.life[`mission:${m.id}`] = 1;
        this.impactGained += m.reward;
        run.pushToast({ kind: 'mission', title: `Mission complete: ${m.name}`, text: `+${m.reward} Impact Points · ${m.lesson}`, color: '#ffc93c' });
        audio.play('mission');
        this.dirty = true;
      }
    }
    for (const a of ACHIEVEMENTS) {
      if (this.achievements.has(a.id)) continue;
      if (reqsMet(a.reqs, this.life)) {
        this.achievements.add(a.id);
        this.newAchievements.push(a.id);
        run.pushToast({ kind: 'achievement', title: `Achievement: ${a.name}`, text: a.description, color: '#9b5de5' });
        audio.play('achievement');
      }
    }
    this.updateHud();
  }

  updateHud() {
    const m = this.focusMission();
    if (!m) {
      useRun.getState().set({ missionLabel: 'All missions complete!', missionProgress: 1, missionDetail: 'You are a Digital Transformation Champion.' });
      return;
    }
    const counters = m.scope === 'run' ? this.run : this.life;
    const detail = m.reqs.map((r) => `${r.label} ${Math.min(r.target, counters[r.key] ?? 0)}/${r.target}`).join(' · ');
    useRun.getState().set({ missionLabel: m.name, missionProgress: reqProgress(m.reqs, counters), missionDetail: detail });
  }

  /** Persist counters and progress into the profile. */
  commit(extra: (p: Profile) => Profile = (p) => p) {
    useApp.getState().updateProfile((p) =>
      extra({
        ...p,
        counters: { ...this.life },
        missionsDone: [...this.missionsDone],
        achievements: [...this.achievements],
        discoveredRisks: [...this.discoveredRisks],
        discoveredTools: [...this.discoveredTools],
        unlockedEnvs: [...this.unlockedEnvs],
        impact: p.impact + this.impactGained,
      }),
    );
    this.impactGained = 0;
  }
}

export const progression = new Progression();

/** For flags set outside a run (assessment / roadmap). Returns newly unlocked achievement names. */
export function setFlagAndCheck(flag: string): string[] {
  const unlocked: string[] = [];
  useApp.getState().updateProfile((p) => {
    const counters = { ...(p.counters ?? {}), [flag]: 1 };
    const achievements = new Set(p.achievements);
    for (const a of ACHIEVEMENTS) {
      if (!achievements.has(a.id) && reqsMet(a.reqs, counters)) {
        achievements.add(a.id);
        unlocked.push(a.name);
      }
    }
    return { ...p, counters, achievements: [...achievements] };
  });
  if (unlocked.length) audio.play('achievement');
  return unlocked;
}
