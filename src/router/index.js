import { createRouter, createWebHistory } from "vue-router";

// Vote and Results pages are stubbed for now — they are the next pieces of
// the frontend work (voting flow + live SignalR results) and will be built
// out in the following pass.
const CreatePoll = () => import("../views/CreatePoll.vue");
const VotePage = () => import("../views/VotePage.vue");
const ResultsPage = () => import("../views/ResultsPage.vue");
const NotFound = () => import("../views/NotFound.vue");

const routes = [
  {
    path: "/",
    name: "create-poll",
    component: CreatePoll,
    meta: { title: "Create a poll" },
  },
  {
    path: "/poll/:code",
    name: "vote-page",
    component: VotePage,
    props: true,
    meta: { title: "Vote" },
  },
  {
    path: "/poll/:code/results",
    name: "results-page",
    component: ResultsPage,
    props: true,
    meta: { title: "Live results" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFound,
    meta: { title: "Not found" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const base = "Tally";
  document.title = to.meta?.title ? `${to.meta.title} · ${base}` : base;
});

export default router;
