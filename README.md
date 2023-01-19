# node-ninja-rmm

## Installation

```bash
npm install node-ninja-rmm
```

## Usage

CommonJS

```javascript
const NinjaRMM = require('node-ninja-oauth')
```

ESM
```javascript
import NinjaRMM from 'node-ninja-oauth'
```

## Options

Uses `client_credentials` auth. 

```javascript
const options = {
  region: 'na',
  clientSecret,
  clientId,
  scope: 'monitoring management control',
}

const ninja = new NinjaRMM(options)
```

```javascript
const result = await ninja.request({path: '/api/v2/organizations', method: 'get'})
```
