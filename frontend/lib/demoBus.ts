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

type DemoSendHandler = (detail: DemoSendDetail) => void;
type DemoReloadHandler = (detail: DemoReloadDetail) => void;

const demoBus = new EventTarget();
let sendListenerCount = 0;
let reloadListenerCount = 0;

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

export function hasDemoSendListener() {
  return sendListenerCount > 0;
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
