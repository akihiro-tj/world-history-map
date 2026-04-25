export type HistoricalYearString = string;

export type HashedFilename = string;

export type Manifest = Readonly<Record<HistoricalYearString, HashedFilename>>;
