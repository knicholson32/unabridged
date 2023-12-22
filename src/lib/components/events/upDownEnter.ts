export type UpDownEnterOptions = {
	up: () => void;
	down: () => void;
	enter: () => void;
};

export default function upDownEnter(element: HTMLElement, options: UpDownEnterOptions) {
	const up = options.up;
	const down = options.down;
	const enter = options.enter;

	function on_key_down(event: KeyboardEvent) {
		if (event.repeat) return;

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			up();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			down();
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			enter();
		}
	}

	window.addEventListener('keydown', on_key_down);

	return {
		destroy() {
			window.removeEventListener('keydown', on_key_down);
		}
	};
}
