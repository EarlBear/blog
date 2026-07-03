import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts.ts';
import { resolveAuthors, formatByline } from '../lib/authors.ts';

export async function GET(context) {
  const posts = await getPublishedPosts();

  const items = await Promise.all(
    posts.map(async (post) => {
      const authors = await resolveAuthors(post.data.authors);
      const byline = formatByline(authors.map((a) => a.data.name));
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/blog/${post.id}/`,
        categories: post.data.tags,
        // RSS <author> is conventionally an email; readers also accept a name.
        ...(byline ? { author: byline } : {}),
      };
    })
  );

  return rss({
    title: 'EarlBear blog',
    description: 'Engineering notes and product writing from EarlBear.',
    site: context.site,
    items,
  });
}
