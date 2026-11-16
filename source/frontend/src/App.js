import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import World from "@/variants/a/VariantA";

function ScrollTop() {
  const location = useLocation();
  const { pathname, search } = location.state?.backgroundLocation ?? location;
  const shopTab = pathname === "/shop" ? new URLSearchParams(search).get("tab") : null;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, shopTab]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollTop />
      <World />
    </BrowserRouter>
  );
}
