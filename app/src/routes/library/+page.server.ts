import prisma from '$lib/server/prisma';
import type { Decimal } from '@prisma/client/runtime/library';
import Fuse from 'fuse.js';
import type * as Table from '$lib/table';
import * as table from '$lib/table';
import type { Prisma } from '@prisma/client';
import * as helpers from '$lib/helpers';
import * as settings from '$lib/server/settings';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, depends }) {

  console.log('library > +page.server.ts');

  const autoSubmit = await settings.get('search.autoSubmit');

  const fuseOptionsBooks = {
    // isCaseSensitive: false,
    // includeScore: false,
    // shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    // minMatchCharLength: 1,
    // location: 0,
    threshold: 0.3,
    // distance: 100,
    // useExtendedSearch: false,
    // ignoreLocation: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: [
      'title',
      'genres.tag'
    ]
  };

  const fuseOptionsSingleBooks = {
    // isCaseSensitive: false,
    // includeScore: false,
    // shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    // minMatchCharLength: 1,
    // location: 0,
    threshold: 0.3,
    // distance: 100,
    // useExtendedSearch: false,
    // ignoreLocation: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: [
      'title',
      'authors.name',
      'narrators.name',
      'genres.tag'
    ]
  }

  type Book = Prisma.BookGetPayload<{
    include: {
      authors: true,
      genres: true,
      series: true,
      narrators: true,
      cover: true,
      profiles: {
        select: {
          first_name: true,
          last_name: true,
          profile_image_url: true,
          id: true
        }
      }
    }
  }>;

  const profiles = await prisma.profile.findMany();
  const singleBooks = await prisma.book.findMany({
    where: {
      series: null
    },
    include: {
      authors: true,
      genres: true,
      series: true,
      narrators: true,
      cover: true,
      profiles: {
        select: {
          first_name: true,
          last_name: true,
          profile_image_url: true,
          id: true
        }
      }
    }
  });
  for (const book of singleBooks) book.rating = book.rating.toNumber() as unknown as Decimal;

  let bookCount = 0;

  const params: Table.Params = table.resolve(url);

  const groupsPerPage = 10;
  const start = params.page * groupsPerPage;
  const end = start + groupsPerPage;

  // Sort order by default
  // Series
  // Author

  const sortBooks = (books: Book[]) => {
    const rev = (params.order) ? 1 : -1;
    if (params.sortCategory === 'title') {
      books.sort((a, b) => {
        return a.title.localeCompare(b.title) * rev;
      });
    } else if (params.sortCategory === 'order') {
      books.sort((a, b) => {
        if (a.series_sequence !== null && b.series_sequence !== null) {
          return ((a.series_sequence > b.series_sequence) ? 1 : -1) * rev;
        } else if (a.series_sequence === null && b.series_sequence === null) {
          return a.title.localeCompare(b.title) * rev;
        } else {
          if (a.series_sequence === null) return 1 * rev;
          else return -1 * rev;
        }
      });
    }
  }

  if (params.group === 'series') {

    const seriesRaw = await prisma.series.findMany({
      include: {
        books: {
          include: {
            authors: true,
            genres: true,
            series: true,
            narrators: true,
            cover: true,
            profiles: {
              select: {
                first_name: true,
                last_name: true,
                profile_image_url: true,
                id: true
              }
            }
          }
        }
      }
    });
    let series = seriesRaw as (typeof seriesRaw[0] & { authors: string[], narrators: string[], runTimeMinutes: number, numBooks: number })[];
    // for (const s of series) for (const book of s.books) book.rating = book.rating.toNumber() as unknown as Decimal;


    for (const s of series) {
      s.authors = [];
      s.narrators = [];
      s.numBooks = 0;
      let runTimeMin = 0;
      for (const book of s.books) {
        for (const author of book.authors) if (s.authors.includes(author.name) === false) s.authors.push(author.name)
        for (const narrator of book.narrators) if (s.narrators.includes(narrator.name) === false) s.narrators.push(narrator.name)
        s.numBooks++;
        runTimeMin += book.runtime_length_min ?? 0;
        book.rating = book.rating.toNumber() as unknown as Decimal;
      }
      // if (params.search !== undefined && params.search !== '') {
      //   const fuse = new Fuse(s.books, fuseOptionsBooks);
      //   s.books = fuse.search(params.search).map((b) => b.item);
      // }
      sortBooks(s.books);
      s.runTimeMinutes = runTimeMin;
    }

    // These are the series that should be displayed because they specifically match the search
    let seriesResults: typeof series = helpers.deepCopy(series);
    if (params.search !== undefined && params.search !== '') {
      const fuseOptions = {
        // isCaseSensitive: false,
        // includeScore: false,
        // shouldSort: true,
        // includeMatches: false,
        // findAllMatches: false,
        // minMatchCharLength: 1,
        // location: 0,
        threshold: 0.2,
        // distance: 100,
        // useExtendedSearch: false,
        // ignoreLocation: false,
        // ignoreFieldNorm: false,
        // fieldNormWeight: 1,
        keys: [
          'title',
          'authors',
          'narrators'
        ]
      };
      seriesResults = new Fuse(seriesResults, fuseOptions).search(params.search).map((v) => v.item);
    }

    if (params.search !== undefined && params.search !== '') {
      for (const s of series) {
        const fuse = new Fuse(s.books, fuseOptionsBooks);
        s.books = fuse.search(params.search).map((b) => b.item);
      }
    }


    // TODO: Make an actual series for these?
    const singleSeries: typeof seriesResults[0] = {
      id: 'no-series-placeholder',
      title: 'No Series',
      authors: [],
      narrators: [],
      runTimeMinutes: 0,
      numBooks: singleBooks.length,
      books: [],
    };

    for (const b of singleBooks) singleSeries.runTimeMinutes += b.runtime_length_min ?? 0;

    if (params.search !== undefined && params.search !== '') {
      const fuse = new Fuse(singleBooks, fuseOptionsSingleBooks);
      singleSeries.books = fuse.search(params.search).map((b) => b.item);
    } else {
      singleSeries.books = singleBooks;
    }

    sortBooks(singleSeries.books);

    // We need to merge the following:
    // seriesResults -> The series that directly match the search, so all the books are present
    // series -> Only books that match the search are included here
    // 
    // Technique: Favor the series in seriesResults. Then loop through series and if it isn't
    // already in there ~and~ there is at least 1 book, add it too

    const seriesExport: typeof series = seriesResults;
    for (const s of series) {
      if (s.books.length === 0) continue;
      if (seriesExport.findIndex((series) => series.title === s.title) !== -1) continue;
      seriesExport.push(s);
    }
    seriesExport.push(singleSeries);

    for (const s of seriesExport) bookCount += s.books.length;

    // Sort the stuff
    const rev = (params.groupOrder) ? 1 : -1;
    if (params.search === undefined || params.search === '') {
      seriesExport.sort((a, b) => {
        return a.title.localeCompare(b.title) * rev;
      });
    }

    return {
      bookCount,
      pages: Math.ceil(seriesExport.length / groupsPerPage),
      page: params.page,
      series: seriesExport.slice(start, end),
      singleBooks,
      profiles,
      autoSubmit
    };
  } else if (params.group === 'author') {
    const authorsRaw = await prisma.author.findMany({
      include: {
        books: {
          include: {
            authors: true,
            genres: true,
            series: true,
            narrators: true,
            cover: true,
            profiles: {
              select: {
                first_name: true,
                last_name: true,
                profile_image_url: true,
                id: true
              }
            }
          }
        }
      }
    });
    const authors = authorsRaw as (typeof authorsRaw[0] & { narrators: string[], runTimeMinutes: number, numBooks: number })[];
    for (const a of authors) {
      a.narrators = [];
      a.numBooks = 0;
      let runTimeMin = 0;
      for (const book of a.books) {
        for (const narrator of book.narrators) if (a.narrators.includes(narrator.name) === false) a.narrators.push(narrator.name)
        bookCount++;
        a.numBooks++;
        runTimeMin += book.runtime_length_min ?? 0;
        book.rating = book.rating.toNumber() as unknown as Decimal;
      }
      sortBooks(a.books);
      a.runTimeMinutes = runTimeMin;
    }
    const rev = (params.groupOrder) ? 1 : -1;
    authors.sort((a, b) => {
      return a.name.localeCompare(b.name) * rev;
    });
    return {
      bookCount,
      pages: Math.ceil(authors.length / groupsPerPage),
      page: params.page,
      authors: authors.slice(start, end),
      singleBooks,
      profiles,
      autoSubmit
    };
  } else if (params.group === 'narrator') {
    const narratorsRaw = await prisma.narrator.findMany({
      include: {
        books: {
          include: {
            authors: true,
            genres: true,
            series: true,
            narrators: true,
            cover: true,
            profiles: {
              select: {
                first_name: true,
                last_name: true,
                profile_image_url: true,
                id: true
              }
            }
          }
        }
      }
    });
    const narrators = narratorsRaw as (typeof narratorsRaw[0] & { authors: string[], runTimeMinutes: number, numBooks: number })[];
    for (const n of narrators) {
      n.authors = [];
      n.numBooks = 0;
      let runTimeMin = 0;
      for (const book of n.books) {
        for (const author of book.authors) if (n.authors.includes(author.name) === false) n.authors.push(author.name)
        bookCount++;
        n.numBooks++;
        runTimeMin += book.runtime_length_min ?? 0;
        book.rating = book.rating.toNumber() as unknown as Decimal;
      }
      sortBooks(n.books);
      n.runTimeMinutes = runTimeMin;
    }
    const rev = (params.groupOrder) ? 1 : -1;
    narrators.sort((a, b) => {
      return a.name.localeCompare(b.name) * rev;
    });
    return {
      bookCount,
      pages: Math.ceil(narrators.length / groupsPerPage),
      page: params.page,
      authors: narrators.slice(start, end),
      singleBooks,
      profiles,
      autoSubmit
    };
  }

  return {
    bookCount,
    pages: 0,
    singleBooks,
    profiles,
    autoSubmit
  };
}
