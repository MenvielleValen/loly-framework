import React, { useEffect, useState, useRef, useCallback } from "react";

export const useBroadcastChannel = (channelName: string) => {
  const [message, setMessage] = useState(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Create channel only once, inside useEffect
    if (!channelRef.current && typeof window !== "undefined") {
      channelRef.current = new BroadcastChannel(channelName);
    }

    const channel = channelRef.current;
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      setMessage(event.data);
    };

    channel.onmessage = handleMessage;

    // Clean up the channel when the component unmounts
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [channelName]);

  const sendMessage = useCallback((msg: unknown) => {
    if (channelRef.current) {
      channelRef.current.postMessage(msg);
    }
  }, []);

  return { message, sendMessage };
};
