export * as cmd from './cmd';

let audibleLocked = false;

export const isLocked = () => audibleLocked;
export const lock = () => (audibleLocked = true);
export const unlock = () => (audibleLocked = false);
