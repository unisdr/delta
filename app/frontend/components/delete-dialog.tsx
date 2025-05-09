import { useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { notifyError } from "../utils/notifications";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteButtonProps {
  action: string;
  label?: string;
  useIcon?: boolean;
  confirmMessage?: string;
}

export function DeleteButton(props: DeleteButtonProps) {
  let fetcher = useFetcher();
  let dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let data = fetcher.data as any;
    if (fetcher.state === "idle" && data && !data.ok) {
      console.error(`Delete failed`, data);
      notifyError(data.error || "Delete failed");
    }
  }, [fetcher.state, fetcher.data]);

  function showDialog(e: React.MouseEvent) {
    e.preventDefault();
    dialogRef.current?.showModal();
  }

  function confirmDelete() {
    console.log("Submitting to:", props.action);
    dialogRef.current?.close();
    fetcher.submit(null, { method: "post", action: props.action });
  }

  let submitting = fetcher.state !== "idle";

  return (
    <>
      {props.useIcon ? (
        <button
          type="button"
          className="mg-button mg-button-outline"
          style={{ color: "red" }}
          disabled={submitting}
          onClick={showDialog}
        >
          {submitting ? (
            <span className="dts-spinner" />
          ) : (
            <svg aria-hidden="true" focusable="false" role="img">
              <use href="/assets/icons/trash-alt.svg#delete" />
            </svg>
          )}
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={showDialog}>
          {submitting ? "Deleting..." : props.label || "Delete"}
        </button>
      )}

      <ConfirmDialog
        dialogRef={dialogRef}
        confirmMessage={props.confirmMessage || "Please confirm deletion."}
        onConfirm={confirmDelete}
        onCancel={() => dialogRef.current?.close()}
      />
    </>
  );
}