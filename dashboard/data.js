// ========================================
// 人的資本ダッシュボード - モックデータ
// ばーはんたーず / 西部ガスHD
// ========================================

// 部門マスタ（西部ガス風の実組織名）
const DEPARTMENTS = [
  { id: 'pipeline',  name: '導管部',           short: '導管', lead: '中村 達也',   people: 42, color: '#6366F1' },
  { id: 'sales',     name: '営業部',           short: '営業', lead: '岡本 千絵',   people: 58, color: '#10B981' },
  { id: 'customer',  name: 'お客さまセンター', short: 'CS',   lead: '田辺 美和',   people: 34, color: '#F59E0B' },
  { id: 'power',     name: '電力事業部',       short: '電力', lead: '井上 健司',   people: 26, color: '#EF4444' },
  { id: 'corp',      name: 'コーポレート',     short: 'コー', lead: '坂井 誠一',   people: 31, color: '#8B5CF6' },
  { id: 'dx',        name: 'DX推進部',         short: 'DX',   lead: '今長谷 大助', people: 18, color: '#06B6D4' },
];

const CUSTOMER_VALUE_TAGS = [
  { id: 'social', label: '社会貢献',     color: '#10B981', desc: 'CO2削減・地域共生・SDGs文脈の取り組み' },
  { id: 'safety', label: '安心安全',     color: '#6366F1', desc: '保安・インフラ堅牢性・BCP強化' },
  { id: 'future', label: '新しい未来',   color: '#F59E0B', desc: '新規事業・DX・イノベーション挑戦' },
];

const CATEGORIES = [
  { id: 'challenge', label: '挑戦',    color: '#6366F1', short: 'やったことがないことを試す', example: '料金プランのA/Bテストを48時間で設計する' },
  { id: 'learn',     label: '失敗・学び', color: '#F59E0B', short: 'うまくいかなかった経験', example: '訪問説明、想定の半分しか反応がなく仮説を再構築' },
  { id: 'help',      label: '助け合い', color: '#10B981', short: '他部門・同僚への支援', example: 'DX推進部の要件整理に2h参加。現場用語を解説' },
  { id: 'onone',     label: '1on1',     color: '#8B5CF6', short: 'メンバーとの対話・面談', example: '新任メンバーとの初回1on1。オンボ課題を3点整理' },
];

// 疑似ランダム（seed付き）で部門ごとのトレンド生成
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 部門別データ（好調 vs 苦戦 のデータセット）
function generateDeptData(datasetMode = 'mixed') {
  const result = {};
  DEPARTMENTS.forEach((d, idx) => {
    const rnd = seeded(idx * 17 + 3);
    let bias = 0.5;
    if (datasetMode === 'boom')    bias = 0.75 + rnd() * 0.2;
    else if (datasetMode === 'struggle') bias = 0.15 + rnd() * 0.2;
    else bias = 0.25 + rnd() * 0.65; // mixed

    // 導管部は安心安全寄り、営業部は社会貢献、お客さまセンターは未来
    const tagBias = {
      pipeline: [0.2, 0.6, 0.2],
      sales:    [0.5, 0.2, 0.3],
      customer: [0.3, 0.3, 0.4],
      power:    [0.4, 0.3, 0.3],
      corp:     [0.3, 0.4, 0.3],
      dx:       [0.2, 0.1, 0.7],
    }[d.id];

    // 過去12週のポイント推移
    const weekly = [];
    let cum = 0;
    for (let w = 0; w < 12; w++) {
      const base = bias * 60 + rnd() * 40;
      const challenge = Math.round(base * 0.4);
      const learn     = Math.round(base * 0.15);
      const help      = Math.round(base * 0.25);
      const onone     = Math.round(base * 0.2);
      const total = challenge + learn + help + onone;
      cum += total;
      weekly.push({
        week: `W${w + 1}`,
        weekLabel: `${w + 1}週`,
        challenge, learn, help, onone,
        total, cum,
        social: Math.round(total * tagBias[0] + (rnd() - 0.5) * 5),
        safety: Math.round(total * tagBias[1] + (rnd() - 0.5) * 5),
        future: Math.round(total * tagBias[2] + (rnd() - 0.5) * 5),
      });
    }

    // エンゲージメントスコア（年次 → 月次擬似）
    const engagement = [];
    for (let m = 0; m < 6; m++) {
      engagement.push({
        month: `${m + 1}月`,
        score: Math.round((bias * 30 + 55 + (rnd() - 0.5) * 6) * 10) / 10,
      });
    }

    // アクティブ率
    const activeCount = Math.round(d.people * (bias * 0.6 + 0.3));

    result[d.id] = {
      weekly,
      engagement,
      activeCount,
      activePercent: Math.round(activeCount / d.people * 100),
      totalPoints: cum,
      monthlyTarget: Math.round(120 * (0.8 + rnd() * 0.4)),
      monthlyActual: Math.round(120 * bias * (0.8 + rnd() * 0.4)),
      onone: {
        thisWeek: Math.round(bias * 15 + rnd() * 5),
        lastWeek: Math.round(bias * 14 + rnd() * 5),
        target: Math.round(d.people * 0.7),
      },
      pending: Math.round(rnd() * 8),
      bias,
    };
  });
  return result;
}

