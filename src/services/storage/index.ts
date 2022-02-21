import path from 'path';
import { LocalStorage } from 'node-localstorage';

export default new LocalStorage(path.join(process.cwd(), 'localstorage'));
