// ========================================
// クイックパネル & 記録追加モーダル
// サイドバー＆上部ボタンから開くオーバーレイ群
// ========================================

const PanelMembers = ({ open, onClose, members, dept, onOpenMember }) => {
  if (!open) return null;
  const [q, setQ] = React.useState('');
  const filtered = members.filter(m => m.name.includes(q) || m.role.includes(q));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="panel-icon" style={{background: '#EEEDFC', color: '#5B54D6'}}><Icon.Users/></div>
          <div>
            <div style={{fontSize: 17, fontWeight: 600}}>{dept.name} メンバー一覧</div>
            <div className="dim" style={{fontSize: 12.5}}>{members.length}名 · {dept.lead}部門長</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.Close/></button>
        </div>
        <div style={{padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10}}>
          <div style={{position: 'relative', flex: 1}}>
            <span style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)'}}><Icon.Search/></span>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="名前・役職で絞り込み"
              style={{
                width: '100%', padding: '8px 10px 8px 32px', fontSize: 13,
                background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)',
              }}
            />
          </div>
          <Segmented value="all" onChange={() => {}} options={[
            {value: 'all', label: '全員'}, {value: 'active', label: 'アクティブ'}, {value: 'silent', label: '記録なし'}
          ]}/>
        </div>
        <div className="modal-body" style={{padding: 0, maxHeight: 460, overflowY: 'auto'}}>
          <table className="cmp-table" style={{width: '100%'}}>
            <thead>
              <tr>
                <th style={{paddingLeft: 22}}>メンバー</th>
                <th>今月P</th>
                <th>挑戦</th>
                <th>助け合い</th>
                <th>学び</th>
                <th>エンゲージ</th>
                <th style={{paddingRight: 22}}>最終活動</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} onClick={() => { onOpenMember(m); onClose(); }} style={{cursor: 'pointer'}}>
                  <td style={{paddingLeft: 22}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                      <Avatar name={m.name} size={28}/>
                      <div>
                        <div style={{fontSize: 13, fontWeight: 600}}>{m.name}</div>
                        <div className="dim" style={{fontSize: 11}}>{m.role}</div>
                      </div>
                    </div>
                  </td>
                  <td><b>{m.points}</b><span className="dim" style={{fontSize: 11, marginLeft: 2}}>P</span></td>
                  <td>{m.challenges}</td>
                  <td>{m.helps}</td>
                  <td>{m.learns}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                      <span>{m.engagement}</span>
                      <div style={{width: 50}}><HBar value={m.engagement} max={100} color={m.engagement >= 75 ? '#10B981' : m.engagement >= 60 ? '#F59E0B' : '#EF4444'} height={4}/></div>
                    </div>
                  </td>
                  <td className="dim" style={{fontSize: 11.5, paddingRight: 22}}>{m.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{padding: 30, textAlign: 'center'}} className="dim">該当するメンバーがいません</div>}
        </div>
      </div>
    </div>
  );
};

