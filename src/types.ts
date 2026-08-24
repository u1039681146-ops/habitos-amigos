export type Profile = {
  id: string;
  name: string;
  hasPin: boolean;
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
  hasPin: boolean;
  days: DayStat[];
  streak: number;
  today: DayStat;
};

export type DashboardData = {
  dateList: string[];
  users: DashboardUser[];
};

export type ChatMessage = {
  id: string;
  userId: string;
  text: string;
  imageId?: string;
  createdAt: string;
};
