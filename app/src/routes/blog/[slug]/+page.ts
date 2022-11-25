import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
    if (params.slug === 'hello-world') {
        return {
            post: {
                title: `Title for ${params.slug} goes here`,
                content: `Content for ${params.slug} goes here`,
            },
        };
    } else {
        throw error(404, 'Blog not found');
    }
};
