export const logger = (type: 'info' | 'error' | 'debug', ...args: any[]) => console.log(new Date().toISOString(), `[${type}]`, ...args);

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => value !== null && value !== undefined;
