import type { EngramType, SessionRecord } from "@/lib/api";

export type DemoSendDetail = {
  text: string;
  signal?: AbortSignal;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type DemoReloadDetail = {
  session?: SessionRecord;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type DemoGraphRefreshDetail = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type DemoEngramCriteria = {
  type?: EngramType;
  contains?: string;
};

export type DemoSelectEngramDetail = DemoEngramCriteria & {
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type DemoCloseInspectorDetail = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

type DemoSendHandler = (detail: DemoSendDetail) => void;
type DemoReloadHandler = (detail: DemoReloadDetail) => void;
type DemoGraphRefreshHandler = (detail: DemoGraphRefreshDetail) => void;
type DemoSelectEngramHandler = (detail: DemoSelectEngramDetail) => void;
type DemoCloseInspectorHandler = (detail: DemoCloseInspectorDetail) => void;

let sendHandler: DemoSendHandler | null = null;
let reloadHandler: DemoReloadHandler | null = null;
let graphRefreshHandler: DemoGraphRefreshHandler | null = null;
let selectEngramHandler: DemoSelectEngramHandler | null = null;
let closeInspectorHandler: DemoCloseInspectorHandler | null = null;

export function onDemoSend(handler: DemoSendHandler) {
  sendHandler = handler;

  return () => {
    if (sendHandler === handler) sendHandler = null;
  };
}

export function onDemoReload(handler: DemoReloadHandler) {
  reloadHandler = handler;

  return () => {
    if (reloadHandler === handler) reloadHandler = null;
  };
}

export function onDemoGraphRefresh(handler: DemoGraphRefreshHandler) {
  graphRefreshHandler = handler;

  return () => {
    if (graphRefreshHandler === handler) graphRefreshHandler = null;
  };
}

export function onDemoSelectEngram(handler: DemoSelectEngramHandler) {
  selectEngramHandler = handler;

  return () => {
    if (selectEngramHandler === handler) selectEngramHandler = null;
  };
}

export function onDemoCloseInspector(handler: DemoCloseInspectorHandler) {
  closeInspectorHandler = handler;

  return () => {
    if (closeInspectorHandler === handler) closeInspectorHandler = null;
  };
}

export function hasDemoSendListener() {
  return Boolean(sendHandler);
}

export function hasDemoGraphRefreshListener() {
  return Boolean(graphRefreshHandler);
}

export function hasDemoSelectEngramListener() {
  return Boolean(selectEngramHandler);
}

export function sendDemoMessage(text: string, signal?: AbortSignal) {
  if (!sendHandler) {
    return Promise.reject(new Error("Session page is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    sendHandler?.({ text, signal, resolve, reject });
  });
}

export function refreshDemoGraph() {
  if (!graphRefreshHandler) {
    return Promise.reject(new Error("Graph view is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    graphRefreshHandler?.({ resolve, reject });
  });
}

export function selectDemoEngram(criteria: DemoEngramCriteria) {
  if (!selectEngramHandler) {
    return Promise.reject(new Error("Memory inspector is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    selectEngramHandler?.({ ...criteria, resolve, reject });
  });
}

export function closeDemoInspector() {
  if (!closeInspectorHandler) {
    return Promise.reject(new Error("Memory inspector is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    closeInspectorHandler?.({ resolve, reject });
  });
}

export function reloadDemoSession(session?: SessionRecord) {
  if (!reloadHandler) {
    return Promise.reject(new Error("Session page is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    reloadHandler?.({ session, resolve, reject });
  });
}
