import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:5000/api";

// A tiny in-memory "backend" so integration tests exercise a full
// request -> response cycle through axios/pollService, the same way they
// would against the real API.
//
// These responses copy the REAL backend's shapes, not the app's internal ones,
// so the mapping inside pollService.js is actually under test:
//   options are [{ index, text, votes }], not plain strings
//   status is "Open" / "Closed", not lowercase
//   errors are { error, message }
const store = new Map();

function seedPoll(code, overrides = {}) {
  const poll = {
    code,
    question: "What should we order for the team lunch?",
    optionTexts: ["Pizza", "Sushi", "Banh mi", "Salad"],
    status: "Open",
    createdAt: "2026-08-18T00:00:00Z",
    closedAt: null,
    hasVotes: false,
    creatorToken: `creator-${code}`,
    counts: [0, 0, 0, 0],
    voters: new Set(),
    ...overrides,
  };
  store.set(code, poll);
  return poll;
}

/** Backend shape for GET /polls/{code}. */
function asPoll(poll) {
  return {
    code: poll.code,
    question: poll.question,
    status: poll.status,
    createdAt: poll.createdAt,
    closedAt: poll.closedAt,
    hasVotes: poll.hasVotes,
    options: poll.optionTexts.map((text, index) => ({ index, text })),
  };
}

/** Backend shape for GET /polls/{code}/results. */
function asResults(poll) {
  const totalVotes = poll.counts.reduce((a, b) => a + b, 0);
  return {
    code: poll.code,
    question: poll.question,
    status: poll.status,
    totalVotes,
    options: poll.optionTexts.map((text, index) => ({
      index,
      text,
      votes: poll.counts[index] ?? 0,
      percentage: totalVotes ? Math.round(((poll.counts[index] ?? 0) / totalVotes) * 1000) / 10 : 0,
    })),
  };
}

export function resetStore() {
  store.clear();
  seedPoll("open01", { counts: [3, 1, 0, 0], hasVotes: true });
  seedPoll("closed1", { status: "Closed", counts: [4, 2, 1, 0], hasVotes: true });
}

resetStore();

export const handlers = [
  http.post(`${API_BASE}/polls`, async ({ request }) => {
    const body = await request.json();
    const code = `test${store.size + 1}`;
    const poll = seedPoll(code, {
      question: body.question,
      optionTexts: body.options,
      counts: new Array(body.options.length).fill(0),
    });

    // The creator token is returned once, on creation, and never again.
    return HttpResponse.json(
      { ...asPoll(poll), creatorToken: poll.creatorToken, shareUrl: `http://localhost:5173/poll/${code}` },
      { status: 201 }
    );
  }),

  http.get(`${API_BASE}/polls/:code`, ({ params }) => {
    const poll = store.get(params.code);
    if (!poll) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(asPoll(poll));
  }),

  http.post(`${API_BASE}/polls/:code/vote`, async ({ params, request }) => {
    const poll = store.get(params.code);
    if (!poll) return new HttpResponse(null, { status: 404 });

    if (poll.status !== "Open") {
      return HttpResponse.json(
        { error: "poll_closed", message: "This poll is closed." },
        { status: 409 }
      );
    }

    const voterToken = request.headers.get("X-Voter-Token");
    if (voterToken && poll.voters.has(voterToken)) {
      return HttpResponse.json(
        { error: "already_voted", message: "You have already voted in this poll." },
        { status: 409 }
      );
    }

    const { optionIndex } = await request.json();
    if (optionIndex == null || optionIndex < 0 || optionIndex >= poll.optionTexts.length) {
      return HttpResponse.json(
        { error: "invalid_option", message: "That option does not exist on this poll." },
        { status: 400 }
      );
    }

    if (voterToken) poll.voters.add(voterToken);
    poll.counts[optionIndex] = (poll.counts[optionIndex] ?? 0) + 1;
    poll.hasVotes = true;

    return HttpResponse.json({ voterToken, results: asResults(poll) });
  }),

  http.get(`${API_BASE}/polls/:code/results`, ({ params }) => {
    const poll = store.get(params.code);
    if (!poll) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(asResults(poll));
  }),

  http.post(`${API_BASE}/polls/:code/close`, ({ params, request }) => {
    const poll = store.get(params.code);
    if (!poll) return new HttpResponse(null, { status: 404 });

    if (request.headers.get("X-Creator-Token") !== poll.creatorToken) {
      return HttpResponse.json(
        { error: "not_creator", message: "Wrong or missing creator token." },
        { status: 403 }
      );
    }

    poll.status = "Closed";
    poll.closedAt = "2026-08-18T01:00:00Z";
    return HttpResponse.json(asPoll(poll));
  }),
];