// ----- 48時間挑戦 -----
const Panel48h = ({ open, onClose, dept }) => {
  if (!open) return null;
  // モック挑戦リスト
  const challenges = [
    { id: 'c1', name: '中村 翔太', role: '一般', text: '料金プラン提案資料を48hでLLM支援つきテンプレ化', tag: 'future', remaining: '残り 18時間', progress: 0.62, supporters: 3 },
    { id: 'c2', name: '山口 明日香', role: 'リーダー', text: '高齢者向け訪問説明、3軒で新フレームをテスト', tag: 'social', remaining: '残り 32時間', progress: 0.34, supporters: 5 },
    { id: 'c3', name: '池田 ゆかり', role: '一般', text: '夜間対応の判断基準、過去半年の事例から3パターン抽出', tag: 'safety', remaining: '残り 6時間', progress: 0.88, supporters: 2 },
    { id: 'c4', name: '松本 大輔', role: '一般', text: '保安ルートの最適化、地図APIで仮実装', tag: 'safety', remaining: '本日締切', progress: 0.95, supporters: 4 },
  ];
  const TAGS = window.__DASH.CUSTOMER_VALUE_TAGS;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="panel-icon" style={{background: 'linear-gradient(135deg, #FFE4B0 0%, #FCD34D 100%)', color: '#92400E'}}><Icon.Sparkle/></div>
          <div>
            <div style={{fontSize: 17, fontWeight: 600}}>48時間挑戦 · 進行中</div>
            <div className="dim" style={{fontSize: 12.5}}>2日でケリをつける小さな宣言。応援&学びを記録しよう</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.Close/></button>
        </div>
        <div className="modal-body" style={{padding: 0}}>
          <div style={{padding: '14px 22px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', alignItems: 'center'}}>
            <Tag color="#F59E0B" size="md">進行中 {challenges.length}件</Tag>
            <Tag color="#10B981" size="md">今週完了 7件</Tag>
            <span className="dim" style={{fontSize: 12, marginLeft: 'auto'}}>過去30日完走率：<b style={{color: 'var(--text-1)'}}>72%</b></span>
            <button className="btn-primary"><Icon.Plus/> 挑戦を宣言</button>
          </div>
          <div style={{padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto'}}>
            {challenges.map(c => {
              const tag = TAGS.find(t => t.id === c.tag);
              const urgent = c.remaining.includes('6時間') || c.remaining.includes('本日');
              return (
                <div key={c.id} className="challenge-card">
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
                    <Avatar name={c.name} size={36}/>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                        <b style={{fontSize: 13.5}}>{c.name}</b>
                        <span className="dim" style={{fontSize: 11.5}}>{c.role}</span>
                        <Tag color={tag.color}>{tag.label}</Tag>
                        <span style={{marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: urgent ? '#DC2626' : 'var(--text-3)'}}>
                          <Icon.Clock/> {c.remaining}
                        </span>
                      </div>
                      <div style={{fontSize: 13.5, marginTop: 6, lineHeight: 1.5}}>{c.text}</div>
                      <div style={{marginTop: 8, display: 'flex', alignItems: 'center', gap: 10}}>
                        <div style={{flex: 1}}>
                          <HBar value={c.progress * 100} max={100} color={urgent ? '#F59E0B' : 'var(--brand)'} height={5}/>
                        </div>
                        <span className="dim tnum" style={{fontSize: 11.5, minWidth: 36}}>{Math.round(c.progress * 100)}%</span>
                        <button className="btn-ghost" style={{fontSize: 12, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 99}}>
                          <Icon.Sparkle style={{verticalAlign: 'middle', marginRight: 3}}/>応援 ({c.supporters})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ----- 承認待ちパネル -----
const PanelPending = ({ open, onClose, feed, onApprove, dept }) => {
  if (!open) return null;
  const pending = feed.filter(f => !f.approved && f.deptId === dept.id).slice(0, 12);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="panel-icon" style={{background: '#FEF3C7', color: '#92400E'}}><Icon.Clock/></div>
          <div>
            <div style={{fontSize: 17, fontWeight: 600}}>承認待ちの記録</div>
            <div className="dim" style={{fontSize: 12.5}}>{dept.name}の{pending.length}件 · 1クリックで承認できます</div>
          </div>
          <div style={{marginLeft: 'auto', display: 'flex', gap: 6}}>
            <button className="btn-ghost" style={{border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: 12.5}}>すべて承認</button>
            <button className="modal-close" onClick={onClose}><Icon.Close/></button>
          </div>
        </div>
        <div className="modal-body" style={{padding: '8px 22px', maxHeight: 480, overflowY: 'auto'}}>
          {pending.length === 0 && <div className="dim" style={{padding: 30, textAlign: 'center'}}>承認待ちはありません 🎉</div>}
          {pending.map(f => {
            const cat = window.__DASH.CATEGORIES.find(c => c.id === f.cat);
            const tag = window.__DASH.CUSTOMER_VALUE_TAGS.find(t => t.id === f.tag);
            const CIcon = CAT_ICON[f.cat];
            return (
              <div key={f.id} className="pending-row">
                <Avatar name={f.person} size={32}/>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-3)', flexWrap: 'wrap'}}>
                    <b style={{color: 'var(--text-2)', fontSize: 12.5}}>{f.person}</b>
                    <span>·</span>
                    <Tag color={cat.color}><CIcon/>{cat.label}</Tag>
                    <Tag color={tag.color}>{tag.label}</Tag>
                    <span style={{marginLeft: 'auto'}}>{f.timeAgo}</span>
                  </div>
                  <div style={{fontSize: 13, marginTop: 4, lineHeight: 1.5}}>{f.text}</div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6}}>
                  <span style={{fontSize: 13, fontWeight: 700, color: 'var(--success)'}}>+{f.pts}P</span>
                  <div style={{display: 'flex', gap: 4}}>
                    <button className="btn-ghost" style={{padding: '4px 10px', fontSize: 11.5, border: '1px solid var(--border)', borderRadius: 99}}>差し戻し</button>
                    <button className="approve-btn" onClick={() => onApprove(f.id)} style={{margin: 0}}><Icon.Check/>承認</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ----- 記録を追加 -----
const PanelAddRecord = ({ open, onClose, dept }) => {
  if (!open) return null;
  const [cat, setCat] = React.useState('challenge');
  const [tag, setTag] = React.useState('future');
  const [text, setText] = React.useState('');
  const [pts, setPts] = React.useState(5);
  const [people, setPeople] = React.useState([]);
  const [submitted, setSubmitted] = React.useState(false);

  const CATS = window.__DASH.CATEGORIES;
  const TAGS = window.__DASH.CUSTOMER_VALUE_TAGS;
  const PEOPLE = window.__DASH.MEMBER_NAMES.slice(0, 8);

  const togglePerson = (name) => {
    setPeople(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setText('');
      onClose();
    }, 1400);
  };

  const tagObj = TAGS.find(t => t.id === tag);
  const catObj = CATS.find(c => c.id === cat);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 580}}>
        <div className="modal-head">
          <div className="panel-icon" style={{background: 'var(--brand-soft)', color: 'var(--brand)'}}><Icon.Plus/></div>
          <div>
            <div style={{fontSize: 17, fontWeight: 600}}>記録を追加</div>
            <div className="dim" style={{fontSize: 12.5}}>挑戦・助け合い・学び・1on1。一行でいい、書いて流そう。</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.Close/></button>
        </div>
        <div className="modal-body" style={{padding: 22}}>
          {submitted ? (
            <div style={{textAlign: 'center', padding: '40px 20px'}}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px',
                animation: 'pop 0.4s ease',
              }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{fontSize: 16, fontWeight: 600}}>記録しました</div>
              <div className="dim" style={{fontSize: 12.5, marginTop: 4}}>+{pts}P · {tagObj.label} · 部門長の承認待ちに入りました</div>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
              {/* カテゴリ */}
              <div>
                <div className="label-sm" style={{marginBottom: 8}}>① カテゴリ</div>
                <div className="cat-selector">
                  {CATS.map(c => {
                    const CIcon = CAT_ICON[c.id];
                    const isActive = cat === c.id;
                    return (
                      <button
                        key={c.id}
                        className={`cat-chip ${isActive ? 'active' : ''}`}
                        onClick={() => setCat(c.id)}
                        style={isActive ? {background: c.color, borderColor: c.color, color: 'white'} : {}}
                      >
                        <CIcon/>
                        <div style={{textAlign: 'left'}}>
                          <div style={{fontSize: 12.5, fontWeight: 600}}>{c.label}</div>
                          <div style={{fontSize: 10.5, opacity: 0.75}}>{c.short}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* テキスト */}
              <div>
                <div className="label-sm" style={{marginBottom: 8}}>② 何をしたか（1〜2行）</div>
                <textarea
                  className="textarea"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  autoFocus
                  placeholder={`例：${catObj.example}`}
                  style={{minHeight: 78}}
                />
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 4}}>
                  <span className="dim" style={{fontSize: 11}}>誰が読んでも意味が分かる粒度で</span>
                  <span className="dim tnum" style={{fontSize: 11}}>{text.length} / 140</span>
                </div>
              </div>

              {/* タグ */}
              <div>
                <div className="label-sm" style={{marginBottom: 8}}>③ 顧客価値タグ（1つ選択）</div>
                <div style={{display: 'flex', gap: 6}}>
                  {TAGS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTag(t.id)}
                      className="tag-chip"
                      style={tag === t.id ? {background: t.color + '15', borderColor: t.color, color: t.color} : {}}
                    >
                      <span style={{width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block', marginRight: 6}}/>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 一緒にやった人 */}
              <div>
                <div className="label-sm" style={{marginBottom: 8}}>④ 一緒にやった人 <span style={{textTransform: 'none', color: 'var(--text-3)', fontWeight: 500}}>（任意・複数可）</span></div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
                  {PEOPLE.map(name => (
                    <button
                      key={name}
                      onClick={() => togglePerson(name)}
                      className="person-chip"
                      style={people.includes(name) ? {background: 'var(--brand-soft)', borderColor: 'var(--brand)', color: 'var(--brand)'} : {}}
                    >
                      <Avatar name={name} size={20}/>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ポイント自動 */}
              <div style={{padding: 12, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12}}>
                <Icon.Sparkle style={{color: 'var(--brand)'}}/>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 12.5, fontWeight: 600}}>付与ポイント（自動算出）</div>
                  <div className="dim" style={{fontSize: 11, marginTop: 1}}>カテゴリ・タグ・関与人数から提案。承認時に確定</div>
                </div>
                <div className="num-input">
                  <button className="num-btn" onClick={() => setPts(Math.max(1, pts - 1))}>−</button>
                  <div className="num-value" style={{fontSize: 18, minWidth: 40}}>{pts}</div>
                  <button className="num-btn" onClick={() => setPts(pts + 1)}>+</button>
                  <span className="dim" style={{fontSize: 11.5, marginLeft: 4}}>P</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {!submitted && (
          <div style={{padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center'}}>
            <span className="dim" style={{fontSize: 11.5}}>⌘ + Enter で送信</span>
            <div style={{flex: 1}}/>
            <button className="btn-ghost" onClick={onClose}>キャンセル</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={!text.trim()} style={!text.trim() ? {opacity: 0.4, cursor: 'not-allowed'} : {}}>
              <Icon.Check/> 記録する（+{pts}P）
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

window.PanelMembers = PanelMembers;
window.Panel48h = Panel48h;
window.PanelPending = PanelPending;
window.PanelAddRecord = PanelAddRecord;
