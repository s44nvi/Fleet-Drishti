// The padded content column's spacing, shared by AppShell (which applies it)
// and anything that needs to bleed back out to the column's edges — e.g. the
// city-banner page header. Keep the pairs in sync: BLEED is the
// exact negative of PADDING's horizontal and top values.
export const CONTENT_PADDING = "px-4 py-5 sm:px-6 lg:py-6";
export const CONTENT_BLEED_X = "-mx-4 sm:-mx-6";
export const CONTENT_BLEED_TOP = "-mt-5 lg:-mt-6";
