// バックエンド API のレスポンス型（spec.md §5 と app/schemas を反映）

export type ActivityGenre = {
  id: number;
  name: string;
  default_points: number;
  sort_order: number;
};

export type UserBrief = {
  id: string;
  name: string;
  role: string | null;
};

/** GET /api/users/me/points-by-genre */
export type GenrePointsRow = {
  activity_genre_id: number;
  activity_genre_name: string;
  sort_order: number;
  points: number;
};

export type MyPointsByGenreResponse = {
  fy: string;
  month: number;
  rows: GenrePointsRow[];
  total_points: number;
};

/** GET /api/dashboard/member-points-by-genre（課長・部長のみ） */
export type OrgMemberGenrePointsRow = {
  applicant_user_id: string;
  applicant_name: string;
  activity_genre_id: number;
  activity_genre_name: string;
  genre_sort_order: number;
  points: number;
};

export type OrgMemberPointsByGenreResponse = {
  fy: string;
  month: number;
  rows: OrgMemberGenrePointsRow[];
};

export type ApprovalRoute = {
  applicant_user_id: string;
  applicant_role: string | null;
  approval_total_steps: number;
  default_approver_user_ids: (string | null)[]; // 段数分
  candidates_per_step: UserBrief[][]; // 段数分
};

export type PointApplicationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "returned";

export type LevelKey = "daily" | "creative";
export type CategoryKey = "social" | "safety" | "future";

export type PointApplication = {
  id: string;
  application_number: string | null;
  applicant_user_id: string;
  applicant_name: string | null;
  title: string;
  // v7 2値ポイント体系
  level: LevelKey | null;
  category: CategoryKey | null;
  final_point: number | null;
  // dashboard / mypage のジャンル別内訳で pivot に使う（サーバが {level}_{category} から自動付与）
  activity_genre_id: number | null;
  activity_genre_name: string | null;
  points: number | null;
  description: string;
  approver_1_user_id: string | null;
  approver_2_user_id: string | null;
  approver_3_user_id: string | null;
  approver_1_name: string | null;
  approver_2_name: string | null;
  approver_3_name: string | null;
  approval_total_steps: number | null;
  current_approval_step: number | null;
  status: PointApplicationStatus;
  submitted_at: string | null;
  decided_at: string | null;
  returned_at: string | null;
  returned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationStatusTab = "incomplete" | "completed" | "all";

export type NotificationType =
  | "approval_request"
  | "approved"
  | "returned"
  | "withdrawn";

export type Notification = {
  id: string;
  recipient_user_id: string;
  sender_user_id: string | null;
  sender_name: string | null;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  related_application_id: string | null;
  created_at: string;
};

export type NotificationTab = "all" | "unread";

export type PointApplicationDraftIn = {
  title?: string | null;
  // v7: level + category がサーバ側の唯一の真。base_point は level で決まり、
  // 役職傾斜を掛けた final_point をサーバが算出する。
  level?: LevelKey | null;
  category?: CategoryKey | null;
  // 旧クライアント互換のため activity_genre_id も受理する（任意）。
  activity_genre_id?: number | null;
  description?: string | null;
  approver_1_user_id?: string | null;
  approver_2_user_id?: string | null;
  approver_3_user_id?: string | null;
};
