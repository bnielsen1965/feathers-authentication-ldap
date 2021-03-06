# feathers-authentication-ldap

[![Greenkeeper badge](https://badges.greenkeeper.io/feathersjs/feathers-authentication-ldap.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/feathersjs/feathers-authentication-ldap.png?branch=master)](https://travis-ci.org/feathersjs/feathers-authentication-ldap)
[![Code Climate](https://codeclimate.com/github/feathersjs/feathers-authentication-ldap/badges/gpa.svg)](https://codeclimate.com/github/feathersjs/feathers-authentication-ldap)
[![Test Coverage](https://codeclimate.com/github/feathersjs/feathers-authentication-ldap/badges/coverage.svg)](https://codeclimate.com/github/feathersjs/feathers-authentication-ldap/coverage)
[![Dependency Status](https://img.shields.io/david/feathersjs/feathers-authentication-ldap.svg?style=flat-square)](https://david-dm.org/feathersjs/feathers-authentication-ldap)
[![Download Status](https://img.shields.io/npm/dm/feathers-authentication-ldap.svg?style=flat-square)](https://www.npmjs.com/package/feathers-authentication-ldap)

> LDAP authentication strategy for feathers-authentication using Passport


## Installation

```
npm install feathers-authentication-ldap --save
```

## Documentation

### Usage

In most cases initializing the `feathers-authentication-ldap` module is as simple as doing this:

```js
app.configure(authentication(settings));
app.configure(ldap());
```

This will pull from your global `auth` object in your config file.
It will also mix in the following defaults, which should be customized.

#### Default Options

```js
{
  name: 'ldap',
  server: {
    url: 'ldap://localhost:389',
    bindDn: 'cn=anonymous',
    bindCredentials: '', // bindpw
    searchBase: 'dc=de',
    searchFilter: '(uid={{username}})',
    searchAttributes: null // optional array of props to fetch from ldap
  },
  passReqToCallback: true
}
```

### LDAP Verifier class

The `Verifier` class has a `verify` function that is the passport verify callback. In this module it gets called after LDAP authentication succeeds. By default it does nothing but you can overwrite it to make furthers validation
checks. See [examples/app.js](examples/app.js#L56).

### Usage with `feathers-authentication-jwt`

To authenticate following requests using the jwt use `feathers-authentication-jwt`.  This plugin depends on the `users` Service to populate the user entity.

To get rid of this dependency and store necessary data in the JWT payload see
[examples/app.js](examples/app.js#L47) and [examples/app.js](examples/app.js#L79).


### Asynchronous LDAP Strategy configuration

Per request configuration of the LDAP strategy is supported by taking advantage of
the passport-ldapauth [asynchronous configuration retrieval](https://github.com/vesse/passport-ldapauth#asynchronous-configuration-retrieval)
feature.

This makes it possible to adjust the LDAP settings based on the authentication
request. I.E. An Active Directory server that uses the user's authentication
credentials for binding in place of an anonymous user can leverage this feature
by setting the server bind credentials to the credentials provided in the
authentication request.

To use the asynchronous settings method you include the _asyncOptions_ parameter
when configuring the ldap strategy in the authentication service. The _asyncOptions_
parameter should be set to a function that accepts the authentication request object
and returns a new object with settings that should be merged into the ldap
settings.

#### Example asyncOptions implementation in authentication service

```javascript
/*
Given the following authentication strategy configuration...

"authentication": {
  "ldap": {
    "server": {
      "url": "ldap://<your Active Directory server>/",
      "searchBase": "cn=users,dc=<your Active Directory domain>,dc=local",
      "searchFilter": "(|(userPrincipalName={{username}})(sAMAccountName={{username}}))",
      "searchAttributes": null
    }
  }
},
*/

const authentication = require('@feathersjs/authentication')
const jwt = require('@feathersjs/authentication-jwt')
const local = require('@feathersjs/authentication-local')
const ldap = require('feathers-authentication-ldap')

module.exports = (app) => {
  app
  .configure(authentication(app.get('authentication')))
  .configure(jwt())
  .configure(local())
  // user credentials in authentication request used as the server bind credentials in ldap
  .configure(ldap({
    asyncOptions: req => ({ server: { bindDn: req.body.username, bindCredentials: req.body.password } })
  }))

  app.service('authentication').hooks({
    before: {
      create: [
        authentication.hooks.authenticate(['ldap', 'local', 'jwt'])
      ]
    }
  });

  app.hooks({
    before: {
      all: [authentication.hooks.authenticate('jwt')]
    }
  });

}
```


## Simple Example

Here's an example of a Feathers server that uses `feathers-authentication-ldap`.

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const errors = require('feathers-errors');
const auth = require('feathers-authentication');
const ldap = require('feathers-authentication-ldap');

// Initialize the application
const app = feathers();

// Load configuration, usually done by feathers-configuration
app.set('auth', {
  secret: "super secret",
  ldap: {
    server: {
      url: 'ldap://localhost:389',
      bindDn: 'cn=anonymous',
      bindCredentials: '', // bindpw
      searchBase: 'dc=de',
      searchFilter: '(uid={{username}})'
    }
  }
});

app.configure(rest())
  .configure(hooks())
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))

  // Configure feathers-authentication with ldap
  .configure(auth(app.get('auth')))
  .configure(ldap())

  .use(errorHandler());

// Authenticate the user using the LDAP strategy
// and if successful return a JWT.
app.service('authentication').hooks({
  before: {
    create: [
      auth.hooks.authenticate('ldap')
    ]
  }
});

app.listen(3030);
console.log('Feathers authentication with LDAP auth started on 127.0.0.1:3030');
```

```shell
# Request a token
curl -H "Content-Type: application/json" \
     -X POST \
     -d '{"username":"ldap-user@example.com","password":"admin"}' \
     http://localhost:3030/authentication
```

## License

Copyright (c) 2016

Licensed under the [MIT license](LICENSE).
