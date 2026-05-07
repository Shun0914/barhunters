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

export type PointApplication = {
  id: string;
  application_number: string | null;
  applicant_user_id: string;
  applicant_name: string | null;
  title: string;
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
  activity_genre_id?: number | null;
  description?: string | null;
  approver_1_user_id?: string | null;
  approver_2_user_id?: string | null;
  approver_3_user_id?: string | null;
};
