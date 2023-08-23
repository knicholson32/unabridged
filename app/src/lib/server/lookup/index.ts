import prisma from '$lib/server/prisma';
import * as helpers from '$lib/helpers';
import sharp from 'sharp';
import { getAverageColor } from 'fast-average-color-node';



// 20230822130738
// https://www.googleapis.com/books/v1/volumes?q=intitle:%22Columbus%20Day%22+inauthor:%22Craig%22

type GoogleAPIReponse = {
  kind: 'books#volumes',
  totalItems: number,
  items: {
      kind: 'books#volume',
      id: string,
      etag: string,
      selfLink: string,
      volumeInfo: {
        title: string,
        authors: string[],
        publishedDate: string,
        description: string,
        industryIdentifiers: {
            type: 'ISBN_10' | 'ISBN_13',
            identifier: string
        }[],
        readingModes: {
          text: boolean,
          image: boolean
        },
        pageCount: number,
        printType: string,
        categories: string[],
        maturityRating: string,
        allowAnonLogging: boolean,
        contentVersion: string,
        panelizationSummary: {
          containsEpubBubbles: boolean,
          containsImageBubbles: boolean
        },
        language: string,
        previewLink: string,
        infoLink: string,
        canonicalVolumeLink: string
      },
      saleInfo: {
        country: string,
        saleability: string,
        isEbook: boolean
      },
      accessInfo: {
        country: string,
        viewability: string,
        embeddable: boolean,
        publicDomain: boolean,
        textToSpeechPermission: string,
        epub: {
          isAvailable: boolean
        },
        pdf: {
          isAvailable: false
        },
        webReaderLink: string,
        accessViewStatus: string,
        quoteSharingAllowed: false
      },
      searchInfo: {
        textSnippet: string
      }
  }[]
}

const getISBN = (data: { type: 'ISBN_10' | 'ISBN_13', identifier: string }[]): string | undefined => {
  for (const entry of data) if (entry.type === 'ISBN_13') return entry.identifier;
  for (const entry of data) if (entry.type === 'ISBN_10') return entry.identifier;
  return undefined
}



export const saveGoogleAPIDetails = async (asin: string, title: string, authors: string[]) => {
  const query = encodeURI(`intitle:"${title}"+inauthor:"${authors[0]}"`)
  console.log(query)

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&country=US`);
  try {
    const results = await (response).json() as GoogleAPIReponse;
    if (results === undefined || results.totalItems === undefined || results.totalItems < 1) return;
    const primaryResult = results.items[0];

    // Make sure the description has correct basic punctuation (remove 'Word.Word', etc.)
    const description = primaryResult.volumeInfo.description.replace(/\.([^\.\s])/g, '. $1').replaceAll('.  ', '. ');
    const searchDescription = primaryResult.searchInfo.textSnippet.replace(/\.([^\.\s])/g, '. $1').replaceAll('.  ', '. ');
    const isbn = getISBN(primaryResult.volumeInfo.industryIdentifiers);
    const googleAPIID = primaryResult.id;

    console.log('isbn', isbn);
    
    // TODO: Get these covers on our own time
    // let coverISBN = undefined;
    // let coverISBNSmall = undefined;
    // if (isbn !== undefined) {
    //   try {
    //     const imgResp = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}.jpg`)
    //     const imageBuffer = helpers.toBuffer(await imgResp.arrayBuffer());
    //     const initial = sharp(imageBuffer);
    //     const w = (await initial.metadata()).width ?? 0;
    //     const h = (await initial.metadata()).height ?? 0;
    //     if (w >= 50 && h >= 50) {
    //       coverISBN = `https://covers.openlibrary.org/b/isbn/${isbn}.jpg`;
    //       coverISBNSmall = `https://covers.openlibrary.org/b/isbn/${isbn}-S.jpg`;
    //     }
    //   } catch(e) {
    //     console.log(e);
    //   }
    // }

    try {
      await prisma.book.update({
        where: { asin: asin },
        data: {
          description,
          search_description: searchDescription,
          isbn: isbn,
          google_api_id: googleAPIID,
        }
      });
    } catch(e) {
      console.log(e);
    }


  } catch(e) {
    console.log(e);
  }
}