const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Hello World!'))

// Create a client instance
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: '192.168.99.100:9200',
  log: 'trace'
});

//Send a HEAD request to / and allow up to 1 second for it to complete.
client.ping({
  // ping usually has a 3000ms timeout
  requestTimeout: 1000
}, function (error) {
  if (error) {
    console.trace('elasticsearch cluster is down!');
  } else {
    console.log('All is well');
  }
});

// Skip the callback to get a promise back
client.search({
  q: 'pants'
}).then(function (body) {
  var hits = body.hits.hits;
}, function (error) {
  console.trace(error.message);
});

// Find tweets that have "elasticsearch" in their body field
// client.search({
//   index: 'twitter',
//   type: 'tweets',
//   body: {
//     query: {
//       match: {
//         body: 'elasticsearch'
//       }
//     }
//   }
// }).then(function (resp) {
//     var hits = resp.hits.hits;
// }, function (err) {
//     console.trace(err.message);
// });

app.listen(3000, () => console.log('Example app listening on port 3000!'))