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
  project_id: string;
  name: string;
  email: string | null;
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
