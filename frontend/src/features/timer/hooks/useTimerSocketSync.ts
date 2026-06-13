// The backend does not currently expose a timer websocket endpoint.
// Keep this hook as a no-op so the UI only relies on real HTTP APIs.
export const useTimerSocketSync = () => {};
