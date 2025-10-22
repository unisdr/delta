import {PassThrough} from "node:stream";

import type {EntryContext} from "@remix-run/node";
import {createReadableStreamFromReadable} from "@remix-run/node";
import {RemixServer} from "@remix-run/react";
import * as isbotModule from "isbot";
import {renderToPipeableStream} from "react-dom/server";

// OUR CODE

import {initServer} from "./init.server"
import { i18next } from "./i18next.server";
import { createInstance } from "i18next";
import { resolve } from "node:path";
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Backend from 'i18next-fs-backend';
import i18n from './i18n';

console.log("entry.server.tsx starting...")
initServer()

// END OF OUR CODE

// below is code generated with
// yarn remix reveal

const ABORT_DELAY = 5_000;

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	// Get locale from request
  	let locale = await i18next.getLocale(request);

	// Create i18next instance for this request
    let instance = createInstance();
    await instance
     .use(initReactI18next)
     .use(Backend)
     .init({
      ...i18n,
      lng: locale,
      ns: ['common'],
      backend: {
        loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json'),
      },
    });

	let prohibitOutOfOrderStreaming =
		isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode;

	return prohibitOutOfOrderStreaming
		? handleBotRequest(
			request,
			responseStatusCode,
			responseHeaders,
			remixContext,
			instance
		)
		: handleBrowserRequest(
			request,
			responseStatusCode,
			responseHeaders,
			remixContext,
			instance
		);
}

// We have some Remix apps in the wild already running with isbot@3 so we need
// to maintain backwards compatibility even though we want new apps to use
// isbot@4.  That way, we can ship this as a minor Semver update to @remix-run/dev.
function isBotRequest(userAgent: string | null) {
	if (!userAgent) {
		return false;
	}

	// isbot >= 3.8.0, >4
	if ("isbot" in isbotModule && typeof isbotModule.isbot === "function") {
		return isbotModule.isbot(userAgent);
	}

	// isbot < 3.8.0
	if ("default" in isbotModule && typeof isbotModule.default === "function") {
		throw "not supported"
	}

	return false;
}

function handleBotRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
	i18nInstance: any
) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const {pipe, abort} = renderToPipeableStream(
			<I18nextProvider i18n={i18nInstance}>
				<RemixServer
					context={remixContext}
					url={request.url}
					abortDelay={ABORT_DELAY}
				/>,
			</I18nextProvider>,
			{
				onAllReady() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set("Content-Type", "text/html");

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						})
					);

					pipe(body);
				},
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) {
						console.error(error);
					}
				},
			}
		);

		setTimeout(abort, ABORT_DELAY);
	});
}

function handleBrowserRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
	i18nInstance: any
) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const {pipe, abort} = renderToPipeableStream(
			<I18nextProvider i18n={i18nInstance}>
				<RemixServer
					context={remixContext}
					url={request.url}
					abortDelay={ABORT_DELAY}
				/>
			</I18nextProvider>,
			{
				onShellReady() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set("Content-Type", "text/html");

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						})
					);

					pipe(body);
				},
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) {
						console.error(error);
					}
				},
			}
		);

		setTimeout(abort, ABORT_DELAY);
	});
}
