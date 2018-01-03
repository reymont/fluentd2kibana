const config = require('./config.json');
const express = require('express')
const app = express()
const elasticsearch = require('elasticsearch');
const schedule = require('node-schedule');
const client = new elasticsearch.Client({
    host: config.eshost||'192.168.99.100:9200',
    log: 'error'
    //log: 'trace'
});

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/kibana', (req, res) => {
    updateKibanaSearch(req.query.type);
    res.json({
        data: "Done"
    });
});

schedule.scheduleJob(config.schedule, function () {
    // console.log(JSON.stringify(config, null, 4));
    updateKibanaSearch();
    console.log(new Date()+' Update kibana search filter!');
});

function updateKibanaSearch(searchType) {
    let body = {
        "query": {
            "match_all": {}
        },
        "aggs": {
            "hostnames": {
                "terms": {
                    "field": "hostname.keyword",
                    size: 100
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

    let jsonResult = new Array();

    client.search({
            index: 'logstash-*',
            type: searchType || "jtp_java_log",
            body: body
        }).then(results => {
            console.log(`found ${results.hits.total} items in ${results.took}ms`);
            console.log(`aggregations values.`);

            results.aggregations.hostnames.buckets.forEach((hit_hostname, index = index++) => {
                client.search({
                    index: '.kibana',
                    type: 'index-pattern'
                }).then(function (results) {
                    //console.log(JSON.stringify(results, null, 4));
                    // 获取默认的kibana id
                    let searchId = results.hits.hits[0]._id;

                    // 以主机ip为主键
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
                        // 默认屏蔽micro_service查询条件
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
                        // 判断是否存在过滤器
                        if (hits && hits.length > 0 && hits[0]._id) {
                            client.index({
                                index: ".kibana",
                                type: "search",
                                id: hits[0]._id, //update the index
                                body: {
                                    "title": hit_hostname.key,
                                    "columns": [
                                        "msg",
                                        "log"
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
                        } else {
                            // add new index
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

        })
        .catch(console.error);
}

app.listen(config.port||3000, () => console.log('Example app listening on port '+config.port+'!'))