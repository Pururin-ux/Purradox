// Подавляет известный шум Chrome: DataCloneError из PerformanceServerTiming
// во всплывающих error-событиях. Вынесен в отдельный файл, чтобы страница
// жила под строгим Content-Security-Policy без inline-скриптов.
window.addEventListener(
  "error",
  function (e) {
    if (
      e.error instanceof DOMException &&
      e.error.name === "DataCloneError" &&
      e.message &&
      e.message.includes("PerformanceServerTiming")
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true,
);
