import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "./-change-password.page";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
});
