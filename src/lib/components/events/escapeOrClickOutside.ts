export type EscapeOrClickOutsideOptions = {
	callback: () => void;
	except?: HTMLElement;
};
export default function escapeOrClickOutside(
	element: HTMLElement,
	options: EscapeOrClickOutsideOptions
) {
	const on_bind = options.callback;

	function on_key_down(event: KeyboardEvent) {
		if (event.repeat) return;

		if (event.key === 'Escape') {
			event.preventDefault();
			on_bind();
		} else if (event.key === 'Tab') {
			event.preventDefault();
			on_bind();
		}
	}

	function handleClick(event: MouseEvent) {
		if (element && !element.contains(event.target as Node) && !event.defaultPrevented) {
			if (options.except) {
				if (!options.except.contains(event.target as Node)) {
					on_bind();
				}
			} else {
				on_bind();
			}
		}
	}

	document.addEventListener('click', handleClick, true);
	window.addEventListener('keydown', on_key_down);

	return {
		destroy() {
			document.removeEventListener('click', handleClick, true);
			window.removeEventListener('keydown', on_key_down);
		}
	};
}
