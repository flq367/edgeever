type StartupMark = "index-ready" | "workspace-first-commit" | "workspace-data-ready" | "workspace-interactive";

type NativeStartupTiming = {
  endTime?: number | null;
  executeJavaScriptBundleEntryPointStart?: number | null;
  initializeRuntimeStart?: number | null;
  startTime?: number | null;
};

const marks = new Map<StartupMark, number>();
let latestEditorStartupMs: number | null = null;

export const markStartup = (name: StartupMark) => {
  if (!marks.has(name)) {
    marks.set(name, performance.now());
  }
};

export const recordEditorStartup = (durationMs: number) => {
  if (Number.isFinite(durationMs) && durationMs >= 0) {
    latestEditorStartupMs = durationMs;
  }
};

export const getStartupPerformanceItems = () => {
  const nativeTiming = (performance as Performance & { rnStartupTiming?: NativeStartupTiming }).rnStartupTiming;
  const nativeStart = nativeTiming?.startTime ?? 0;
  const duration = (end?: number | null, start?: number | null) =>
    typeof end === "number" && typeof start === "number" ? `${Math.max(0, end - start).toFixed(0)} ms` : "暂不可用";
  const sinceNativeStart = (name: StartupMark) => {
    const value = marks.get(name);
    return typeof value === "number" ? `${Math.max(0, value - nativeStart).toFixed(0)} ms` : "尚未记录";
  };

  return [
    { label: "原生运行时启动", value: duration(nativeTiming?.endTime, nativeTiming?.startTime) },
    { label: "启动至 JS 执行", value: duration(nativeTiming?.executeJavaScriptBundleEntryPointStart, nativeTiming?.startTime) },
    { label: "启动至会话/缓存就绪", value: sinceNativeStart("index-ready") },
    { label: "启动至工作区首帧", value: sinceNativeStart("workspace-first-commit") },
    { label: "启动至列表数据就绪", value: sinceNativeStart("workspace-data-ready") },
    { label: "启动至交互空闲", value: sinceNativeStart("workspace-interactive") },
    { label: "最近一次本地编辑器启动", value: latestEditorStartupMs === null ? "尚未记录" : `${latestEditorStartupMs.toFixed(0)} ms` },
  ];
};
