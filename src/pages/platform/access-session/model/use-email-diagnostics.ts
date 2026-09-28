import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ContractViolation,
  OperationRefusal,
  delegatedCompanyOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";
import { readDiagnostic, sendDiagnostic } from "../api/email-diagnostics";
import {
  type DiagnosticState,
  type DiagnosticType,
  diagnosticFailure,
  receiptMatches,
  replayAllowed,
} from "./email-diagnostics";
import { type AccessSession, sessionLiveness } from "./session";

export function useEmailDiagnostics(
  session: AccessSession | undefined,
  open: boolean,
  reconcile: (error: unknown) => Promise<unknown>,
) {
  const access = usePlatformAccess();
  const generation = usePlatformSession((state) => state.generation);
  const sendAllowed =
    open && access.delegatedAvailability(operations.diagnosticSend.key, "live").state === "enabled";
  const [state, setState] = useState<DiagnosticState>({ phase: "idle" });
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const readController = useRef<AbortController | undefined>(undefined);
  const live = useRef(open);
  useLayoutEffect(() => {
    live.current = open;
  }, [open]);
  useEffect(() => {
    if (!sendAllowed) {
      readController.current?.abort();
    }
  }, [sendAllowed]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      readController.current?.abort();
    };
  }, []);
  const current = () => {
    const identity = usePlatformSession.getState();
    return (
      mounted.current &&
      live.current &&
      session !== undefined &&
      sessionLiveness(session, Date.now()) === "live" &&
      identity.generation === generation &&
      identity.session?.user.permissions.includes("delegation:open") &&
      identity.session.user.permissions.includes("delegation:email-diagnostics:test-send")
    );
  };
  const admitted = () =>
    sendAllowed &&
    session !== undefined &&
    sessionLiveness(session, Date.now()) === "live" &&
    access.delegatedAvailability(operations.diagnosticSend.key, "live").state === "enabled";

  function prepare(type: DiagnosticType, locale: "en" | "ar") {
    if (
      !admitted() ||
      lock.current ||
      state.sendUnavailable ||
      (state.retryAt ?? 0) > Date.now() ||
      !["idle", "accepted"].includes(state.phase)
    )
      return;
    setState({
      phase: "confirming",
      command: { requestId: crypto.randomUUID(), emailTypeKey: type, locale },
    });
  }

  async function confirm() {
    if (
      !session ||
      !admitted() ||
      !state.command ||
      lock.current ||
      state.sendUnavailable ||
      state.phase !== "confirming"
    )
      return;
    lock.current = true;
    const command = state.command;
    setState({ phase: "pending", command });
    try {
      const receipt = await sendDiagnostic(session.publicId, command);
      if (!receiptMatches(command, receipt))
        throw new ContractViolation({
          audience: "delegated",
          key: operations.diagnosticSend.key,
          phase: "response",
          status: 202,
        });
      if (current()) setState({ phase: "accepted", command, receipt });
    } catch (error) {
      if (current()) {
        const failure = diagnosticFailure(error, command, Date.now());
        setState({ ...failure, sendUnavailable: failure.phase === "contract" ? true : undefined });
        await reconcile(error);
      }
    } finally {
      lock.current = false;
    }
  }

  async function check() {
    if (
      !session ||
      !admitted() ||
      !state.command ||
      lock.current ||
      state.resultUnavailable ||
      (state.retryAt ?? 0) > Date.now()
    )
      return;
    lock.current = true;
    setChecking(true);
    const command = state.command;
    const controller = new AbortController();
    readController.current = controller;
    try {
      const receipt = await readDiagnostic(session.publicId, command.requestId, controller.signal);
      if (!receiptMatches(command, receipt))
        throw new ContractViolation({
          audience: "delegated",
          key: operations.diagnosticResult.key,
          phase: "response",
          status: 200,
        });
      if (current())
        setState({
          phase: "accepted",
          command,
          receipt,
          sendUnavailable: state.sendUnavailable,
          message: state.sendUnavailable ? "contract" : undefined,
        });
    } catch (error) {
      if (current()) {
        if (error instanceof OperationRefusal && error.status === 404)
          setState({
            phase: "unknown",
            command,
            message: "notFound",
            reconciled: true,
            sendUnavailable: state.sendUnavailable,
          });
        else {
          const failure = diagnosticFailure(error, command, Date.now());
          setState(
            failure.phase === "contract"
              ? { ...failure, sendUnavailable: state.sendUnavailable, resultUnavailable: true }
              : {
                  ...state,
                  phase: state.receipt
                    ? "accepted"
                    : state.phase === "conflict"
                      ? "conflict"
                      : "unknown",
                  message: failure.message,
                  retryAt: failure.retryAt,
                  reconciled: false,
                },
          );
          await reconcile(error);
        }
      }
    } finally {
      lock.current = false;
      if (current()) setChecking(false);
    }
  }

  const visibleState: DiagnosticState = sendAllowed ? state : { phase: "idle" };
  return {
    state: visibleState,
    checking: sendAllowed && checking,
    prepare,
    confirm,
    check,
    replay: () => {
      if (admitted() && !lock.current && replayAllowed(state, Date.now()))
        setState({ ...state, phase: "confirming" });
    },
    cancel: () => {
      if (!lock.current)
        setState(
          state.reconciled || state.message
            ? { ...state, phase: state.reconciled ? "unknown" : "refused" }
            : { phase: "idle" },
        );
    },
  };
}
