/**
 * Form primitives built on React Hook Form.
 *
 * Provides a shadcn-style composable form system that integrates
 * React Hook Form's controller pattern with our existing UI components.
 */

import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
} from "react";
import type {
  ControllerProps,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// --- Form (context provider) ---

const Form = FormProvider;

// --- FormField ---

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = createContext<FormFieldContextValue>({ name: "" });

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

// --- useFormField ---

interface FormItemContextValue {
  id: string;
}

const FormItemContext = createContext<FormItemContextValue>({ id: "" });

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

// --- FormItem ---

function FormItem({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

// --- FormLabel ---

function FormLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Label>) {
  const { formItemId, error } = useFormField();

  return (
    <Label
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

// --- FormControl ---

function FormControl({ ...props }: ComponentPropsWithoutRef<"div">) {
  const { formItemId, formDescriptionId, formMessageId, error } =
    useFormField();

  return (
    <div
      id={formItemId}
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

// --- FormDescription ---

function FormDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

// --- FormMessage ---

function FormMessage({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error?.message ?? children;

  if (!body) return null;

  return (
    <p
      id={formMessageId}
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {String(body)}
    </p>
  );
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};

export type { UseFormReturn };
