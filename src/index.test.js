const http = require("http");
const { get, put } = require("got");
const { Server, express, requestHandler } = require("./index.js");

const noRetry = { throwHttpErrors: false, retry: 0 };
const port = 9875;
const prefixUrl = `http://localhost:${port}`;

let conflictingServer = http.createServer();
let server = new Server({ port, routers: [] });

beforeEach(() => {
  server = new Server({ port, routers: [] });
});

test.each([9874, 8736])("starts listening for requests", async (port) => {
  server = new Server({ port, routers: [] });
  await server.start();

  await expect(get(`http://localhost:${port}`, noRetry)).toResolve();
});

test("stops listening for requests", async () => {
  await server.start();
  await server.stop();

  await expect(get(prefixUrl, noRetry)).toReject();
});

test("cleanly stops when it has never been started", async () => {
  const promise = server.stop();

  await expect(promise).toResolve();
});

test("cleanly stops when it has previously been cycled", async () => {
  await server.start();
  await server.stop();
  const promise = server.stop();

  await expect(promise).toResolve();
});

test("gracefully passes through asynchronous startup failures", async () => {
  conflictingServer.listen(port);

  const promise = server.start();

  await expect(promise).toReject();
});

test("gracefully passes through synchronous startup failures", async () => {
  server = new Server({ port: 65_536, routers: [] });

  const promise = server.start();

  await expect(promise).toReject();
});

test("routes requests to the correct router", async () => {
  const firstResponse = { first: "value" };
  const firstRouter = new express.Router().get(
    "/sub/path",
    requestHandler(async (request, response) => {
      response.json(firstResponse);
    })
  );
  const secondResponse = { second: "value" };
  const secondRouter = new express.Router().put(
    "/other/path",
    requestHandler(async (request, response) => {
      response.json(secondResponse);
    })
  );
  server = new Server({
    port,
    routers: /** @type RequestRouter[] */ [
      { path: "/first/path", router: firstRouter },
      { path: "/second", router: secondRouter },
    ],
  });
  await server.start();

  const first = await get("first/path/sub/path", { prefixUrl }).json();
  const second = await put("second/other/path", { prefixUrl }).json();

  expect(first).toEqual(firstResponse);
  expect(second).toEqual(secondResponse);
});

afterEach(async () => {
  await server.stop();
  conflictingServer.close();
});
