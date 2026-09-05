export class ProviderTaskFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderTaskFailedError';
  }
}

export class ProviderTaskPersistenceError extends Error {
  readonly taskId: string;
  readonly persistenceCause: unknown;

  constructor(taskId: string, cause: unknown) {
    super('材料解析远端任务 ID 持久化失败');
    this.name = 'ProviderTaskPersistenceError';
    this.taskId = taskId;
    this.persistenceCause = cause;
  }
}
