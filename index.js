'use strict';

const dotProp = require('dot-prop');

/**
 * Converts a dot-path to an underscore-path.
 * @param  {string} path String separated by dots
 * @return {string} String separated by underscores
 */
function toUnderscore(path) {
  return transform(path, '.', '_');
}

/**
 * Converts an underscore-path to a dot-path.
 * @param  {string} env String separated by underscores
 * @return {string} String separated by dots
 */
function toDot(env) {
  return transform(env, '_', '.');
}

/**
 * Returns the values of env keys at the path specified.
 * @param  {string} path Dot separated path
 * @param  {string} [defaultValue] Default value to return if there aren't keys in
 * the path provided
 * @param  {object} [opts] Additional options
 * @return {string} The value at the path specified
 */
function get(path, defaultValue, opts) {
  let obj;
  const args = [].slice.call(arguments);
  path = args.shift();
  if (typeof args[args.length - 1] === 'object') {
    opts = args.pop();
  }
  defaultValue = stringify(args.pop());

  keys(path, opts)
    .sort((a, b) => a.length - b.length)
    .forEach(key => {
      let dotp = toDot(key, opts);
      if (!opts || !opts.caseSensitive) {
        dotp = dotp.toLowerCase();
      }

      const val = parse(process.env[key], opts);
      if (dotp === '') {
        obj = val;
      } else {
        if (typeof obj !== 'object') {
          obj = {};
        }
        dotProp.set(obj, dotp, val);
      }
    });

  let prefix = path;
  if (!opts || !opts.caseSensitive) {
    prefix = prefix.toLowerCase();
  }
  if (path === '') {
    return parse(obj, opts);
  }
  return parse(dotProp.get(obj, prefix, defaultValue), opts);
}

/**
 * Sets an env key at the path specified. If nested keys are present they will
 * be deleted.
 * @param  {string} path Dot separated path
 * @param  {string} value Value to set
 * @param  {object} [opts] Additional options
 */
function set(path, value, opts) {
  let env = toUnderscore(path);
  if (!opts || !opts.caseSensitive) {
    env = env.toUpperCase();
  }

  del(path, opts);
  process.env[env] = stringify(value, opts);
}

/**
 * Deletes an env key at the path specified. If nested keys are present they will
 * be deleted too.
 * @param  {string} path Dot separated path
 * @param  {object} [opts] Additional options
 */
function del(path, opts) {
  return keys(path, opts)
    .forEach(key => {
      delete process.env[key];
    });
}

/**
 * Returns whether an env key exists at the path specified.
 * @param  {string} path Dot separated path
 * @param  {object} [opts] Additional options
 * @return {boolean} true if at least an env key with that path exists
 */
function has(path, opts) {
  return keys(path, opts).length > 0;
}

function transform(str, from, to) {
  let out = '';
  const escaped = '\\' + to;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === to) {
      out += escaped;
    } else if (str[i] === from) {
      out += to;
    } else if (str[i] === '\\' && i + 1 < str.length && str[i + 1] === from) {
      out += from;
      i++;
    } else {
      out += str[i];
    }
  }
  return out;
}

function keys(path, opts) {
  let env = toUnderscore(path);

  if (!opts || !opts.caseSensitive) {
    env = env.toUpperCase();
    return Object.keys(process.env)
      .filter(key => key.toUpperCase().startsWith(env));
  }
  return Object.keys(process.env)
    .filter(key => key.startsWith(env));
}

function parse(str, opts) {
  if (typeof str !== 'string') {
    return str;
  }

  let ret;
  if (opts && opts.parse) {
    try {
      ret = JSON.parse(str);
    } catch (err) {
      ret = String(str);
    }
  } else {
    ret = String(str);
  }
  return ret;
}

function stringify(val, opts) {
  if (typeof val === 'string') {
    return val;
  }

  let ret;
  if (opts && opts.stringify) {
    try {
      ret = JSON.stringify(val);
    } catch (err) {
      ret = String(val);
    }
  } else {
    ret = String(val);
  }
  return ret;
}

module.exports = {
  get: get,
  set: set,
  delete: del,
  has: has
};
