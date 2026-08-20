import * as signalR from "@microsoft/signalr";

/**
 * Live results over SignalR.
 *
 * The hub is hosted by ResultManage and published through the API gateway, so
 * the browser only ever talks to the gateway:
 *
 *   Hub URL:          {gateway}/hubs/poll
 *   Client -> Server: connection.invoke("JoinPoll", code)
 *                     connection.invoke("LeavePoll", code)
 *   Server -> Client: connection.on("ResultsUpdated", payload)
 *
 * The server sends the same object the results endpoint returns:
 *   { code, question, status, totalVotes, options: [{ index, text, votes, percentage }] }
 *
 * It is mapped below into the { code, counts, totalVotes, status } shape the
 * results page already works with, so the view needs no changes.
 *
 * VITE_API_BASE_URL ends in /api, and the hub sits at the gateway root, so the
 * /api suffix is stripped. Override with VITE_HUB_BASE_URL if that ever changes.
 */
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const hubBase = import.meta.env.VITE_HUB_BASE_URL || apiBase.replace(/\/api\/?$/, "");
const HUB_URL = `${hubBase}/hubs/poll`;

/** Turns the backend's results object into what the results page expects. */
function toResultsPayload(payload) {
  const options = [...(payload.options ?? [])].sort((a, b) => a.index - b.index);
  return {
    code: payload.code,
    counts: options.map((o) => o.votes ?? 0),
    totalVotes: payload.totalVotes,
    status: String(payload.status ?? "").toLowerCase(),
  };
}

/**
 * Opens a live connection for a single poll's results.
 *
 * @param {string} code - poll code to watch
 * @param {object} handlers
 * @param {(payload: {code:string, counts:number[], totalVotes:number, status:string}) => void} handlers.onResults
 * @param {(state: "connecting"|"live"|"reconnecting"|"offline") => void} handlers.onStateChange
 * @returns {{ ready: Promise<void>, stop: () => Promise<void> }}
 */
export function watchPollResults(code, { onResults, onStateChange } = {}) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  const emitState = (state) => onStateChange && onStateChange(state);

  connection.on("ResultsUpdated", (payload) => {
    if (!payload || payload.code !== code) return;
    onResults && onResults(toResultsPayload(payload));
  });

  connection.onreconnecting(() => emitState("reconnecting"));
  connection.onreconnected(() => {
    emitState("live");
    // Group membership is lost across a reconnect, so join again. Render's
    // free tier drops connections when a service sleeps, which makes this
    // more than a theoretical case.
    connection.invoke("JoinPoll", code).catch(() => {});
  });
  connection.onclose(() => emitState("offline"));

  emitState("connecting");

  const startPromise = connection
    .start()
    .then(() => connection.invoke("JoinPoll", code))
    .then(() => emitState("live"))
    .catch(() => {
      // Live updates are an enhancement, not a hard requirement — the results
      // page still works from the initial REST fetch if the socket never
      // connects (e.g. the service is still waking up).
      emitState("offline");
    });

  return {
    ready: startPromise,
    stop: () =>
      connection
        .invoke("LeavePoll", code)
        .catch(() => {})
        .then(() => connection.stop()),
  };
}
