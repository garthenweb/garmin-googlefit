import fs from 'fs';
const storePath = `${__dirname}/storage.json`;
const read = () => new Promise(
  (resolve, reject) => fs.readFile(storePath, 'utf8', (err, store) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(JSON.parse(store));
  })
);

const write = (store) => new Promise(
  (resolve, reject) => fs.writeFile(storePath, JSON.stringify(store, null, '  '), (err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  })
);

export default {
  async get(key) {
    const store = await read();
    if (key) {
      return store[key];
    }
    return store;
  },

  async set(key, value) {
    const store = await read();
    store[key] = value;
    await write(store);
    return store;
  },
};
