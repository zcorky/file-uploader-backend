import Koa from 'koa';
import bodyParser from 'koa-body';
import logger from 'koa-logger';
import staticServe from 'koa-static';
import compress from 'koa-compress';

import router from './router';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const app = new Koa();

const ignoreAssets = mw => async function (ctx, next) {
  return /(\.js|\.css|\.ico)$/.test(ctx.path)
    ? await next()
    : await mw.call(this, ctx, next);
}

app.use(compress());
app.use(staticServe(`${__dirname}/client`));
app.use(bodyParser({
  multipart: true,
}));
app.use(ignoreAssets(logger()));

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, HOST, () => {
  console.log(`app start at ${HOST}:${PORT}`);
});

app.on('error', err => {
  console.log('error: ', err.message);
  process.exit(1);
})
