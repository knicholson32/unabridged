export type Asin = string;

export enum BookStatus {
    Absent,
    Downloading,
    Downloaded,
    Processing,
    Processed,
    Classifying,
    Classified,
    Incorporated,
}

export type LibraryItem = {
    asin: Asin;
    title: string;
    subtitle?: string;
    description?: string;
    authors: string[];
    narrators: string[];
    series?: string;
    series_number?: number;
    genres: string[];
    length: number;
    rating: number;
    num_ratings: number;
    release_date: string;
    image: string;
    size?: number;
};

export type BookInfo = {
    status: BookStatus;
    profile: string;
};

export type DownloadInfo = {
    percentage: number
};

export type LibraryItemBookInfo = LibraryItem & BookInfo;

export type Data = {
    library: {
        [index: Asin]: LibraryItemBookInfo;
    };
    profiles: {
        [index: Asin]: {
            bytes: string;
            country: string;
            books: string[];
        };
    };
    downloads: {
        [index: Asin]: DownloadInfo
    }
};