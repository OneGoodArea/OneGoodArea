"use client";

/* AR-251 [AR-248-C] /welcome 3-step shell — wrapper + navigation.

   Holds step state client-side (0/1/2 for steps 1/2/3 UI). Each step
   renders inside the same warm-white card on a graphite section; the
   only thing that changes between steps is the inner content + the
   step counter dot that's filled.

   This file ships the WRAPPER only. The three step components are
   placeholders that subsequent tickets replace:
     AR-248-D -> WelcomeStep1 (intent picker)
     AR-248-E -> WelcomeStep2 (workspace bootstrap)
     AR-248-F -> WelcomeStep3 (first-signal AHA: postcode lookup)

   Navigation:
   - "Continue" / "Get started" button (per step) advances to the next
   - "Back" button (steps 2 + 3 only) returns to the previous
   - "Skip for now" link (top-right) jumps the user straight to /dashboard
   - After step 3 completes, router pushes /dashboard

   No auth gating yet — that gets added with AR-248-D when the first
   DB write happens (writes users.intent). For now /welcome is open. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import "./welcome.css";

type StepIndex = 0 | 1 | 2;
const TOTAL_STEPS = 3;

export default function WelcomeClient() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);

  function advance() {
    if (step < TOTAL_STEPS - 1) {
      setStep((step + 1) as StepIndex);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function back() {
    if (step > 0) setStep((step - 1) as StepIndex);
  }

  function skipAll() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      className="oga-welcome oga-section-dark"
      data-oga-surface="dark"
    >
      <div className="oga-welcome__inner">
        <header className="oga-welcome__header">
          <StepCounter step={step} />
          <button
            type="button"
            className="oga-welcome__skip"
            onClick={skipAll}
          >
            Skip for now
          </button>
        </header>

        <div className="oga-welcome__card" data-step={step + 1}>
          {step === 0 ? (
            <Step1Placeholder onAdvance={advance} />
          ) : step === 1 ? (
            <Step2Placeholder onAdvance={advance} onBack={back} />
          ) : (
            <Step3Placeholder onAdvance={advance} onBack={back} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step counter — 3 hairline dots, current ink-filled
   ============================================================ */

function StepCounter({ step }: { step: StepIndex }) {
  return (
    <div className="oga-welcome__counter" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
      <ol className="oga-welcome__dots">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <li
            key={i}
            className="oga-welcome__dot"
            data-active={i === step ? "true" : undefined}
            data-complete={i < step ? "true" : undefined}
            aria-hidden="true"
          />
        ))}
      </ol>
      <span className="oga-welcome__counter-label">
        Step {step + 1} of {TOTAL_STEPS}
      </span>
    </div>
  );
}

/* ============================================================
   Placeholder step components
   ----------------------------------------------------------------
   Each will be replaced in its own ticket (AR-248-D/E/F). The
   navigation contract (onAdvance / onBack callbacks + a single CTA
   that calls onAdvance) stays the same so the swap is local.
   ============================================================ */

interface PlaceholderProps {
  onAdvance: () => void;
  onBack?: () => void;
}

function Step1Placeholder({ onAdvance }: PlaceholderProps) {
  return (
    <PlaceholderShell
      eyebrow="Step 1 of 3"
      title="What brings you here?"
      caption="Coming next: a 4-card picker — Moving, Business, Investing, Research — that tailors the rest of your dashboard to your intent. (Implementation lands in AR-248-D.)"
      primaryLabel="Continue"
      onPrimary={onAdvance}
    />
  );
}

function Step2Placeholder({ onAdvance, onBack }: PlaceholderProps) {
  return (
    <PlaceholderShell
      eyebrow="Step 2 of 3"
      title="Your workspace."
      caption="Coming next: we'll pre-create a workspace for you and let you rename + optionally invite teammates. (Implementation lands in AR-248-E.)"
      primaryLabel="Continue"
      secondaryLabel="Back"
      onPrimary={onAdvance}
      onSecondary={onBack}
    />
  );
}

function Step3Placeholder({ onAdvance, onBack }: PlaceholderProps) {
  return (
    <PlaceholderShell
      eyebrow="Step 3 of 3"
      title="See your first signal."
      caption="Coming next: enter a UK postcode, we run /v1/area for real, you see the score + signals — the AHA moment before you land in the dashboard. (Implementation lands in AR-248-F.)"
      primaryLabel="Finish"
      secondaryLabel="Back"
      onPrimary={onAdvance}
      onSecondary={onBack}
    />
  );
}

interface PlaceholderShellProps {
  eyebrow: string;
  title: string;
  caption: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function PlaceholderShell({
  eyebrow,
  title,
  caption,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: PlaceholderShellProps) {
  return (
    <div className="oga-welcome__step">
      <p className="oga-welcome__eyebrow">{eyebrow}</p>
      <h1 className="oga-welcome__title">{title}</h1>
      <p className="oga-welcome__caption">{caption}</p>

      <div className="oga-welcome__actions">
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            className="oga-welcome__btn oga-welcome__btn--ghost"
            onClick={onSecondary}
          >
            <span aria-hidden>←</span> {secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="oga-welcome__btn oga-welcome__btn--primary"
          onClick={onPrimary}
        >
          {primaryLabel}
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
