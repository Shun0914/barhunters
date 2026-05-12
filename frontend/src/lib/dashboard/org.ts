// 西部ガスグループ 組織マスタ（v3 モック用）。
// 実際の組織体系は人事DB連携で取得する想定 /* TODO: マスタ連携 */。

import type { Headquarters, Role } from "./types";

export const HD_DEPARTMENTS = [
  "秘書部",
  "監査部",
  "経営戦略部",
  "グループガバナンス部",
  "事業開発部",
  "総務部",
  "財務戦略部",
  "人財戦略部",
  "広報部",
  "IR推進室",
  "デジタルマーケティング部",
  "エネルギー統括部",
  "不動産統括部",
] as const;

export const SAIBU_HQ: Record<
  Headquarters,
  { label: string; departments: readonly string[] }
> = {
  CORPORATE: {
    label: "直属・コーポレート",
    departments: [
      "秘書部",
      "監査部",
      "経営企画部",
      "総務部",
      "経理部",
      "人事部",
      "広報部",
      "資材部",
      "東京事務所",
    ],
  },
  ENERGY: {
    label: "エネルギー需給本部",
    departments: [
      "LNG事業部",
      "最適化推進室",
      "電力事業推進部",
      "電力ソリューション室",
      "カーボンニュートラル推進部",
      "生産部",
      "基地エンジニアリング部",
    ],
  },
  SUPPLY: {
    label: "供給本部",
    departments: [
      "供給管理部",
      "中央指令部",
      "防災保安部",
      "設備技術部",
      "福岡供給部",
      "北九州供給部",
      "熊本供給部",
      "長崎供給部",
    ],
  },
  SALES: {
    label: "営業本部",
    departments: [
      "営業計画部",
      "お客さまコミュニケーション部",
      "福岡リビング営業部",
      "福岡都市開発部",
      "都市リビング開発部",
      "北九州事業総括部",
      "北九州リビング営業部",
      "北九州都市開発部",
      "広域産業エネルギー開発部",
      "北九州産業エネルギー開発部",
      "LNG燃料転換推進部",
    ],
  },
};

export const ROLES: readonly Role[] = [
  "役員",
  "部長",
  "課長",
  "係長",
  "一般社員",
] as const;
