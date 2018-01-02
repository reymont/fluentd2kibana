const express = require('express')
const app = express()
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    //host: '192.168.99.100:9200',
    host: '172.20.62.42:9200',
    log: 'error'
    //log: 'trace'
});

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/kibana', (req, res) => {
    let body = {
        "query": {
            "match_all": {}
        },
        "aggs": {
            "hostnames": {
                "terms": {
                    "field": "hostname.keyword"
                },

                "aggs": {
                    "micro_service": {
                        "terms": {
                            "field": "micro_service.keyword"
                        }
                    }
                }
            }
        }
    };
    client.search({
            index: 'logstash-*',
            type: 'jtp_java_log',
            body: body
        }).then(results => {
            console.log(`found ${results.hits.total} items in ${results.took}ms`);
            console.log(`aggregations values.`);

            let jsonResult = new Array();
            results.aggregations.hostnames.buckets.forEach((hit_hostname, index = index++) => {
                client.search({
                    index: '.kibana',
                    type: 'index-pattern'
                }).then(function (results) {
                    //console.log(JSON.stringify(results, null, 4));
                    let searchId = results.hits.hits[0]._id;

                    let searchJson = {
                        index: searchId,
                        highlightAll: true,
                        version: true,
                        query: {
                            match_all: {}
                        },
                        filter: [{
                            meta: {
                                alias: hit_hostname.key,
                                disabled: false,
                                index: searchId,
                                key: "hostname",
                                negate: false,
                                type: "phrase",
                                value: hit_hostname.key
                            },
                            query: {
                                match: {
                                    hostname: {
                                        query: hit_hostname.key,
                                        type: "phrase"
                                    }
                                }
                            }
                        }]
                    };

                    var data = new Array();
                    hit_hostname.micro_service.buckets.forEach((hit_micro_service, index = index++) => {
                        searchJson.filter[searchJson.filter.length] = {
                            meta: {
                                alias: hit_micro_service.key,
                                disabled: true,
                                index: searchId,
                                key: "micro_service",
                                negate: false,
                                type: "phrase",
                                value: hit_micro_service.key
                            },
                            query: {
                                match: {
                                    micro_service: {
                                        query: hit_micro_service.key,
                                        type: "phrase"
                                    }
                                }
                            }
                        }

                        data[index] = {
                            key: hit_micro_service.key,
                            //doc_count: hit.doc_count
                        }
                    });
                    jsonResult[index] = {
                        key: hit_hostname.key,
                        //doc_count: hit.doc_count,
                        data: data
                    }
                    client.search({
                        index: '.kibana',
                        type: 'search',
                        body: {
                            query: {
                                term: {
                                    title: hit_hostname.key || ""
                                }
                            }
                        }
                    }).then(function (results) {
                        var hits = results.hits.hits;
                        // console.log(JSON.stringify(hits, null, 4));
                        if (hits && hits.length > 0 && hits[0]._id) {
                            client.index({
                                index: ".kibana",
                                type: "search",
                                id: hits[0]._id, //update the index
                                body: {
                                    "title": hit_hostname.key,
                                    "columns": [
                                        "msg"
                                    ],
                                    "sort": [
                                        "@timestamp",
                                        "desc"
                                    ],
                                    "kibanaSavedObjectMeta": {
                                        "searchSourceJSON": JSON.stringify(searchJson, null, 4)
                                    }
                                }
                            }, function (error, response) {

                            });
                            //console.log(JSON.stringify(jsonResult[index]));
                        }else{
                            client.index({
                                index: ".kibana",
                                type: "search",
                                body: {
                                    "title": hit_hostname.key,
                                    "columns": [
                                        "msg"
                                    ],
                                    "sort": [
                                        "@timestamp",
                                        "desc"
                                    ],
                                    "kibanaSavedObjectMeta": {
                                        "searchSourceJSON": JSON.stringify(searchJson, null, 4)
                                    }
                                }
                            }, function (error, response) {

                            });
                        }
                    })
                });
            });
            res.json({
                data: jsonResult
            });
        })
        .catch(console.error);
});

app.get('/kibana', (req, res) => {
    client.search({
        index: '.kibana',
        type: 'search',
        body: {
            query: {
                term: {
                    title: req.query.hostname || ""
                }
            }
        }
    }).then(function (results) {
        var hits = results.hits.hits;
        console.log(JSON.stringify(hits, null, 4));
        if (hits && hits.length > 0 && hits[0]._id) {
            res.send(hits[0]._id);
        } else {
            res.send("None Id!");
        }
    }, function (err) {
        console.trace(err.message);
    });
})

// POST method create new index
app.post('/kibana', function (req, res) {
    client.search({
        index: '.kibana',
        type: 'index-pattern'
    }).then(function (results) {
        //console.log(JSON.stringify(results, null, 4));
        let searchId = results.hits.hits[0]._id;
        let searchJson = {
            index: searchId,
            highlightAll: true,
            version: true,
            query: {
                match_all: {}
            },
            filter: [{
                meta: {
                    alias: req.body.hostname,
                    disabled: false,
                    index: searchId,
                    key: "hostname",
                    negate: false,
                    type: "phrase",
                    value: req.body.hostname
                },
                query: {
                    match: {
                        hostname: {
                            query: req.body.hostname,
                            type: "phrase"
                        }
                    }
                }
            }]
        };


        if (req.body.micro_service) {
            searchJson.filter[searchJson.filter.length] = {
                meta: {
                    alias: req.body.micro_service,
                    disabled: false,
                    index: searchId,
                    key: "micro_service",
                    negate: false,
                    type: "phrase",
                    value: req.body.micro_service
                },
                query: {
                    match: {
                        micro_service: {
                            query: req.body.micro_service,
                            type: "phrase"
                        }
                    }
                }
            }
        }

        client.search({
            index: '.kibana',
            type: 'search',
            body: {
                query: {
                    term: {
                        title: req.body.hostname || ""
                    }
                }
            }
        }).then(function (results) {
            var hits = results.hits.hits;
            // console.log(JSON.stringify(hits, null, 4));
            // console.log("----------------------------------------");
            // console.log(hits[0]._source.kibanaSavedObjectMeta.searchSourceJSON)
            if (hits && hits.length > 0 && hits[0]._id) {
                client.index({
                    index: ".kibana",
                    type: "search",
                    id: hits[0]._id, //update the index
                    body: {
                        "title": req.body.hostname,
                        "columns": [
                            "msg"
                        ],
                        "sort": [
                            "@timestamp",
                            "desc"
                        ],
                        "kibanaSavedObjectMeta": {
                            "searchSourceJSON": hits[0]._source.kibanaSavedObjectMeta.searchSourceJSON +
                                JSON.stringify(searchJson, null, 4)
                        }
                    }
                }, function (error, response) {

                });
                res.send(hits[0]._id);
            } else {
                client.index({
                    index: ".kibana",
                    type: "search",
                    body: {
                        "title": req.body.hostname,
                        "columns": [
                            "msg"
                        ],
                        "sort": [
                            "@timestamp",
                            "desc"
                        ],
                        "kibanaSavedObjectMeta": {
                            "searchSourceJSON": JSON.stringify(searchJson, null, 4)
                        }
                    }
                }, function (error, response) {

                });
                res.send("None id!");
            }
        }, function (err) {
            console.trace(err.message);
        });


    }, function (err) {
        console.trace(err.message);
    });
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))