import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { prefetchStudyPage } from "@/lib/hooks";
import { prepareInitialRoute } from "@/variants/a/VariantA";
import { LoadingA } from "@/variants/a/ShellA";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => err?.response?.status !== 404 && err?.code !== "ETIMEDOUT" && count < 2,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
function mountApp() {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

const { pathname } = window.location;
prefetchStudyPage(queryClient, pathname);
const initialPage = prepareInitialRoute(pathname);
if (initialPage) {
  root.render(<div className="va va-study"><LoadingA /></div>);
  initialPage.then(mountApp, mountApp);
} else {
  mountApp();
}
