import type { EngramType } from "@/lib/api";

export type DemoSendDetail = {
  text: string;
  signal?: AbortSignal;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type DemoReloadDetail = {
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

const demoBus = new EventTarget();
let sendListenerCount = 0;
let reloadListenerCount = 0;
let graphRefreshListenerCount = 0;
let selectEngramListenerCount = 0;
let closeInspectorListenerCount = 0;

export function onDemoSend(handler: DemoSendHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DemoSendDetail>).detail);
  };

  sendListenerCount += 1;
  demoBus.addEventListener("demo:send", listener);

  return () => {
    sendListenerCount = Math.max(0, sendListenerCount - 1);
    demoBus.removeEventListener("demo:send", listener);
  };
}

export function onDemoReload(handler: DemoReloadHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DemoReloadDetail>).detail);
  };

  reloadListenerCount += 1;
  demoBus.addEventListener("demo:reload", listener);

  return () => {
    reloadListenerCount = Math.max(0, reloadListenerCount - 1);
    demoBus.removeEventListener("demo:reload", listener);
  };
}

export function onDemoGraphRefresh(handler: DemoGraphRefreshHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DemoGraphRefreshDetail>).detail);
  };

  graphRefreshListenerCount += 1;
  demoBus.addEventListener("demo:graph-refresh", listener);

  return () => {
    graphRefreshListenerCount = Math.max(0, graphRefreshListenerCount - 1);
    demoBus.removeEventListener("demo:graph-refresh", listener);
  };
}

export function onDemoSelectEngram(handler: DemoSelectEngramHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DemoSelectEngramDetail>).detail);
  };

  selectEngramListenerCount += 1;
  demoBus.addEventListener("demo:select-engram", listener);

  return () => {
    selectEngramListenerCount = Math.max(0, selectEngramListenerCount - 1);
    demoBus.removeEventListener("demo:select-engram", listener);
  };
}

export function onDemoCloseInspector(handler: DemoCloseInspectorHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DemoCloseInspectorDetail>).detail);
  };

  closeInspectorListenerCount += 1;
  demoBus.addEventListener("demo:close-inspector", listener);

  return () => {
    closeInspectorListenerCount = Math.max(0, closeInspectorListenerCount - 1);
    demoBus.removeEventListener("demo:close-inspector", listener);
  };
}

export function hasDemoSendListener() {
  return sendListenerCount > 0;
}

export function hasDemoGraphRefreshListener() {
  return graphRefreshListenerCount > 0;
}

export function hasDemoSelectEngramListener() {
  return selectEngramListenerCount > 0;
}

export function sendDemoMessage(text: string, signal?: AbortSignal) {
  if (!sendListenerCount) {
    return Promise.reject(new Error("Session page is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    demoBus.dispatchEvent(
      new CustomEvent<DemoSendDetail>("demo:send", {
        detail: { text, signal, resolve, reject }
      })
    );
  });
}

export function refreshDemoGraph() {
  if (!graphRefreshListenerCount) {
    return Promise.reject(new Error("Graph view is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    demoBus.dispatchEvent(
      new CustomEvent<DemoGraphRefreshDetail>("demo:graph-refresh", {
        detail: { resolve, reject }
      })
    );
  });
}

export function selectDemoEngram(criteria: DemoEngramCriteria) {
  if (!selectEngramListenerCount) {
    return Promise.reject(new Error("Memory inspector is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    demoBus.dispatchEvent(
      new CustomEvent<DemoSelectEngramDetail>("demo:select-engram", {
        detail: { ...criteria, resolve, reject }
      })
    );
  });
}

export function closeDemoInspector() {
  if (!closeInspectorListenerCount) {
    return Promise.reject(new Error("Memory inspector is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    demoBus.dispatchEvent(
      new CustomEvent<DemoCloseInspectorDetail>("demo:close-inspector", {
        detail: { resolve, reject }
      })
    );
  });
}

export function reloadDemoSession() {
  if (!reloadListenerCount) {
    return Promise.reject(new Error("Session page is not ready."));
  }

  return new Promise<void>((resolve, reject) => {
    demoBus.dispatchEvent(
      new CustomEvent<DemoReloadDetail>("demo:reload", {
        detail: { resolve, reject }
      })
    );
  });
}
