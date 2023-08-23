// ============================================================================
// | lib/events/escape.ts :: Entalon Jaunt                      |
// |                          _                   _                           |
// |                         | |                 | |                          |
// |                         | | __ _ _   _ _ __ | |_                         |
// |                     _   | |/ _` | | | | '_ \| __|                        |
// |                    | |__| | (_| | |_| | | | | |_                         |
// |                     \____/ \__,_|\__,_|_| |_|\__|                        |
// |                                                                          |
// | Copyright (C) Entalon, LLC - All Rights Reserved                         |
// | Unauthorized copying of this file, via any medium is strictly prohibited |
// | Proprietary and confidential                                             |
// | Written by Keenan Nicholson <keenan@entalon.com>, March 2023             |
// ============================================================================

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