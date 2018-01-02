# github.com/reymont/fluentd2kibana

fluentd中提供hostname和micro_service的信息，保存到elasticsearch中。elasticsearch对这两个字段建立索引

```json
{"hostname":"172.20.62.94","micro_service":"translate-service"}
```

使用http GET请求，即可生成对应查询索引

```sh
node app.js
curl -XGET localhost:3000/kibana?type=jtp_java_log
```

可通过Management手工维护查询条件
Management -> Saved Objects -> Searches 

参考：
* http://xiaorui.cc/2015/06/09/通过elasticsearch自动化创建kibana的visualize图表及dashboard
* https://github.com/developit/express-es6-rest-api
* https://github.com/reymont/ReadAndLearn/tree/master/system/linux/ELK/elasticsearch-js/fluentd2kibana
* https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference-5-6.html
* https://expressjs.com/en/starter/hello-world.html
* https://github.com/elastic/elasticsearch-js
