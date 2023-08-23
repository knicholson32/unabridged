// ============================================================================
// | lib/events/clickOutside.ts :: Entalon Jaunt                              |
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

export default function clickOutside(node: HTMLElement, callback: () => void) {

    const handleClick = (event: MouseEvent) => {
        if (node && !node.contains(event.target as Node) && !event.defaultPrevented) callback();
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
}