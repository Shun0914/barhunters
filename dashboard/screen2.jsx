// ========================================
// 画面2: 全社比較ビュー
// ========================================

function CompareView({ allData, members, feed, onOpenMember, period, onPeriodChange }) {
  const DEPTS = window.__DASH.DEPARTMENTS;
  const TAGS = window.__DASH.CUSTOMER_VALUE_TAGS;

  // 部門別ランキング
  const ranking = DEPTS.map(d => {
    const dd = allData[d.id];
    const recent4 = dd.weekly.slice(-4).reduce((s, w) => s + w.total, 0);
    const prev4 = dd.weekly.slice(-8, -4).reduce((s, w) => s + w.total, 0);
    const growth = prev4 > 0 ? Math.round((recent4 - prev4) / prev4 * 100) : 0;
    return { ...d, totalPoints: dd.totalPoints, recent4, growth, activePercent: dd.activePercent, activeCount: dd.activeCount, bias: dd.bias };
  }).sort((a, b) => b.recent4 - a.recent4);

  const maxPoints = Math.max(...ranking.map(r => r.recent4));

  // タグ別部門比較（直近4週）
  const tagCompare = DEPTS.map(d => {
    const w = allData[d.id].weekly.slice(-4);
    const t = w.reduce((a, r) => ({ social: a.social + r.social, safety: a.safety + r.safety, future: a.future + r.future }),
      { social: 0, safety: 0, future: 0 });
    const sum = t.social + t.safety + t.future || 1;
    return { id: d.id, name: d.name, ...t, sum };
  });

  // 注目記録（承認済みを高ポイント順）
  const featured = feed.filter(f => f.approved).sort((a, b) => b.pts - a.pts).slice(0, 4);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <div className="label-sm" style={{marginBottom: 4}}>全社比較ビュー</div>
          <h1>他の部門、こう動いています</h1>
          <div className="sub">成長率と顧客価値タグで部門の個性を見る · 「競争」より「刺激」</div>
        </div>
        <div className="page-title-actions">
          <Segmented value={period} onChange={onPeriodChange} options={[
            {value: 'w', label: '週次'}, {value: 'm', label: '月次'}, {value: 'q', label: '四半期'}
          ]}/>
        </div>
      </div>

      <div className="grid-main">
        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">部門別ポイント（直近4週）と成長率</div>
              <div className="card-sub">成長率は前4週比 · 絶対値でなく伸びを見る</div>
            </div>
          </div>
          <div className="vstack">
            {ranking.map((r, idx) => (
              <div key={r.id} style={{display: 'grid', gridTemplateColumns: '24px 24px 120px 1fr auto auto', alignItems: 'center', gap: 12, padding: '6px 0'}}>
                <span className={`cmp-rank ${idx === 0 ? 'top' : ''}`}>{idx + 1}</span>
                <span className="dept-dot" style={{background: r.color, width: 10, height: 10}}/>
                <div>
                  <div style={{fontWeight: 600, fontSize: 13}}>{r.name}</div>
                  <div className="dim" style={{fontSize: 11}}>{r.lead} · {r.people}名</div>
                </div>
                <HBar value={r.recent4} max={maxPoints} color={r.color} height={10}/>
                <div className="tnum" style={{fontWeight: 700, minWidth: 60, textAlign: 'right'}}>{r.recent4}P</div>
                <Delta value={r.growth} suffix="%"/>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-head">
            <div>
              <div className="card-title">アクティブ率</div>
              <div className="card-sub">記録者 / 全人数</div>
            </div>
          </div>
          <div className="vstack" style={{gap: 14}}>
            {ranking.map(r => (
              <div key={r.id}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3}}>
                  <span style={{fontWeight: 500}}>{r.name}</span>
                  <span className="tnum"><b>{r.activePercent}%</b> <span className="dim">({r.activeCount}/{r.people})</span></span>
                </div>
                <HBar value={r.activePercent} max={100} color={r.color} height={5}/>
              </div>
            ))}
          </div>
          <div style={{marginTop: 14, padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12}}>
            <span className="dim">全社平均：</span>
            <b>{Math.round(ranking.reduce((s, r) => s + r.activePercent, 0) / ranking.length)}%</b>
            <span className="dim"> · トップ{ranking.slice().sort((a,b)=>b.activePercent-a.activePercent)[0].name}</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-head">
          <div>
            <div className="card-title">顧客価値タグ × 部門</div>
            <div className="card-sub">どの部門が、どの顧客価値に貢献しているか（直近4週）</div>
          </div>
          <div className="card-actions">
            <div className="cat-pills">
              {TAGS.map(t => (
                <span key={t.id} className="cat-pill" style={{color: t.color, borderColor: t.color + '40', background: t.color + '12'}}>
                  <span style={{width:6, height:6, borderRadius:'50%', background: t.color, display: 'inline-block'}}/>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <table className="cmp-table">
          <thead>
            <tr>
              <th>部門</th>
              <th style={{width: '40%'}}>顧客価値タグ分布</th>
              <th style={{textAlign: 'right'}}>社会貢献</th>
              <th style={{textAlign: 'right'}}>安心安全</th>
              <th style={{textAlign: 'right'}}>新しい未来</th>
              <th style={{textAlign: 'right'}}>合計</th>
            </tr>
          </thead>
          <tbody>
            {tagCompare.map(t => (
              <tr key={t.id}>
                <td style={{fontWeight: 500}}>{t.name}</td>
                <td>
                  <div className="tag-dist">
                    <div style={{width: `${t.social/t.sum*100}%`, background: TAGS[0].color}}/>
                    <div style={{width: `${t.safety/t.sum*100}%`, background: TAGS[1].color}}/>
                    <div style={{width: `${t.future/t.sum*100}%`, background: TAGS[2].color}}/>
                  </div>
                </td>
                <td style={{textAlign: 'right'}}>{t.social}P <span className="dim">({Math.round(t.social/t.sum*100)}%)</span></td>
                <td style={{textAlign: 'right'}}>{t.safety}P <span className="dim">({Math.round(t.safety/t.sum*100)}%)</span></td>
                <td style={{textAlign: 'right'}}>{t.future}P <span className="dim">({Math.round(t.future/t.sum*100)}%)</span></td>
                <td style={{textAlign: 'right', fontWeight: 600}}>{t.sum}P</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="card-head">
          <div>
            <div className="card-title">今月の注目記録</div>
            <div className="card-sub">ポイントの大小でなく、話題性・学びで経営陣がピック</div>
          </div>
        </div>
        <div className="grid-2">
          {featured.map(f => {
            const cat = window.__DASH.CATEGORIES.find(c => c.id === f.cat);
            const tag = window.__DASH.CUSTOMER_VALUE_TAGS.find(t => t.id === f.tag);
            return (
              <div key={f.id} style={{padding: 14, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
                  <Avatar name={f.person} size={28}/>
                  <div>
                    <div style={{fontSize: 12.5, fontWeight: 600}}>{f.person}</div>
                    <div className="dim" style={{fontSize: 11}}>{f.deptName}</div>
                  </div>
                  <span style={{marginLeft: 'auto', fontWeight: 700, fontSize: 14}}>+{f.pts}P</span>
                </div>
                <div style={{fontSize: 13, marginBottom: 10, lineHeight: 1.6}}>{f.text}</div>
                <div style={{display: 'flex', gap: 6}}>
                  <Tag color={cat.color}>{cat.label}</Tag>
                  <Tag color={tag.color}>{tag.label}</Tag>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

window.CompareView = CompareView;
