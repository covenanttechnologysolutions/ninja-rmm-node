# ninja-rmm-node

## Installation

```bash
npm install ninja-rmm-node
```

## Usage

CommonJS

```javascript
const NinjaRMM = require('ninja-rmm-node')
```

ESM
```javascript
import NinjaRMM from 'ninja-rmm-node'
```

## Options

For headless (API/M2M), use `client_credentials` grantType.  Defaults to `client_credentials`. 

```javascript
const options = {
  grantType: 'client_credentials',
  region: 'na',
  clientSecret,
  clientId,
  scope: 'monitoring management control',
}

const ninja = new NinjaRMM(options)
```

For interactive login, use `authorization_code`.  The default browser will open to prompt for user authentication.  Note: this will not work if trying to run this module in the browser.  

```javascript
const options = {
  grantType: 'authorization_code',
  region: 'na',
  clientSecret,
  clientId,
  scope: 'monitoring management control offline_access',
}
```

If you've previously requested a `refresh_token` with `offline_access` scope, use grantType `refresh_token`:

```javascript
const options = {
  grantType: 'refresh_token',
  region: 'na',
  clientSecret,
  clientId,
  refreshToken: 'mytoken'
}
```


## Usage

See [documentation](https://app.ninjarmm.com/apidocs-beta/core-resources) for a list of endpoints and parameters. 

Using async/await:
```javascript

/**
 * @param {string} path
 * @param {string} [method]
 * @param {object} [params]
 * @param {object} [data] if method is POST or PUT, this is put in the body
 * @returns {Promise<*>}
 */
const result = await ninja.request({path: '/api/v2/organizations'})
```
Or with promises:
```javascript
ninja.request(options)
  .then(result => {
    // use result
  })
```

Generate a token for use elsewhere with these static methods:
```javascript
const token = await NinjaRMM.generateTokenClientCredentials({clientSecret, clientId, scope, region})
const token = await NinjaRMM.generateTokenRefresh({clientSecret, clientId, region, refreshToken})
const token = await NinjaRMM.generateTokenAuthorizationCode({clientSecret, clientId, region, scope})
```
