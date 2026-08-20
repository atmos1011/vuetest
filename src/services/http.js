import axios from "axios";

// Backend base URL. Set VITE_API_BASE_URL in a .env(.local) file once the
// real backend is deployed/running — see .env.example.
// Falls back to the local ASP.NET Core dev server used throughout the
// project's tutorials.
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const http = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Normalize error handling so every caller gets a predictable shape:
// { status, message } — instead of digging into axios' error object.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;

    // The backend sends { error, message } on failures, so callers can branch on
    // a stable code instead of matching on English text.
    const code = error.response?.data?.error ?? null;

    let message = "Something went wrong. Please try again.";
    if (!error.response) {
      message = "Can't reach the server. Check your connection and try again.";
    } else if (error.response.data?.message) {
      message = error.response.data.message;
    } else if (error.response.data?.title) {
      // ASP.NET Core's default ProblemDetails/ValidationProblemDetails shape
      message = error.response.data.title;
    } else if (status === 404) {
      message = "We couldn't find that.";
    } else if (status >= 500) {
      message = "The server had a problem. Please try again shortly.";
    }

    return Promise.reject({ status, code, message, raw: error });
  }
);

export default http;
