import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, BookOpen, ClipboardPenLine, PawPrint, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { returnVoice } from "@/lib/returnVoice";
import { CompanionPortrait, CompanionText } from "./Companion";

const MotionButton = motion.create(Button);
const pressTransition = { type: "spring", stiffness: 480, damping: 32, mass: 0.65 };

export function DraftSaveNotice({ error }) {
  return error ? (
    <Alert className="a-note mb-4" role="alert" data-testid="draft-save-error">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}

export function DraftResume({ title, detail, position, kind = "lesson", savedAt, results, onResume, onRestart }) {
  const reduceMotion = useReducedMotion();
  const line = returnVoice({ savedAt, results });
  const PlaceIcon = kind === "trainer" ? ClipboardPenLine : BookOpen;
  const enter = action => () => {
    action();
    window.document.documentElement.scrollTop = 0;
  };
  const feedback = reduceMotion ? {} : {
    whileHover: { y: -1 },
    whileTap: { y: 1 },
    transition: pressTransition,
  };
  return (
    <div className="learning-resume">
      <Card className="draft-resume-card" data-testid="draft-resume">
        <CompanionPortrait className="draft-resume-illustration" />
        <div className="draft-resume-body">
          <CardHeader className="draft-resume-heading">
            <CardTitle className="draft-resume-title" role="heading" aria-level={1}>{title}</CardTitle>
          </CardHeader>
          <CardContent className="draft-resume-content">
            <p className="draft-resume-line" data-testid="draft-resume-line" data-state={line.state}>«<CompanionText text={line.text} />»</p>
            {position && <div className="draft-resume-position">
              <span className="draft-resume-place-icon" aria-hidden="true"><PlaceIcon /></span>
              <span>{position.label}</span>
              <span className="draft-resume-counter" data-testid="draft-resume-position">
                <b>{position.current}</b><span> / {position.total}</span>
              </span>
            </div>}
            {detail && <CardDescription className="draft-resume-detail">{detail}</CardDescription>}
            <div className="draft-resume-actions">
              <MotionButton {...feedback} type="button" size="lg" className="draft-resume-continue" onClick={enter(onResume)} data-testid="draft-resume-btn">
                <span>Продолжить</span>
                <span className="draft-resume-button-tail" aria-hidden="true">
                  <span className="draft-resume-tracks"><PawPrint /><PawPrint /></span>
                  <span className="draft-resume-arrow"><ArrowRight /></span>
                </span>
              </MotionButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <MotionButton whileTap={reduceMotion ? undefined : { y: 1 }} transition={pressTransition}
                    type="button" size="lg" variant="ghost" className="draft-resume-restart"
                    data-testid="draft-restart-btn"><RotateCcw aria-hidden="true" />Начать заново</MotionButton>
                </AlertDialogTrigger>
                <AlertDialogContent className="draft-restart-dialog" data-testid="draft-restart-dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Начать заново?</AlertDialogTitle>
                    <AlertDialogDescription>Ответы этой попытки сбросятся. Полученные награды останутся.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="draft-restart-dialog-actions">
                    <AlertDialogCancel className="draft-restart-cancel" data-testid="draft-restart-cancel">Отмена</AlertDialogCancel>
                    <AlertDialogAction className="draft-restart-confirm" onClick={enter(onRestart)} data-testid="draft-restart-confirm">Начать заново</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
