import {overlayMode} from './constants';
import {cssAttributeValue} from './utils';

type ResizeCallback = () => void;

export function bindModeSwitching(
	shell: HTMLElement,
	modes: HTMLFieldSetElement,
) {
	if (modes.dataset['simpleIconsCompanionOverlay'] === 'true') {
		return;
	}

	modes.dataset['simpleIconsCompanionOverlay'] = 'true';
	modes.addEventListener('change', (event) => {
		const input = event.target;

		if (!(input instanceof HTMLInputElement) || input.name !== 'view-mode') {
			return;
		}

		switchMode(shell, modes, input.value);
	});
}

export function watchDiffParentResize(
	shell: HTMLElement,
	modes: HTMLFieldSetElement,
) {
	watchParentResize(shell, () => {
		const selectedMode = modes.querySelector<HTMLInputElement>(
			'input[name="view-mode"]:checked',
		)?.value;
		const activeView = [...shell.querySelectorAll<HTMLElement>('.view')].find(
			(view) => selectedMode && view.classList.contains(selectedMode),
		);

		if (activeView && selectedMode) {
			resizeParent(shell, activeView, selectedMode);
		}
	});
}

export function watchSinglePreviewParentResize(shell: HTMLElement) {
	watchParentResize(shell, () => {
		const height = Math.ceil(
			Math.max(
				document.documentElement.scrollHeight,
				document.body?.scrollHeight ?? 0,
			),
		);

		postParentHeight(height);
	});
}

function switchMode(
	shell: HTMLElement,
	modes: HTMLFieldSetElement,
	mode: string,
) {
	const targetView = [...shell.querySelectorAll<HTMLElement>('.view')].find(
		(view) => view.classList.contains(mode),
	);

	if (!targetView) {
		return;
	}

	for (const view of shell.querySelectorAll<HTMLElement>('.view')) {
		view.style.display = 'none';
	}

	targetView.style.display = mode === overlayMode ? 'flex' : 'block';

	for (const label of modes.querySelectorAll('.js-view-mode-item')) {
		label.classList.remove('selected');
	}

	modes
		.querySelector(`input[value="${cssAttributeValue(mode)}"]`)
		?.closest('.js-view-mode-item')
		?.classList.add('selected');

	requestAnimationFrame(() => {
		resizeParent(shell, targetView, mode);
	});
}

export function resizeParent(
	shell: HTMLElement,
	view: HTMLElement,
	mode: string,
) {
	const renderBarHeight =
		shell.querySelector('.js-render-bar')?.getBoundingClientRect().height ?? 0;
	let extraHeight = renderBarHeight + 40;

	if (mode === 'swipe') {
		extraHeight += 14;
	} else if (mode === 'onion-skin') {
		extraHeight += 45;
	}

	const height = Math.ceil(view.getBoundingClientRect().height + extraHeight);
	postParentHeight(height);
}

function watchParentResize(shell: HTMLElement, resize: ResizeCallback) {
	if (shell.dataset['simpleIconsCompanionParentResize'] === 'true') {
		return;
	}

	shell.dataset['simpleIconsCompanionParentResize'] = 'true';
	let animationFrame: number | undefined;
	const scheduleResize = () => {
		if (animationFrame !== undefined) {
			return;
		}

		animationFrame = requestAnimationFrame(() => {
			animationFrame = undefined;
			resize();
		});
	};

	if ('ResizeObserver' in globalThis) {
		const observer = new ResizeObserver(scheduleResize);
		observer.observe(shell);

		for (const element of shell.querySelectorAll<HTMLElement>(
			'.view, .js-render-bar, img',
		)) {
			observer.observe(element);
		}
	}

	shell.addEventListener('load', scheduleResize, true);
	globalThis.addEventListener('load', scheduleResize);
	scheduleResize();
}

function postParentHeight(height: number) {
	const identity = globalThis.location.hash.slice(1);
	let targetOrigin = '*';

	if (document.referrer) {
		try {
			targetOrigin = new URL(document.referrer).origin;
		} catch {
			targetOrigin = '*';
		}
	}

	globalThis.parent.postMessage(
		{
			type: 'render',
			body: 'resize',
			payload: {height},
			identity,
		},
		targetOrigin,
	);
}
