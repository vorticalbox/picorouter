# picorouter

Is a no frills zero dependency router for nodes HTTP server.

lets you see and handle raw node requests and responses as 
nothing is abstracted such as `res.json()` see examples

## Features
- url parameters `users/:id`
- query processing places into req.query
- json body parsing when json content type is set


### Example
```javascript
import { Router } from 'picoreouter';
// javascript
const Router = require('picorouter');

const router = new Router();

router.get('/test', (req: Request, res: ServerResponse) => {
  res.statusCode = 200;
  res.write('Hello World!');
  res.end();
}).post('/test', (req: Request, res: ServerResponse) => {
  res.statusCode = 200;
  res.write(req.body);
  res.end();
}).post('/test/:name', (req: Request, res: ServerResponse) => {
  res.statusCode = 200;
  res.write(JSON.stringify({ body: req.body, params: req.params }));
  res.end();
}).get('/test/:name', (req: Request, res: ServerResponse) => {
  const { name } = req.params;
  res.statusCode = 200;
  res.write(name);
  res.end();
}).get('/test/:name/123', (req: Request, res: ServerResponse) => {
  const { name, id } = req.params;
  res.statusCode = 200;
  res.write(JSON.stringify({ name, id }));
  res.end();
});

createServer(router.expose()).listen(8080);
```