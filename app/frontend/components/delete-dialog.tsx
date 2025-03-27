import {useEffect, useRef} from 'react'
import {useFetcher} from '@remix-run/react'
import {notifyError} from '../utils/notifications'

interface DeleteButtonProps {
	action: string
	label?: string
	useIcon?: boolean
	confirmMessage?: string
	errorMessage?: string
}

export function DeleteButton(props: DeleteButtonProps) {
	let fetcher = useFetcher()
	let dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		let data = fetcher.data as any
		if (fetcher.state == 'idle' && data && !data.ok) {
			console.error(`Delete failed`, data)
			notifyError(props.errorMessage || 'Delete failed')
		}
	}, [fetcher.state, fetcher.data])

	useEffect(() => {
		let dialog = dialogRef.current
		if (!dialog) return
		function handleBackdropClick(e: MouseEvent) {
			if (dialog && e.target === dialog) dialog.close()
		}
		dialog.addEventListener('click', handleBackdropClick)
		return () => dialog.removeEventListener('click', handleBackdropClick)
	}, [])

	function showDialog(e: React.FormEvent) {
		e.preventDefault()
		dialogRef.current?.showModal()
	}

	function confirmDelete() {
		console.log('Submitting to:', props.action)
		dialogRef.current?.close()
		fetcher.submit(null, {method: 'post', action: props.action})
	}

	let submitting = fetcher.state != 'idle'

	console.log("Delete action", props.action)

	return (
		<>
			{props.useIcon ? (
				<button
					type="button"
					className="mg-button mg-button-outline"
					style={{color: 'red'}}
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
					{submitting ? 'Deleting...' : props.label || 'Delete'}
				</button>
			)}

			<dialog ref={dialogRef} className="dts-dialog">
				<div className="dts-dialog__content">
					<div className="dts-form__intro">
						<h2>Confirm Deletion</h2>
					</div>
					<div className="dts-form__body">
						<p>{props.confirmMessage || "Please confirm deletion."}</p>
					</div>
					<div className="dts-form__actions">
						<button onClick={confirmDelete} className="mg-button mg-button-primary">Yes</button>
						<button onClick={() => dialogRef.current?.close()} className="mg-button mg-button-outline">No</button>
					</div>
				</div>
			</dialog>
		</>
	)
}


