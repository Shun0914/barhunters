// ========================================
// 画面1: 部門長ダッシュボード (v2)
// 「誰が動いたか」中心に再構成 / 1on1振り返り統合 / 承認ボタン / count-up
// ========================================

const { useState, useEffect, useRef } = React;

// count-upフック（部門切替時に数値が動く）
function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// 直近で最も動いたメンバーTOP3を抽出
function topMovers(members, count = 3) {
  return members.slice(0, count);
}

// タグに寄与した上位記録を抽出
function topContributors(feed, deptId, tagId, count = 3) {
  return feed
    .filter(f => f.deptId === deptId && f.tag === tagId && f.approved)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, count);
}

function DeptDashboard({ deptId, data, members, feed, dept, period, onPeriodChange, onOpenMember, showYen, ononeState, setOnoneState, onApproveFeed }) {
  const weekly = data.weekly;
  const categoryKeys = ['challenge', 'learn', 'help', 'onone'];
  const categoryColors = ['#6366F1', '#F59E0B', '#10B981', '#8B5CF6'];
  const lastWeek = weekly[weekly.length - 1];
  const prevWeek = weekly[weekly.length - 2];
  const weekDelta = lastWeek.total - prevWeek.total;
  const weekDeltaPct = prevWeek.total > 0 ? Math.round(weekDelta / prevWeek.total * 100) : 0;

  const tagTotals = weekly.slice(-4).reduce((a, w) => ({
    social: a.social + w.social,
    safety: a.safety + w.safety,
    future: a.future + w.future,
  }), {social: 0, safety: 0, future: 0});
  const tagSum = (tagTotals.social + tagTotals.safety + tagTotals.future) || 1;

  const activeDelta = Math.round((data.bias - 0.5) * 12);
  const movers = topMovers(members, 3);

  // count-up数値
  const cWeekPts = useCountUp(lastWeek.total);
  const cMonthPts = useCountUp(data.monthlyActual);
  const cActivePct = useCountUp(data.activePercent);

  // 仮想「先週の同じ曜日までの累計」（比較用）
  const weekOverWeek = lastWeek.total - prevWeek.total;

  // 気づきコメント
  const insight = data.bias > 0.6
    ? { tone: 'good', text: '挑戦と1on1の両方が伸びています。勢いを保つために、好事例を全社フィードで共有しましょう。' }
    : data.bias < 0.35
      ? { tone: 'warn', text: '記録が伸び悩み中。来週の1on1で、"挑戦宣言"のハードルが高すぎないか確認してみましょう。' }
      : { tone: 'neutral', text: '安定運用中。タグ比率を見て、今月は"新しい未来"への寄与を意識的に増やす週にしてみては。' };

  return (
    <div className="page">
      {/* Header: 週次の核 */}
      <div className="page-title">
        <div>
          <div className="label-sm" style={{marginBottom: 4}}>部門長ダッシュボード · {dept.name}</div>
          <h1>今週の{dept.name}、こう動いています</h1>
          <div className="sub">{dept.lead}さん / {dept.people}名 · 今週のフォーカス：挑戦と1on1の接続</div>
        </div>
        <div className="page-title-actions">
          <Segmented value={period} onChange={onPeriodChange} options={[
            {value: 'w', label: '週次'}, {value: 'm', label: '月次'}, {value: 'q', label: '四半期'}
          ]}/>
        </div>
      </div>

      {/* HERO: 「誰が動いたか」を最上部に */}
      <div className="movers-hero">
        <div className="movers-main">
          <div className="label-sm" style={{color: 'rgba(255,255,255,0.65)'}}>今週、動いた人</div>
          <div className="movers-title">
            {movers[0]?.name.split(' ')[0]}さんを筆頭に、<span className="movers-count">{members.filter(m => m.activities > 0).length}名</span>が記録しました
          </div>
          <div className="movers-sub">先週比 <b style={{color: weekDelta >= 0 ? '#4ADE80' : '#FCA5A5'}}>{weekDelta >= 0 ? '+' : ''}{weekOverWeek}P</b> · 一番の牽引は <b>{movers[0]?.name}</b> さんの挑戦記録</div>
          <div className="movers-stack">
            {movers.map((m, i) => (
              <div key={m.id} className="mover-card" onClick={() => onOpenMember(m)} style={{animationDelay: `${i * 80}ms`}}>
                <div className="mover-rank">#{i + 1}</div>
                <Avatar name={m.name} size={36}/>
                <div style={{minWidth: 0, flex: 1}}>
                  <div className="mover-name">{m.name}</div>
                  <div className="mover-meta">{m.role} · 今週 {m.activities}件の記録</div>
                </div>
                <div className="mover-pts">
                  <div className="mover-pts-num">+{m.points}</div>
                  <div className="mover-pts-unit">P</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="movers-side">
          <div className="movers-side-row">
            <div>
              <div className="label-sm">今週のポイント</div>
              <div className="movers-side-big">
                {cWeekPts.toLocaleString()}<span className="unit">P</span>
              </div>
              <div style={{display: 'flex', gap: 6, marginTop: 2}}>
                <Delta value={weekDeltaPct} suffix="%"/>
                <span className="dim" style={{fontSize: 11.5}}>先週比</span>
              </div>
            </div>
            <Ring value={lastWeek.total} max={Math.max(data.monthlyTarget / 4, lastWeek.total)} color={dept.color} size={56} stroke={6}/>
          </div>
          <div className="movers-side-row">
            <div>
              <div className="label-sm">アクティブ率</div>
              <div className="movers-side-big">{cActivePct}<span className="unit">%</span></div>
              <div style={{display: 'flex', gap: 6, marginTop: 2}}>
                <Delta value={activeDelta} suffix="pt"/>
                <span className="dim" style={{fontSize: 11.5}}>全社平均 54%</span>
              </div>
            </div>
            <div className="mini-bar">
              <HBar value={data.activePercent} max={100} color={dept.color} height={6}/>
              <div className="dim" style={{fontSize: 11, marginTop: 3, textAlign: 'right'}}>{data.activeCount}/{dept.people}名</div>
            </div>
          </div>
          <div className="movers-side-row" style={{borderBottom: 'none'}}>
            <div>
              <div className="label-sm">月次ポイント</div>
              <div className="movers-side-big">
                {cMonthPts}<span className="unit">/ {data.monthlyTarget}P</span>
              </div>
              <div className="dim" style={{fontSize: 11.5, marginTop: 2}}>目標 {Math.round(data.monthlyActual/data.monthlyTarget*100)}% 達成</div>
            </div>
            <Ring value={data.monthlyActual} max={data.monthlyTarget} color={dept.color} size={56} stroke={6}/>
          </div>
        </div>
      </div>

      {/* Insight callout */}
      <div className={`insight-callout tone-${insight.tone}`}>
        <Icon.Sparkle/>
        <span>{insight.text}</span>
        <button className="btn-ghost" style={{marginLeft: 'auto', fontSize: 12}}>詳しく見る <Icon.Chev/></button>
      </div>

      {/* 週次の振り返りセクション（チャート + 1on1入力を一体化） */}
      <Card>
        <div className="card-head">
          <div>
            <div className="card-title">今週の振り返り</div>
            <div className="card-sub">データを見て、1on1の記録を残す — 週次オペのハブ</div>
          </div>
          <div className="card-actions">
            <Tag color="#6366F1" size="md">Week {weekly.length}</Tag>
          </div>
        </div>

        <div className="reflect-grid">
          <div>
            <div className="label-sm" style={{marginBottom: 8}}>週次ポイント推移（過去12週）</div>
            <div className="cat-pills" style={{marginBottom: 10}}>
              {window.__DASH.CATEGORIES.map((c, i) => (
                <span key={c.id} className="cat-pill" style={{color: categoryColors[i], borderColor: categoryColors[i] + '40', background: categoryColors[i] + '12'}}>
                  <span style={{width:6, height:6, borderRadius:'50%', background: categoryColors[i], display: 'inline-block'}}/>
                  {c.label}
                </span>
              ))}
            </div>
            <AreaChart data={weekly} keys={categoryKeys} colors={categoryColors} height={200}/>
          </div>

          <div className="reflect-input">
            <div className="input-form-title">
              <Icon.Onone style={{color: '#8B5CF6'}}/>
              今週の1on1を記録
            </div>
            <div className="input-form-q">今週、部下との1on1を何回実施しましたか？</div>
            <div className="num-input" style={{marginBottom: 6}}>
              <button className="num-btn" onClick={() => setOnoneState({...ononeState, count: Math.max(0, ononeState.count - 1), saved: false})}>−</button>
              <div className="num-value">{ononeState.count}</div>
              <button className="num-btn" onClick={() => setOnoneState({...ononeState, count: ononeState.count + 1, saved: false})}>+</button>
              <span className="dim" style={{fontSize: 12, marginLeft: 8}}>/ 目標 {data.onone.target}回</span>
            </div>
            <HBar value={ononeState.count} max={data.onone.target} color="#8B5CF6" height={5}/>
            <div className="dim" style={{fontSize: 11, marginTop: 3}}>先週 {data.onone.lastWeek}回 · 前月同週比 +{Math.max(1, Math.round((ononeState.count - data.onone.lastWeek)))}</div>

            <div className="input-form-q" style={{marginTop: 14}}>今週の気づき（任意）</div>
            <textarea className="textarea" placeholder="例：Aさんの挑戦宣言をサポート。来週は若手3名と順番に..."
              value={ononeState.memo} onChange={(e) => setOnoneState({...ononeState, memo: e.target.value, saved: false})}/>
            <div style={{display: 'flex', gap: 8, marginTop: 10, alignItems: 'center'}}>
              <button className="btn-primary" onClick={() => setOnoneState({...ononeState, saved: true})}>
                <Icon.Check/> 記録する
              </button>
              {ononeState.saved && <span style={{fontSize: 12, color: 'var(--success)'}}><Icon.Check/> 保存しました</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* 顧客価値タグ & TOP3寄与記録 */}
      <Card>
        <div className="card-head">
          <div>
            <div className="card-title">顧客価値タグ · 直近4週</div>
            <div className="card-sub">どの価値にどんな行動で貢献しているか — 比率と中身を同時に見る</div>
          </div>
        </div>
        <div className="tag-contrib-grid">
          {window.__DASH.CUSTOMER_VALUE_TAGS.map(t => {
            const v = tagTotals[t.id];
            const pct = Math.round(v / tagSum * 100);
            const contributors = topContributors(feed, deptId, t.id, 3);
            const trend = [2, 1, 3, 2, 4, 3, 5].map(n => n * (v / 20));
            return (
              <div key={t.id} className="tag-contrib-card">
                <div className="tag-contrib-head">
                  <div>
                    <div className="tag-contrib-label">
                      <span style={{width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block', marginRight: 6}}/>
                      {t.label}
                    </div>
                    <div className="tag-contrib-desc">{t.desc}</div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div className="tnum" style={{fontSize: 20, fontWeight: 700, color: t.color}}>{pct}%</div>
                    <div className="dim" style={{fontSize: 11}}>{v}P</div>
                  </div>
                </div>
                <HBar value={v} max={tagSum} color={t.color} height={5}/>
                <div className="tag-contrib-top">
                  <div className="label-sm" style={{marginTop: 10, marginBottom: 6}}>このタグを作った上位記録</div>
                  {contributors.length > 0 ? contributors.map((c, i) => (
                    <div key={c.id} className="contrib-row">
                      <span className="contrib-rank">{i + 1}</span>
                      <Avatar name={c.person} size={22}/>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div className="contrib-text" title={c.text}>{c.text}</div>
                        <div className="dim" style={{fontSize: 10.5}}>{c.person}</div>
                      </div>
                      <span className="contrib-pts">+{c.pts}P</span>
                    </div>
                  )) : (
                    <div className="dim" style={{fontSize: 11.5, padding: '8px 0'}}>このタグの承認済み記録はまだありません。1on1で挑戦宣言を促しましょう。</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Realtime feed with 1-click approve */}
      <Card>
        <div className="card-head">
          <div>
            <div className="card-title">
              <span className="feed-pulse" style={{marginRight: 8, verticalAlign: 'middle'}}/>
              リアルタイム活動フィード
            </div>
            <div className="card-sub">承認待ちは1クリックで承認できます</div>
          </div>
          <div className="card-actions">
            <Segmented size="sm" value="all" onChange={() => {}} options={[
              {value: 'all', label: '全社'}, {value: 'dept', label: `${dept.short}のみ`}, {value: 'pending', label: `承認待ち ${feed.filter(f => !f.approved).length}`}
            ]}/>
          </div>
        </div>
        <div className="feed">
          {feed.slice(0, 10).map(f => {
            const cat = window.__DASH.CATEGORIES.find(c => c.id === f.cat);
            const tag = window.__DASH.CUSTOMER_VALUE_TAGS.find(t => t.id === f.tag);
            const CIcon = CAT_ICON[f.cat];
            return (
              <div key={f.id} className="feed-item">
                <Avatar name={f.person} size={30}/>
                <div className="feed-body">
                  <div className="feed-meta">
                    <span className="name">{f.person}</span>
                    <span>·</span>
                    <span>{f.deptName}</span>
                    <span>·</span>
                    <Tag color={cat.color}><CIcon/>{cat.label}</Tag>
                    <Tag color={tag.color}>{tag.label}</Tag>
                    <span style={{marginLeft: 'auto'}}>{f.timeAgo}</span>
                  </div>
                  <div className="feed-text">{f.text}</div>
                  <div className="feed-footer">
                    <span style={{fontSize: 12, fontWeight: 600}}>+{f.pts}P</span>
                    {f.approved ? (
                      <Tag color="#10B981"><Icon.Check/>承認済み</Tag>
                    ) : (
                      <>
                        <Tag color="#F59E0B"><Icon.Clock/>承認待ち</Tag>
                        <button className="approve-btn" onClick={() => onApproveFeed(f.id)}>
                          <Icon.Check/> 承認
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

window.DeptDashboard = DeptDashboard;
