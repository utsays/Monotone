export type TaskState =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "done";

export type Project = {
  id: string;
  name: string;
  color: string | null;
  archived?: boolean;
  position?: number | null;
  created_at: string;
};

export type Section = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Member = {
  id: string;
  project_id: string | null;
  name: string;
  email: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  user_id: string | null;
  active: boolean;
  role: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  state: TaskState;
  labels: string[];
  assignee_id: string | null;
  /** Full set of assignees (from the task_assignees join table). Includes assignee_id. */
  assignee_ids?: string[];
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: string;
  // legacy (still in DB, unused by current UI)
  assignee?: string | null;
  estimate?: number | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
};

export type TaskComment = {
  id: string;
  task_id: string;
  member_id: string | null;
  body: string;
  created_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: string;
};