// メンバーダミー
const MEMBER_NAMES = [
  '佐藤 翔太', '鈴木 結衣', '高橋 健', '田中 美咲', '渡辺 拓海',
  '伊藤 杏奈', '山本 陽平', '中村 彩花', '小林 直樹', '加藤 優子',
  '吉田 竜也', '山田 朋美', '佐々木 翼', '山口 明日香', '松本 大輔',
  '井上 綾香', '木村 慎太郎', '林 沙織', '斎藤 康平', '清水 萌',
  '森 隼人', '池田 ゆかり', '橋本 諒', '石川 恵', '前田 翔',
];

function generateMembers(datasetMode = 'mixed') {
  const byDept = {};
  DEPARTMENTS.forEach((d, idx) => {
    const rnd = seeded(idx * 31 + 7);
    const members = [];
    const count = Math.min(d.people, 12); // 表示用は12人まで
    for (let i = 0; i < count; i++) {
      const nameIdx = (idx * 12 + i) % MEMBER_NAMES.length;
      let activity = rnd();
      if (datasetMode === 'boom')    activity = 0.5 + rnd() * 0.5;
      if (datasetMode === 'struggle') activity = rnd() * 0.3;
      members.push({
        id: `${d.id}-${i}`,
        deptId: d.id,
        name: MEMBER_NAMES[nameIdx],
        role: i === 0 ? '主任' : i === 1 ? 'リーダー' : '一般',
        points: Math.round(activity * 80 + 10),
        activities: Math.round(activity * 12 + 1),
        lastActive: ['今日', '昨日', '2日前', '3日前', '5日前', '1週間前'][Math.floor(rnd() * 6)],
        engagement: Math.round(55 + activity * 35),
        challenges: Math.round(activity * 5),
        helps: Math.round(activity * 4),
        learns: Math.round(activity * 2),
      });
    }
    byDept[d.id] = members.sort((a, b) => b.points - a.points);
  });
  return byDept;
}

// 活動フィード（リアルタイム風）
const FEED_TEMPLATES = [
  { cat: 'challenge', tag: 'future', text: '新規料金プランのA/Bテスト設計を48時間挑戦として宣言', pts: 5 },
  { cat: 'challenge', tag: 'safety', text: '古い保安点検チェックリストをデジタル化するPoCを開始', pts: 8 },
  { cat: 'help',      tag: 'social', text: '他部門の地域イベント運営を週末ヘルプ。メンバー3名で支援', pts: 4 },
  { cat: 'learn',     tag: 'future', text: '顧客アンケート分析の初期モデル、精度が出ず。仮説再構築で再挑戦', pts: 3 },
  { cat: 'onone',     tag: 'safety', text: '新任メンバーとの初回1on1実施。オンボ課題を3点整理', pts: 2 },
  { cat: 'challenge', tag: 'social', text: '水素ステーション視察の社内勉強会を企画・実施', pts: 6 },
  { cat: 'help',      tag: 'safety', text: '導管部の緊急対応マニュアル改訂に営業部視点でレビュー参加', pts: 3 },
  { cat: 'challenge', tag: 'future', text: 'お客さまセンターの問合せログをLLMで自動分類する試作', pts: 7 },
  { cat: 'learn',     tag: 'social', text: '地域共生イベントの集客が想定の6割。告知チャネル再設計', pts: 2 },
  { cat: 'onone',     tag: 'future', text: 'キャリア面談で部下のストレッチゴールを一緒に言語化', pts: 3 },
  { cat: 'help',      tag: 'future', text: 'DX推進部の要件整理ヒアリングに2h参加。現場用語を解説', pts: 3 },
  { cat: 'challenge', tag: 'safety', text: '夜間対応の属人化解消、当番制＋チェックリスト運用を起案', pts: 6 },
];

