// Debug logging for tycoslide
// Enable with DEBUG=tycoslide

import createDebug from 'debug';

const debug = createDebug('tycoslide');

// Custom formatter: %f → 3 decimal places (debug only supports %s %d %o %O %j)
createDebug.formatters.f = (v: number) => v.toFixed(3);

export const log = debug;
