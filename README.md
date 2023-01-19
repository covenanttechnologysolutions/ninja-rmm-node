# node-ninja-rmm

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
