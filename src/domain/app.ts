export type AppStatus = 'running' | 'stopped' | 'deleted';

export type AppRecord = {
  readonly id: string;
  readonly name: string;
  readonly prompt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: AppStatus;
  readonly url: string;
};

export type AppRow = {
  readonly id: string;
  readonly name: string;
  readonly prompt: string;
  readonly code: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly status: AppStatus;
};

export type GeneratedApp = {
  readonly name: string;
  readonly code: string;
};
