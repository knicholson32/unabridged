export type EscapeOrClickOutsideOptions = {
    escape: () => void,
    clickOutside: () => void,
    enter: () => void,
    except?: HTMLElement
}
export default function escapeOrClickOutsideOrEnter(element: HTMLElement, options: EscapeOrClickOutsideOptions) {

    const on_escape = options.escape;
    const on_clickOutside = options.clickOutside;
    const on_enter = options.enter;

    function on_key_down(event: KeyboardEvent) {
        if (event.repeat) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            on_escape();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            on_clickOutside();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            on_enter();
        }
    }

    function handleClick(event: MouseEvent) {
        if (element && (!element.contains(event.target as Node)) && !event.defaultPrevented) {
            if (options.except) {
                if (!options.except.contains(event.target as Node)) {
                    on_clickOutside();
                }
            } else {
                on_clickOutside();
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