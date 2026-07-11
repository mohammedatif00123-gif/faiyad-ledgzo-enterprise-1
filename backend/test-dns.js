const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.cluster0.n1cdssl.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('SRV Lookup failed:', err);
  } else {
    console.log('SRV Records:', addresses);
  }
});
