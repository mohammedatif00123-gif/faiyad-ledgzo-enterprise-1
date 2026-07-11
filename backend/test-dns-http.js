fetch('https://dns.google/resolve?name=cluster0.n1cdssl.mongodb.net&type=TXT').then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2)));
