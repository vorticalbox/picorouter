/* eslint-disable class-methods-use-this */
import {
  IncomingMessage, ServerResponse,
} from 'http';
import { parse } from 'url';

export interface Query {
  [k: string]: string | string[]
}

export interface Request extends IncomingMessage {
  query: Query
  params: { [k: string]: string }
  body: string | JSON
}

type Context = (req: Request, res: ServerResponse) => void;

export class Router {
  private routes: { [k: string]: any } = {
    GET: {},
    POST: {},
    PATCH: {},
  };

  public use(method: string, url: string, handler: Context) {
    this.routes[method.toUpperCase()][url] = { handler };
    return this;
  }

  public get(url: string, handler: Context) {
    return this.use('GET', url, handler);
  }

  public post(url: string, handler: Context) {
    return this.use('POST', url, handler);
  }

  public patch(url: string, handler: Context) {
    return this.use('PUT', url, handler);
  }

  public delete(url: string, handler: Context) {
    return this.use('DELETE', url, handler);
  }

  public expose() {
    const { routes, parseQuery, loadBody } = this;
    const handler = async (req: IncomingMessage, res: ServerResponse) => {
      const request = req as Request;
      const { url, method } = request;
      if (method && url) {
        const parsedUrl = parse(url);
        let path = parsedUrl.pathname || '';
        if (path.charAt(path.length - 1) !== '/') {
          path = `${path}/`;
        }
        if (parsedUrl.query) {
          request.query = parseQuery(parsedUrl.query);
        }
        try {
          if (['POST', 'PUT'].includes(method)) {
            await loadBody(request);
          }
          const { params, requestHandler } = this.match(routes, method, path);
          request.params = params;
          if (!requestHandler) {
            throw Error('Not Found');
          }
          requestHandler(request, res);
        } catch (error) {
          res.statusCode = error.toString() === 'Error: Not Found' ? 404 : 500;
          res.write(error.toString());
          res.end();
        }
      }
    };
    return handler;
  }

  // eslint-disable-next-line class-methods-use-this
  private parseQuery(query: string) {
    return query.split('&').reduce((acc: { [k: string]: string | string[] }, queryString) => {
      const [key, value] = queryString.split('=');
      if (key.includes('%5B%5D')) {
        const arrayKey = key.replace('%5B%5D', '');
        // it should be an array
        if (!acc[arrayKey]) {
          acc[arrayKey] = [];
        }
        (acc[arrayKey] as string[]).push(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  // eslint-disable-next-line class-methods-use-this
  private loadBody(req: Request) {
    return new Promise((resolve, reject) => {
      req.body = '';
      req.on('data', (data) => {
        req.body += data.toString();
      });
      req.on('end', () => {
        if (req.headers['content-type'] === 'application/json' && typeof req.body === 'string') {
          try {
            req.body = JSON.parse(req.body);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
      req.on('error', reject);
    });
  }

  private match(routes: { [k: string]: any }, method: string, path: string) {
    let params = {};
    let requestHandler;
    const keys = Object.keys(routes[method]);
    for (let i = 0; i < keys.length; i += 1) {
      const route = keys[i];
      const tempParams: { [k: string]: string } = {};
      const parts = path.split('/').filter((p: string) => p !== '');
      const match = route
        .split('/')
        .filter((part) => part.length > 0)
        .map((part, index) => {
          if (part[0] === ':') {
            tempParams[part.substr(1)] = parts[index];
            return '\\w{1,}';
          }
          return part;
        }).join('?\\/');
      const reg = new RegExp(`\\/${match}\\/$`);
      if (reg.test(path)) {
        params = tempParams;
        requestHandler = routes[method][route].handler;
        break;
      }
    }
    return { params, requestHandler };
  }
}
