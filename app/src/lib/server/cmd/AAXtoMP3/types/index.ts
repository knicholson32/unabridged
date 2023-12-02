import type { Prisma } from "@prisma/client";

export enum ConversionError {
    NO_ERROR = 'NO_ERROR',
    BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
    NO_PROFILE = 'NO_PROFILE',
    NO_FOLDER = 'NO_FOLDER',
    NO_PROFILE_WITH_AUTHCODE = 'NO_PROFILE_WITH_AUTHCODE',
    DESTINATION_NOT_WRITABLE = 'DESTINATION_NOT_WRITABLE',
    INVALID_FILE = 'INVALID_FILE',
    CONVERSION_ERROR = 'CONVERSION_ERROR',
    COULD_NOT_SAVE = 'COULD_NOT_SAVE',
    CANCELED = 'CANCELED'
}

export const conversionErrorToString = (e: ConversionError): string => {
    switch (e) {
        case ConversionError.NO_ERROR:
            return 'No error';
        case ConversionError.BOOK_NOT_FOUND:
            return 'The audible book does not exist';
        case ConversionError.NO_PROFILE:
            return 'No profile exists to download this book';
        case ConversionError.NO_FOLDER:
            return 'The required files do not exist';
        case ConversionError.NO_PROFILE_WITH_AUTHCODE:
            return 'None of the profiles have authcodes downloaded';
        case ConversionError.DESTINATION_NOT_WRITABLE:
            return 'The destination folder was not writable';
        case ConversionError.INVALID_FILE:
            return 'The file to convert is not valid'
        case ConversionError.CONVERSION_ERROR:
            return 'Something went wrong when converting the book';
        case ConversionError.COULD_NOT_SAVE:
            return 'Something went wrong when trying to save the book data';
        case ConversionError.CANCELED:
            return 'The book conversion process was canceled';
        default:
            return 'An unknown error occurred';
    }
}