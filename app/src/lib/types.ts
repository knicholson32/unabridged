export type Asin = string;

export enum BookStatus {
    Absent = 0,
    Downloading = 1,
    Downloaded = 2,
    Processing = 3,
    Processed = 4,
    Classifying = 5,
    Classified = 6,
    Incorporated = 7
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
    rating?: number;
    num_ratings: number;
    release_date: string;
    image: string;
    size?: number;
};

export type BookInfo = {
    status: BookStatus;
    profile: string;
};

export type LibraryItemBookInfo = LibraryItem & BookInfo;

export type AudibleBookData = {
    asin: Asin,
    authors: string,
    genres: string,
    is_finished: boolean,
    date_added: string,
    narrators: string,
    percent_complete: number,
    cover_url: string,
    purchase_date: string,
    rating: string | number,
    num_ratings: number,
    release_date: string,
    runtime_length_min: number,
    series_title: string,
    series_sequence: string | number,
    subtitle: string,
    title: string
}

export type Profile = {
    name: string,
    country: string,
    books: string[],
    bytes: string
}

export enum OperationStatus {
    Inactive,
    Active,
    Done
}

export enum OperationType {
    Unknown,
    BookDownload,
    Sync
}

export type OperationId = string;

export type GenericOperationData = {
    id: OperationId
    type: OperationType
    progress: number
    status: OperationStatus
}

export type BookDownloadOperationData = GenericOperationData & {
    type: OperationType.BookDownload
}

export type SyncOperationData = GenericOperationData & {
    type: OperationType.Sync
}