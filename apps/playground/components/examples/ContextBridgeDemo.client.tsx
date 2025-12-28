import { createContext, useContext, useMemo, useState } from "react";

type BridgeContextValue = {
  serverMessage: string;
  clientMessage: string;
  setClientMessage: (msg: string) => void;
};

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function ContextBridgeDemo({ serverMessage }: { serverMessage: string }) {
  const [clientMessage, setClientMessage] = useState("Client message (editable)");

  const value = useMemo(
    () => ({ serverMessage, clientMessage, setClientMessage }),
    [serverMessage, clientMessage]
  );

  return (
    <BridgeContext.Provider value={value}>
      <div className="space-y-4">
        <ServerConsumer />
        <ClientUpdater />
      </div>
    </BridgeContext.Provider>
  );
}

function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) {
    throw new Error("Bridge context missing");
  }
  return ctx;
}

function ServerConsumer() {
  const { serverMessage } = useBridge();
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="font-medium">Server-provided data</div>
      <p className="text-sm text-muted-foreground">{serverMessage}</p>
    </div>
  );
}

function ClientUpdater() {
  const { clientMessage, setClientMessage } = useBridge();
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="font-medium">Client-provided data</div>
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        value={clientMessage}
        onChange={(e) => setClientMessage(e.target.value)}
      />
      <p className="text-sm text-muted-foreground">Live value: {clientMessage}</p>
    </div>
  );
}

