
import fs from 'fs';
import { extname, join } from 'path';
import assert from 'assert';
import Router from 'koa-router';
import * as oss from 'ali-oss';

const debug = require('debug')('Image');
const router = new Router();

assert(process.env.ACCESS_KEY_ID, 'Require ENV.ACCESS_KEY_ID');
assert(process.env.ACCESS_KEY_SECRET, 'Require ENV.ACCESS_KEY_SECRET');
assert(process.env.BUCKET, 'Require ENV.BUCKET');
assert(process.env.ENDPOINT, 'Require ENV.ENDPOINT');

const store = oss.Wrapper({
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  bucket: process.env.BUCKET,
  endpoint: process.env.ENDPOINT,
});

router.get('/', async ctx => {
  ctx.body = `
    <form action="/" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">上传</button>
    </form>
  `;
});

router.get('/:id', async ctx => {
  const { id } = ctx.params || {};
  const { w, p, cache } = ctx.query || {};
  const supportWebp = ctx.accepts('image/webp');

  let process = 'image';
  if (w) {
    process += `/resize,w_${w}`;
  } else if (p) {
    process += `/resize,p_${p}`;
  }

  if (supportWebp) {
    process += `/format,webp`;
  }

  ctx.type = extname(id);
  try {
    const oss = await store.getStream(id, {
      process,
      response: {
        'cache-control': cache && 'public, max-age=31536000',
        'content-encoding': 'gzip',
      },
    });
   
    ctx.set('Cache-Control', oss.res.headers['cache-control']);
    // ctx.set('Content-Encoding', oss.res.headers['content-encoding']);
    ctx.set('Last-Modified', oss.res.headers['last-modified']);
    ctx.set('etag', oss.res.headers['etag']);

    ctx.body = await oss.stream;
  } catch (e) {
    debug(e);
    ctx.status = 404;
  }
});

router.post('/', async ctx => {
  const { oss =  true, files } = ctx.request.body || {};
  if (!files || !files.file) {
    return ctx.status = 400;
  }

  const { name, type, path, size, mtime } = files.file; // input name = file
  const reader = fs.createReadStream(path);

  const data = await store.putStream(name, reader, {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      // 'Content-Encoding': 'gzip',
      // 'Expires': 360000,
    },
  });

  ctx.body = {
    url: join(ctx.origin, ctx.url, data.name),
    ...(oss ? ({ oss: store.signatureUrl(data.name) }) : {}),
  };
});

export default router;