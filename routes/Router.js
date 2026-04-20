class Router {
  constructor() {
    this.namedRoutes = {};
    this.routeGroups = [];
    this._routes     = [];
  }

  _currentPrefix() {
    return this.routeGroups.map((g) => g.prefix || '').join('');
  }

  _currentMiddleware() {
    return this.routeGroups.flatMap((g) => g.middleware || []);
  }

  group({ prefix = '', middleware = [] }, callback) {
    this.routeGroups.push({ prefix, middleware });
    callback(this);
    this.routeGroups.pop();
    return this;
  }

  _register(method, path, ...handlers) {
    const fullPath        = this._currentPrefix() + path;
    const groupMiddleware = this._currentMiddleware();
    const allHandlers     = [...groupMiddleware, ...handlers];
    const entry           = { method: method.toUpperCase(), path: fullPath, handlers: allHandlers };
    this._routes.push(entry);

    const self   = this;
    const fluent = {
      _entry: entry,
      name(routeName) {
        self.namedRoutes[routeName] = fullPath;
        entry.name = routeName;
        return this;
      },
    };
    return fluent;
  }

  get(path, ...handlers)    { return this._register('get',    path, ...handlers); }
  post(path, ...handlers)   { return this._register('post',   path, ...handlers); }
  put(path, ...handlers)    { return this._register('put',    path, ...handlers); }
  patch(path, ...handlers)  { return this._register('patch',  path, ...handlers); }
  delete(path, ...handlers) { return this._register('delete', path, ...handlers); }

  mount(app) {
    this._routes.forEach(({ method, path, handlers }) => {
      app[method.toLowerCase()](path, ...handlers);
    });
  }

  list() {
    console.log('\n��� Registered Routes:');
    console.log('─'.repeat(70));
    this._routes.forEach(({ method, path, name }) => {
      const label = name ? `  [${name}]` : '';
      console.log(`  ${method.padEnd(7)} ${path.padEnd(40)}${label}`);
    });
    console.log('─'.repeat(70) + '\n');
  }

}

const router = new Router();

function route(name, params = {}) {
  const path = router.namedRoutes[name];
  if (!path) throw new Error(`Named route "${name}" not found.`);
  return path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    if (params[key] === undefined) throw new Error(`Missing param "${key}" for route "${name}"`);
    return params[key];
  });
}

/**
 * csrf(method?) — outputs CSRF token field + optional method override.
 *
 * USAGE:
 *   <%- csrf() %>           → just the CSRF token (for POST forms)
 *   <%- csrf('PUT') %>      → CSRF token + method override to PUT
 *   <%- csrf('DELETE') %>   → CSRF token + method override to DELETE
 *
 * OUTPUTS for csrf('PUT'):
 *   <input type="hidden" name="_csrf"   value="a3f9..."/>
 *   <input type="hidden" name="_method" value="PUT"/>
 */
function csrf(token, method = null) {
  let fields = `<input type="hidden" name="_csrf" value="${token}"/>`;
  if (method) {
    fields += `\n  <input type="hidden" name="_method" value="${method.toUpperCase()}"/>`;
  }
  return fields;
}

/**
 * safeRoute — like route() but returns '#' if the route doesn't exist.
 * Used in layouts for nav links that may not be built yet.
 */
function safeRoute(name, params = {}) {
  try {
    return route(name, params);
  } catch {
    return route('coming.soon');
  }
}

module.exports = { router, route, safeRoute, csrf };