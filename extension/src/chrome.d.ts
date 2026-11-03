// Only the extension APIs used here. No content scripts or external messaging.
declare const chrome: {
  runtime: {
    id: string;
    sendMessage: (message: unknown) => Promise<unknown>;
    onMessage: {
      addListener: (listener: (message: unknown, sender: { id?: string; url?: string }, reply: (response: unknown) => void) => boolean | undefined) => void;
      removeListener: (listener: (message: unknown, sender: { id?: string; url?: string }, reply: (response: unknown) => void) => boolean | undefined) => void;
    };
  };
};
