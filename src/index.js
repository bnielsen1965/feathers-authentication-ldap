import Debug from 'debug';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import {Strategy as LdapStrategy} from 'passport-ldapauth';

const debug = Debug('feathers-authentication-ldap');
const defaults = {
  name: 'ldap',
  server: {
    url: 'ldap://localhost:389',
    bindDn: 'cn=anonymous',
    bindCredentials: '',
    searchBase: 'dc=de',
    searchFilter: '(uid={{username}})',
    searchAttributes: null
  },
  passReqToCallback: true
};

function defaultVerifier (req, user, done) {
  // no further validation, LDAP Account is valid
  debug('Received ldap user:', user);
  done(null, user);
}

// Export ldap-auth init function
export default function init (options = {}) {
  return function ldapAuth () {
    const app = this;
    const _super = app.setup;
    if (!app.passport) {
      throw new Error(`Can not find app.passport. Did you initialize feathers-authentication before feathers-authentication-ldap?`);
    }

    // Construct localSettings for passport ldap strategy
    let name = options.name || defaults.name;
    let authOptions = app.get('auth') || {};
    let localOptions = authOptions[name] || {};
    const localSettings = merge({}, defaults, localOptions, omit(options, ['Verifier']));

    // make verifier function overwriteable
    let verifier = defaultVerifier;
    if (options.Verifier) verifier = options.Verifier;

    // plugin setup: register strategy in feathers passport
    app.setup = function () {
      if (!verifier) throw new Error(`Your verifier must be a function: Verifyer(request, user, done)`);

      // Register 'ldap' strategy with passport
      debug('Registering ldap authentication strategy with options:', localSettings);
      app.passport.use(localSettings.name, new LdapStrategy(localSettings, verifier));
      app.passport.options(localSettings.name, localSettings); // do we need this ??

      // TODO: explain
      return _super.apply(this, arguments);
    };
  };
}

// Exposed Modules
Object.assign(init, {
  defaults,
  Verifier: defaultVerifier
});
