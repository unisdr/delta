import { useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { notifyError } from "../utils/notifications";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteButtonProps {
  action: string;
  label?: string;
  useIcon?: boolean;
  confirmMessage?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonFirst?: boolean;
  confirmIcon?: React.ReactNode;
  cancelIcon?: React.ReactNode;
}

/**
 * Generic delete button component that can be customized
 */
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
          className="mg-button mg-button-table"
          aria-label="Delete"
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
        title={props.title || "Record Deletion"}
        confirmLabel={props.confirmLabel}
        cancelLabel={props.cancelLabel}
        confirmButtonFirst={props.confirmButtonFirst}
        confirmIcon={props.confirmIcon}
        cancelIcon={props.cancelIcon}
        onConfirm={confirmDelete}
        onCancel={() => dialogRef.current?.close()}
      />
    </>
  );
}

/**
 * Specialized delete button for hazardous events that meets the specific business requirements:
 * - Title: "Are you sure you want to delete this event?"
 * - Warning text: "This data cannot be recovered after being deleted."
 * - Primary button: "Do not delete"
 * - Secondary button: "Delete permanently" with trash icon
 */
export function HazardousEventDeleteButton({ action, useIcon = true }: { action: string; useIcon?: boolean }) {
  // Create a trash icon for the delete button
  const trashIcon = (
    <svg aria-hidden="true" focusable="false" role="img" width="16" height="16">
      <use href="/assets/icons/trash-alt.svg#delete" />
    </svg>
  );

  return (
    <DeleteButton
      action={action}
      useIcon={useIcon}
      title="Are you sure you want to delete this event?"
      confirmMessage="This data cannot be recovered after being deleted."
      confirmLabel="Delete permanently"
      cancelLabel="Do not delete"
      confirmButtonFirst={false} // Put the cancel button first (as primary)
      confirmIcon={trashIcon}
    />
  );
}