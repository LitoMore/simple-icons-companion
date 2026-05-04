import {colorStorageKey, pointsStorageKey} from './constants';
import type {ColorDetails} from './types';
import {cssAttributeValue} from './utils';

export function appendModeControl(
	modes: HTMLFieldSetElement,
	value: string,
	labelText: string,
) {
	if (modes.querySelector(`input[value="${cssAttributeValue(value)}"]`)) {
		return;
	}

	const label = document.createElement('label');
	label.className = 'js-view-mode-item';

	const input = document.createElement('input');
	input.name = 'view-mode';
	input.type = 'radio';
	input.value = value;

	label.append(input, document.createTextNode(labelText));
	modes.append(label);
}

export function appendPointsToggle(shell: HTMLElement, controls: Element) {
	const existingInput = document.querySelector(
		'#simple-icons-companion-points-toggle',
	);
	if (existingInput instanceof HTMLInputElement) {
		return existingInput;
	}

	const label = document.createElement('label');
	label.className = 'simple-icons-companion-points-toggle';
	label.htmlFor = 'simple-icons-companion-points-toggle';

	const input = document.createElement('input');
	input.id = 'simple-icons-companion-points-toggle';
	input.type = 'checkbox';
	input.checked = readStoredToggle(pointsStorageKey);
	shell.classList.toggle(
		'simple-icons-companion-points-enabled',
		input.checked,
	);

	input.addEventListener('change', () => {
		writeStoredToggle(pointsStorageKey, input.checked);
		shell.classList.toggle(
			'simple-icons-companion-points-enabled',
			input.checked,
		);
	});

	label.append(input, document.createTextNode('Points'));

	const tooltip = document.createElement('span');
	tooltip.className = 'simple-icons-companion-points-tooltip';
	tooltip.tabIndex = 0;
	tooltip.setAttribute('role', 'img');
	tooltip.setAttribute(
		'aria-label',
		'Point color legend: yellow means initial move points, red means path endpoints.',
	);
	tooltip.textContent = 'i';

	const tooltipText = document.createElement('span');
	tooltipText.className = 'simple-icons-companion-points-tooltip-text';
	tooltipText.textContent = [
		'Yellow: initial move points.',
		'Red: path endpoints.',
	].join('\n');
	tooltip.append(tooltipText);

	controls.append(label, tooltip);

	return input;
}

export function appendColorToggle(shell: HTMLElement, controls: Element) {
	const existingInput = document.querySelector(
		'#simple-icons-companion-color-toggle',
	);
	if (existingInput instanceof HTMLInputElement) {
		return existingInput;
	}

	const label = document.createElement('label');
	label.className = 'simple-icons-companion-color-toggle';
	label.classList.add('simple-icons-companion-color-toggle-disabled');
	label.htmlFor = 'simple-icons-companion-color-toggle';
	label.title = 'Loading Simple Icons colors...';

	const input = document.createElement('input');
	input.id = 'simple-icons-companion-color-toggle';
	input.type = 'checkbox';
	input.disabled = true;
	input.checked = readStoredToggle(colorStorageKey);
	shell.classList.toggle('simple-icons-companion-color-enabled', input.checked);

	input.addEventListener('change', () => {
		writeStoredToggle(colorStorageKey, input.checked);
		shell.classList.toggle(
			'simple-icons-companion-color-enabled',
			input.checked,
		);
	});

	label.append(input, document.createTextNode('Color'));
	controls.append(label);

	return input;
}

export function getCompanionControls(modes: HTMLFieldSetElement) {
	const existingWrapper = modes.parentElement?.querySelector(
		'.simple-icons-companion-controls',
	);
	if (existingWrapper) {
		return existingWrapper;
	}

	const wrapper = document.createElement('span');
	wrapper.className =
		'simple-icons-companion-controls simple-icons-companion-points-control';
	modes.after(wrapper);

	return wrapper;
}

export function readStoredToggle(key: string) {
	try {
		return globalThis.localStorage.getItem(key) === 'true';
	} catch {
		return false;
	}
}

export function writeStoredToggle(key: string, value: boolean) {
	try {
		globalThis.localStorage.setItem(key, value ? 'true' : 'false');
	} catch {
		// Storage can be blocked for embedded iframes; the checkbox still works.
	}
}

export function disablePointsToggle(message: string) {
	const toggle = document.querySelector<HTMLLabelElement>(
		'.simple-icons-companion-points-toggle',
	);
	const input = toggle?.querySelector('input');

	if (toggle) {
		toggle.title = `Points failed to load: ${message}`;
		toggle.classList.add('simple-icons-companion-points-toggle-error');
	}

	if (input instanceof HTMLInputElement) {
		input.disabled = true;
	}
}

export function enableColorToggle(colors: ColorDetails) {
	const toggle = document.querySelector<HTMLLabelElement>(
		'.simple-icons-companion-color-toggle',
	);
	const input = toggle?.querySelector('input');
	const colorDetails = [
		colors.deleted ? `Deleted: ${colors.deleted}` : '',
		colors.added ? `Added: ${colors.added}` : '',
	]
		.filter(Boolean)
		.join('; ');

	if (toggle) {
		toggle.title = colorDetails;
		toggle.classList.remove(
			'simple-icons-companion-color-toggle-error',
			'simple-icons-companion-color-toggle-disabled',
		);
	}

	if (input instanceof HTMLInputElement) {
		input.disabled = false;
	}
}

export function disableColorToggle(shell: HTMLElement, message: string) {
	const toggle = document.querySelector<HTMLLabelElement>(
		'.simple-icons-companion-color-toggle',
	);
	const input = toggle?.querySelector('input');

	if (toggle) {
		toggle.title = `Color failed to load: ${message}`;
		toggle.classList.add(
			'simple-icons-companion-color-toggle-error',
			'simple-icons-companion-color-toggle-disabled',
		);
	}

	if (input instanceof HTMLInputElement) {
		input.checked = false;
		input.disabled = true;
	}

	shell.classList.remove('simple-icons-companion-color-enabled');
	writeStoredToggle(colorStorageKey, false);
}
