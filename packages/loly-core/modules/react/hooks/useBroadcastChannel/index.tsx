import React, { useEffect, useState } from "react";

export const useBroadcastChannel = (channelName: string) => {
  const [message, setMessage] = useState(null);
  const channel = new BroadcastChannel(channelName);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      setMessage(event.data);
    };

    channel.onmessage = handleMessage;

    // Clean up the channel when the component unmounts
    return () => {
      channel.close();
    };
  }, [channel]);

  const sendMessage = (msg: unknown) => {
    channel.postMessage(msg);
  };

  return { message, sendMessage };
};
