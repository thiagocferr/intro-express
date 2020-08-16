import { app, bootstrap as setupApp } from './app';

const { PORT } = process.env;

(async function () {
  await setupApp();

  app.listen(PORT, () => console.log(`server running on port ${PORT}`));
})();