function generateFeed(datasetMode = 'mixed', count = 40) {
  const feed = [];
  const rnd = seeded(99);
  for (let i = 0; i < count; i++) {
    const tpl = FEED_TEMPLATES[Math.floor(rnd() * FEED_TEMPLATES.length)];
    const dept = DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)];
    const person = MEMBER_NAMES[Math.floor(rnd() * MEMBER_NAMES.length)];
    const mins = Math.floor(rnd() * 240); // 過去4時間以内
    feed.push({
      id: `f-${i}`,
      ...tpl,
      deptId: dept.id,
      deptName: dept.name,
      person,
      timeAgo: mins < 1 ? 'たった今' :
               mins < 60 ? `${mins}分前` :
               `${Math.floor(mins / 60)}時間前`,
      minsAgo: mins,
      approved: rnd() > 0.25,
    });
  }
  return feed.sort((a, b) => a.minsAgo - b.minsAgo);
}

// 全社サマリー
function generateCompanySummary(datasetMode) {
  const bias = datasetMode === 'boom' ? 0.85 : datasetMode === 'struggle' ? 0.25 : 0.55;
  const currentP = Math.round(6000 * bias * 0.65);
  return {
    currentP,
    targetP: 6000,
    nextTargetP: 10000,
    progress: currentP / 6000,
    yoy: datasetMode === 'struggle' ? -8 : datasetMode === 'boom' ? 34 : 12,
    totalPeople: DEPARTMENTS.reduce((s, d) => s + d.people, 0),
    activeTotal: Math.round(DEPARTMENTS.reduce((s, d) => s + d.people, 0) * (bias * 0.5 + 0.3)),
  };
}

// 因果チェーン（4層）
const CAUSAL_CHAIN = {
  investment: {
    label: '投資（インプット）',
    sub: '人件費引き上げ・研修・制度改定・1on1推進',
    cadence: '年次',
    metrics: [
      { key: '人件費増加率',   value: '+4.2%',   note: '2026年度改定' },
      { key: '研修投資',        value: '¥2.8億',  note: '全社研修予算' },
      { key: '制度改定件数',   value: '6件',     note: '評価・育成制度' },
    ],
  },
  behavior: {
    label: '行動変容',
    sub: '挑戦記録・1on1実施・助け合い・顧客価値タグ',
    cadence: '日次〜週次',
    metrics: [
      { key: '週次ポイント',    value: '420P',  note: '全社直近週', delta: '+12%' },
      { key: '1on1実施率',       value: '68%',   note: '対象者ベース', delta: '+5pt' },
      { key: '助け合い件数',   value: '37件',  note: '今週', delta: '+8' },
    ],
  },
  leading: {
    label: '先行指標',
    sub: 'エンゲージ・アクティブ率・顧客価値タグ比率',
    cadence: '月次',
    metrics: [
      { key: 'エンゲージメント', value: '72.4',  note: '100点満点', delta: '+1.8' },
      { key: 'アクティブ率',     value: '54%',   note: '記録者/全社', delta: '+6pt' },
      { key: '未来タグ比率',     value: '28%',   note: '顧客価値タグ', delta: '+3pt' },
    ],
  },
  lagging: {
    label: '遅行指標（経営成果）',
    sub: '売上・部門別ROIC・顧客満足度・定着率',
    cadence: '四半期〜年次',
    metrics: [
      { key: '売上',             value: '—',     note: '財務連携待ち', pending: true },
      { key: '部門別ROIC',       value: '—',     note: '財務連携待ち', pending: true },
      { key: '定着率',           value: '98.1%', note: '年次', delta: '+0.3pt' },
    ],
  },
};

window.__DASH = {
  DEPARTMENTS,
  CUSTOMER_VALUE_TAGS,
  CATEGORIES,
  MEMBER_NAMES,
  CAUSAL_CHAIN,
  generateDeptData,
  generateMembers,
  generateFeed,
  generateCompanySummary,
};
