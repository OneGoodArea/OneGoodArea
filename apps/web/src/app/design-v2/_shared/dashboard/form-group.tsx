/* AR-219 (Dashboard redesign Epic AR-217): foundational form primitive.

   Every dashboard form (Levers CRUD, /welcome flow, Webhooks, IP allowlist,
   Settings) composes <FormGroup> + one of the input variants below. The
   wrapper owns layout (label above, input, then help OR error below) +
   accessibility (label-input association via htmlFor, error/help linked
   via aria-describedby, error has role="alert"). The input components
   own the actual control + the Brand v3 visual styling.

   Co-located CSS in form-group.css. No inline styles (Marcos's rule). */

"use client";

import type {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import "./form-group.css";

export interface FormGroupProps {
  /** Label text rendered above the input. Sentence case, not uppercase. */
  label: string;
  /** id of the input the label associates with (required for a11y). */
  htmlFor: string;
  /** Error message rendered below the input when present. Replaces help text. */
  error?: string;
  /** Help text rendered below the input. Hidden when error is present. */
  help?: string;
  /** Renders a small asterisk after the label. Visual only — server-side
      validation is still the consumer's responsibility. */
  required?: boolean;
  /** The input itself (one of <Input>, <Textarea>, <Select>, or any element
      whose id matches `htmlFor`). */
  children: ReactNode;
}

/** Layout + accessibility wrapper for a form control. */
export function FormGroup({
  label,
  htmlFor,
  error,
  help,
  required,
  children,
}: FormGroupProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const helpId = help ? `${htmlFor}-help` : undefined;
  return (
    <div className="oga-fg" data-oga-fg-error={error ? "true" : undefined}>
      <label htmlFor={htmlFor} className="oga-fg__label">
        {label}
        {required ? (
          <span className="oga-fg__required" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="oga-fg__error" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="oga-fg__help">
          {help}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Brand v3 text input. Inherits all <input> props. */
export function Input({ className, ...rest }: InputProps) {
  const merged = ["oga-fg__input", className].filter(Boolean).join(" ");
  return <input {...rest} className={merged} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Brand v3 textarea. Inherits all <textarea> props; defaults to vertical resize. */
export function Textarea({ className, ...rest }: TextareaProps) {
  const merged = ["oga-fg__textarea", className].filter(Boolean).join(" ");
  return <textarea {...rest} className={merged} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Brand v3 select. Inherits all <select> props; renders a chevron via CSS. */
export function Select({ className, children, ...rest }: SelectProps) {
  const merged = ["oga-fg__select", className].filter(Boolean).join(" ");
  return (
    <select {...rest} className={merged}>
      {children}
    </select>
  );
}
