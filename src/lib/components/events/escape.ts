export type EscapeOptions = {
    callback: () => void
}
export default function escapeOrClickOutside(element: HTMLElement, options: EscapeOptions) {

    const on_bind = options.callback;

    function on_key_down(event: KeyboardEvent) {
        if (event.repeat) return;

        if (event.key !== 'Escape') return;

        event.preventDefault();
        on_bind();
    }

    window.addEventListener('keydown', on_key_down);

    return {
        destroy() {
            window.removeEventListener('keydown', on_key_down);
        }
    };
}