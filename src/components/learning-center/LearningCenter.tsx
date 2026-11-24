import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { LEARNING, ARTICLE_BY_ID, TOOL_CARDS, TOOL_DISCLAIMER } from '../../data/learning';
import { RISKS, RISK_CATEGORY_LABEL } from '../../data/risks';
import { TOOLS, TOOL_GROUP_LABEL, POWERS } from '../../data/tools';
import { ScreenHeader } from '../ScreenHeader';
import { Icon, hex } from '../Icon';
import { click } from '../../actions';
import { Sprite } from '../Sprite';

type Tab = 'knowledge' | 'tools' | 'risks' | 'collectibles';

const SHAPE_LABEL = { low: 'Jump over', high: 'Slide under', wall: 'Change lane' };

export function LearningCenter() {
  const articleId = useApp((s) => s.articleId);
  const openArticle = useApp((s) => s.openArticle);
  const discoveredRisks = useApp((s) => s.profile.discoveredRisks);
  const discoveredTools = useApp((s) => s.profile.discoveredTools);
  const [tab, setTab] = useState<Tab>('knowledge');
  const article = articleId ? ARTICLE_BY_ID[articleId] : null;
  const section = article ? LEARNING.find((s) => s.articles.some((a) => a.id === article.id)) : null;

  const tabs: [Tab, string][] = [
    ['knowledge', 'Knowledge'],
    ['tools', 'Digital Tools Discovery'],
    ['risks', `Risk Guide (${discoveredRisks.length}/20)`],
    ['collectibles', `Tools & Power-ups (${discoveredTools.length}/15)`],
  ];

  return (
    <div className="screen">
      <ScreenHeader title="Digital Knowledge Center" sub="Detailed explanations behind every risk, tool and decision in the game." />
      <div className="screen-body ui-scroll">
        {article ? (
          <div className="article">
            <button className="btn small" onClick={() => { click(); openArticle(null); }} style={{ marginBottom: 12 }}>
              <Icon name="back" size={16} color="#14213d" /> All topics
            </button>
            {section && <div className="tag" style={{ background: section.color }}>{section.letter}. {section.title}</div>}
            <h2 style={{ marginTop: 10 }}>{article.title}</h2>
            <p className="lead">{article.summary}</p>
            {article.body.map((p, i) => <p key={i}>{p}</p>)}
            {article.tryThis && <div className="try"><b>Try this: </b>{article.tryThis}</div>}
            {section && (
              <>
                <h3 style={{ marginTop: 22, marginBottom: 8 }}>More in this section</h3>
                <div className="grid three">
                  {section.articles.filter((a) => a.id !== article.id).map((a) => (
                    <button key={a.id} className="article-link" onClick={() => { click(); openArticle(a.id); }}>
                      <b>{a.title}</b><span>{a.summary}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="tabs">
              {tabs.map(([id, label]) => (
                <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => { click(); setTab(id); }}>{label}</button>
              ))}
            </div>

            {tab === 'knowledge' && LEARNING.map((sec) => (
              <div key={sec.id}>
                <div className="section-head">
                  <div className="letter" style={{ background: sec.color }}>{sec.letter}</div>
                  <h3>{sec.title}</h3>
                </div>
                <div className="grid three">
                  {sec.articles.map((a) => (
                    <button key={a.id} className="article-link" onClick={() => { click(); openArticle(a.id); }}>
                      <b>{a.title}</b><span>{a.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {tab === 'tools' && (
              <>
                <div className="section-head">
                  <div className="letter" style={{ background: '#7cc6fe' }}>E</div>
                  <h3>Digital Tools Discovery</h3>
                </div>
                <div className="note" style={{ marginBottom: 14 }}>{TOOL_DISCLAIMER}</div>
                <div className="grid three">
                  {TOOL_CARDS.map((t) => (
                    <div className="card" key={t.name} style={{ padding: 14 }}>
                      <span className="tag">{t.category}</span>
                      <h3 style={{ marginTop: 8 }}>{t.name}</h3>
                      <p style={{ margin: '4px 0', fontSize: 14 }}>{t.useCase}</p>
                      <p className="muted" style={{ margin: 0, fontSize: 13 }}><b>Consider:</b> {t.consider}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'risks' && (['data', 'privacy', 'ai'] as const).map((cat, ci) => (
              <div key={cat}>
                <div className="section-head">
                  <div className="letter" style={{ background: ['#ffb627', '#1fb5a8', '#9b5de5'][ci] }}>{'ABC'[ci]}</div>
                  <h3>{RISK_CATEGORY_LABEL[cat]} risks</h3>
                </div>
                {cat === 'data' && (
                  <div className="note" style={{ marginBottom: 10 }}>
                    Paper is not the enemy: in low-connectivity and grassroots settings it can be the right tool. The risk is information that is
                    unmanaged, disconnected, insecure or unstructured.
                  </div>
                )}
                <div className="grid two">
                  {RISKS.filter((r) => r.category === cat).map((r) => {
                    const seen = discoveredRisks.includes(r.id);
                    return (
                      <div className="card" key={r.id} style={{ padding: 14 }}>
                        <div className="row">
                          <span className="tag">#{r.num}</span>
                          <span className="tag">{SHAPE_LABEL[r.shape]}</span>
                          <span className="tag">Difficulty {'●'.repeat(r.difficulty)}{'○'.repeat(3 - r.difficulty)}</span>
                          {seen ? <span className="tag" style={{ background: '#e3f7e9' }}>Encountered ✓</span> : <span className="tag" style={{ opacity: 0.6 }}>Not yet met</span>}
                        </div>
                        <div className="risk-head">
                          <Sprite kind="obstacles" id={r.id} size={88} className={seen ? '' : 'sprite-dim'} />
                          <h3>{r.name}</h3>
                        </div>
                        <p className="muted" style={{ margin: '2px 0 6px', fontSize: 13 }}><i>In the game: {r.visual}</i></p>
                        <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{r.message}</p>
                        <p style={{ margin: 0, fontSize: 14 }}>{r.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {tab === 'collectibles' && (
              <>
                <div className="section-head"><h3>Digital transformation collectibles</h3></div>
                <div className="grid two">
                  {TOOLS.map((t) => {
                    const seen = discoveredTools.includes(t.id);
                    return (
                      <div className={`item ${seen ? '' : 'locked'}`} key={t.id}>
                        <div className="ic ic-sprite" style={{ borderColor: hex(t.color) }}><Sprite kind="items" id={t.id} size={52} /></div>
                        <div>
                          <h4>{t.name} <span className="tag">{TOOL_GROUP_LABEL[t.group]}</span></h4>
                          <p><b>{t.message}</b> {t.detail}</p>
                          <p><i>Examples: {t.examples}</i></p>
                        </div>
                        <span className="muted" style={{ fontSize: 11, textAlign: 'right' }}>{t.points} pts<br />{seen ? 'Collected' : 'Not yet'}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="section-head"><h3>Power-ups</h3></div>
                <div className="grid two">
                  {POWERS.map((p) => (
                    <div className="item" key={p.id}>
                      <div className="ic ic-sprite" style={{ borderColor: hex(p.color) }}><Sprite kind="powerups" id={p.id} size={52} /></div>
                      <div>
                        <h4>{p.name}</h4>
                        <p>{p.description} <i>{p.lesson}</i></p>
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>{p.duration}s</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
