export const resultOpacity = (elapsed: number) =>
  Math.max(0, Math.min(1, (elapsed - 2) / 3));
