export function trimNumber(value: number) {
	return Number.parseFloat(value.toFixed(4)).toString();
}

export function cssAttributeValue(value: string) {
	return value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);
}
