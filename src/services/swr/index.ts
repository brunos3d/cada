import { createStaleWhileRevalidateCache } from 'stale-while-revalidate-cache';

import storage from '../storage';

const swr = createStaleWhileRevalidateCache({
  storage,
  deserialize: JSON.parse,
});

export default swr;
