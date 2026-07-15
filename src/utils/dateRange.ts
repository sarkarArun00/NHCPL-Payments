export type DateRange = {
    fromDate: string;
    toDate: string;
};

function formatApiDate(
    date: Date,
): string {
    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
        date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getLastSevenDaysRange(): DateRange {
    const toDate = new Date();

    const fromDate = new Date(toDate);

    /*
     * Includes today and the previous six days.
     */
    fromDate.setDate(
        fromDate.getDate() - 6,
    );

    return {
        fromDate: formatApiDate(fromDate),
        toDate: formatApiDate(toDate),
    };
}