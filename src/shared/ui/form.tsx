import { cn } from "@/shared/lib/cn";
import type { FormHTMLAttributes } from "react";

export function Form({ className, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={cn("space-y-5", className)} {...props} />;
}
