import {simpleIconsNwo, simpleIconsRepositoryPath} from './constants';
import type {Side} from './types';

export function isSimpleIconsRepositoryPage() {
	return (
		globalThis.location.hostname === 'github.com' &&
		globalThis.location.pathname.startsWith(`${simpleIconsRepositoryPath}/`)
	);
}

export function isSimpleIconsSvgPreviewFrame() {
	if (
		globalThis.location.hostname !== 'viewscreen.githubusercontent.com' ||
		!isSupportedSvgPreviewPath(globalThis.location.pathname)
	) {
		return false;
	}

	const parameters = new URLSearchParams(globalThis.location.search);
	if (parameters.get('nwo') === simpleIconsNwo) {
		return true;
	}

	if (!document.referrer) {
		return false;
	}

	try {
		const referrer = new URL(document.referrer);
		return (
			referrer.hostname === 'github.com' &&
			referrer.pathname.startsWith(`${simpleIconsRepositoryPath}/`)
		);
	} catch {
		return false;
	}
}

function isSupportedSvgPreviewPath(pathname: string) {
	return (
		pathname.startsWith('/added/svg') ||
		pathname.startsWith('/deleted/svg') ||
		pathname.startsWith('/diff/svg')
	);
}

export function getSinglePreviewSide(): Side | '' {
	if (globalThis.location.pathname.startsWith('/added/svg')) {
		return 'added';
	}

	if (globalThis.location.pathname.startsWith('/deleted/svg')) {
		return 'deleted';
	}

	return '';
}

export function getSinglePreviewSvgUrl(frame: HTMLElement) {
	return (
		decodeHexEncodedUrl(
			new URLSearchParams(globalThis.location.search).get('enc_url') ??
				undefined,
		) ??
		frame.dataset['image'] ??
		''
	);
}

function decodeHexEncodedUrl(value: string | undefined) {
	if (!value || value.length % 2 !== 0 || /[^\da-f]/iv.test(value)) {
		return undefined;
	}

	const characters = [];

	for (let index = 0; index < value.length; index += 2) {
		characters.push(
			String.fromCodePoint(Number.parseInt(value.slice(index, index + 2), 16)),
		);
	}

	const decoded = characters.join('');

	try {
		return new URL(decoded).href;
	} catch {
		return undefined;
	}
}
