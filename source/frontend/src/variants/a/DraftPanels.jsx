import { lazy, Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingA } from "./ShellA";

const Resume = lazy(() => import("./DraftResume").then(module => ({ default: module.DraftResume })));

export function DraftSaveNotice({ error }) {
  return error ? (
    <Alert className="a-note mb-4" role="alert" data-testid="draft-save-error">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}

export function DraftResume(props) {
  return <Suspense fallback={<LoadingA />}><Resume {...props} /></Suspense>;
}
