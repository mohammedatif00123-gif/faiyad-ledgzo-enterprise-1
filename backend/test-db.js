const mongoose = require('mongoose');
const uri = "mongodb://fahadhussain9307_db_user:MyPassword123@ac-8jzl2ol-shard-00-00.n1cdssl.mongodb.net:27017,ac-8jzl2ol-shard-00-01.n1cdssl.mongodb.net:27017,ac-8jzl2ol-shard-00-02.n1cdssl.mongodb.net:27017/ledgzo?ssl=true&authSource=admin&replicaSet=atlas-jsndwo-shard-0&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("Connection successful!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
  });
