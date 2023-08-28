import type { Prisma } from "@prisma/client";

export enum ConversionError {
    NO_ERROR = 'NO_ERROR',
    BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
    NO_PROFILE = 'NO_PROFILE',
    FILES_DONT_EXIST = 'FILES_DONT_EXIST',
    NO_PROFILE_WITH_AUTHCODE = 'NO_PROFILE_WITH_AUTHCODE',
    CONVERSION_ERROR = 'CONVERSION_ERROR',
}

export const conversionErrorToString = (e: ConversionError): string => {
    switch (e) {
        case ConversionError.NO_ERROR:
            return 'No error';
        case ConversionError.BOOK_NOT_FOUND:
            return 'The audible book does not exist';
        case ConversionError.NO_PROFILE:
            return 'No profile exists to download this book';
        case ConversionError.FILES_DONT_EXIST:
            return 'The required files do not exist';
        case ConversionError.NO_PROFILE_WITH_AUTHCODE:
            return 'None of the profiles have authcodes downloaded';
        case ConversionError.CONVERSION_ERROR:
            return 'Something went wrong when converting the book';
        default:
            return 'An unknown error occurred';
    }
}