export function afterPaint(callback) {
  let timer;
  // Let the frame render before running work that can read layout.
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(callback, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
}
