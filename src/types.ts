export type Profile = {
  id: string;
  name: string;
  hasPasskey: boolean;
};

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  createdBy?: string;
};

export type DayStat = {
  date: string;
  completed: number;
  total: number;
  pct: number;
};

export type DashboardUser = {
  id: string;
  name: string;
  hasPasskey: boolean;
  days: DayStat[];
  streak: number;
  today: DayStat;
};

export type DashboardData = {
  dateList: string[];
  habits: Habit[];
  users: DashboardUser[];
};

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
};
