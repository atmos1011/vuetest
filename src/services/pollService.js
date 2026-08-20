import http from "./http";
import { getVoterToken } from "../utils/voterToken";
import { rememberCreatorToken, getCreatorToken } from "../utils/creatorToken";

/**
 * Poll API — talks to the ASP.NET Core backend through the Ocelot API gateway.
 *
 * The gateway publishes the REST paths from the assignment brief:
 *   POST   /polls
 *   GET    /polls/{code}
 *   POST   /polls/{code}/vote
 *   GET    /polls/{code}/results
 *   POST   /polls/{code}/close
 *
 * Behind those paths sit three services (PollManage, VoteManage, ResultManage),
 * but nothing in this app needs to know that.
 *
 * The real API's shapes differ slightly from the ones the components were built
 * against, so the mapping happens here and the views stay unchanged:
 *
 *   backend                          -> app
 *   options: [{ index, text }]       -> options: ["Tabs", "Spaces"]
 *   status:  "Open" | "Closed"       -> status:  "open" | "closed"
 *   options: [{ ..., votes }]        -> counts:  [3, 1]
 *
 * Two headers carry identity, both plain strings kept in localStorage:
 *   X-Voter-Token   - which browser is voting (one vote per poll)
 *   X-Creator-Token - proves you made the poll, needed to close it
 */

/** "Open" -> "open", so the existing components' comparisons keep working. */
function toStatus(backendStatus) {
  return String(backendStatus ?? "").toLowerCase();
}

/** [{ index, text }] -> ["Tabs", "Spaces"], ordered by index. */
function toOptionLabels(options = []) {
  return [...options].sort((a, b) => a.index - b.index).map((o) => o.text);
}

/** [{ index, votes }] -> [3, 1], ordered by index. */
function toCounts(options = []) {
  return [...options].sort((a, b) => a.index - b.index).map((o) => o.votes ?? 0);
}

function toPoll(data) {
  return {
    code: data.code,
    question: data.question,
    options: toOptionLabels(data.options),
    status: toStatus(data.status),
    createdAt: data.createdAt,
    closedAt: data.closedAt,
    hasVotes: data.hasVotes,
  };
}

export function createPoll({ question, options }) {
  return http.post("/polls", { question, options }).then((res) => {
    const data = res.data;

    // The creator token comes back exactly once, on creation. Keep it or the
    // poll can never be closed from this browser.
    if (data.creatorToken) {
      rememberCreatorToken(data.code, data.creatorToken);
    }

    return { ...toPoll(data), shareUrl: data.shareUrl };
  });
}

export function getPoll(code) {
  return http.get(`/polls/${code}`).then((res) => toPoll(res.data));
}

export function submitVote(code, { optionIndex } = {}) {
  return http
    .post(
      `/polls/${code}/vote`,
      { optionIndex },
      // The backend reads the voter from this header, not from the body.
      { headers: { "X-Voter-Token": getVoterToken() } }
    )
    .then((res) => res.data);
}

export function getResults(code) {
  return http.get(`/polls/${code}/results`).then((res) => {
    const data = res.data;
    return {
      code: data.code,
      question: data.question,
      options: toOptionLabels(data.options),
      counts: toCounts(data.options),
      totalVotes: data.totalVotes,
      status: toStatus(data.status),
    };
  });
}

/** True when this browser created the poll, so the UI can offer a Close button. */
export function isPollCreator(code) {
  return Boolean(getCreatorToken(code));
}

/** Closes the poll. Only works in the browser that created it. */
export function closePoll(code) {
  const creatorToken = getCreatorToken(code);
  if (!creatorToken) {
    return Promise.reject({
      status: 403,
      message: "Only the person who created this poll can close it.",
    });
  }

  return http
    .post(`/polls/${code}/close`, null, { headers: { "X-Creator-Token": creatorToken } })
    .then((res) => toPoll(res.data));
}
