import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { getPublishedPosts } from './posts';

export type Author = CollectionEntry<'authors'>;

/** All author profiles, sorted by name. */
export async function getAuthors(): Promise<Author[]> {
  const authors = await getCollection('authors');
  return authors.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * Resolve a post's author ids to author entries, preserving byline order.
 * Unknown ids are dropped after a build-time warning so a typo never crashes
 * the build but also never renders a broken byline.
 */
export async function resolveAuthors(ids: string[]): Promise<Author[]> {
  const resolved = await Promise.all(
    ids.map(async (id) => {
      const entry = await getEntry('authors', id);
      if (!entry) {
        console.warn(
          `[authors] post references unknown author id "${id}" — no such file in src/content/authors/`
        );
      }
      return entry;
    })
  );
  return resolved.filter((a): a is Author => Boolean(a));
}

/** Authors that have at least one published post, each with a post count. */
export async function getAuthorsWithCounts(): Promise<
  { author: Author; count: number }[]
> {
  const [authors, posts] = await Promise.all([
    getAuthors(),
    getPublishedPosts(),
  ]);
  return authors
    .map((author) => ({
      author,
      count: posts.filter((p) => p.data.authors.includes(author.id)).length,
    }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count || a.author.data.name.localeCompare(b.author.data.name));
}

/** Format a byline: "Earl", "Earl and Sarah", "Earl, Sarah, and Ken". */
export function formatByline(names: string[]): string {
  if (names.length === 0) return '';
  // Intl.ListFormat 'conjunction' → "A, B, and C"
  return new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(names);
}
