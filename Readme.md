# Example-JS-Docker-Iothub-PostgreSQL

This example tell you how to use the WISE-PaaS rabbitmq service to receive and send message use PostgreSQL save it，we use docker package our application。

[cf-introduce Training Video](https://advantech.wistia.com/medias/ll0ov3ce9e)

[IotHub Training Video](https://advantech.wistia.com/medias/up3q2vxvn3)

## Environment Prepare

#### node.js(need include npm)

[node](https://nodejs.org/en/)

#### cf-cli

[cf-cli](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)

Use to push application to WISE-PaaS，if you want to know more you can see this video

#### Docker

[docker](https://www.docker.com/)

Use to packaged our application

#### Postgrsql

You can download pgAdmin so you can see the result in WISE-PaaS Postgresql servince instance

[https://www.postgresql.org/](https://www.postgresql.org/)

#### Download this repository

    #download this repository
    git clone https://github.com/WISE-PaaS/example-js-docker-iothub-postgresql.git

    #download what package the application need
    npm install

## Application Introduce

#### `index.js`

Simple backend application and what package what we need。

```js
const mqtt = require("mqtt");
const express = require("express");
const moment = require("moment");
const { Pool } = require("pg");

const app = express();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(` -- Server started on port ${port}!`);
});
```

The `vcapServices` can get the application environment on WISE-PaaS，so we can get our service config to connect it。

```js
// ----- Remote DB --- Get env variables
const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
postgresql_service_name = "postgresql-innoworks";
const host = vcap_services[postgresql_service_name][0].credentials.host;
const user = vcap_services[postgresql_service_name][0].credentials.username;
const password = vcap_services[postgresql_service_name][0].credentials.password;
const dbPort = vcap_services[postgresql_service_name][0].credentials.port;
const database = vcap_services[postgresql_service_name][0].credentials.database;

const pool = new Pool({
  host: host,
  user: user,
  password: password,
  port: dbPort,
  database: database,
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000
});
```

![Imgur](https://i.imgur.com/B7Zgfk1.png)
(Notice:The postgresql_service_name need to same as WISE-PaaS Service name)
![Imgur](https://i.imgur.com/6777rmg.png)

![Imgur](https://i.imgur.com/ajqSsn1.png)
(Notice:You can add service instance by yourself)

This code define the `group、schema、table` and we create schema and table and bind to group。

```js
group_name = "groupFamily";
schema_name = "home";
table_name = "temperature";
// SQL commands for creating table for storing data
const queryString = `
  CREATE SCHEMA IF NOT EXISTS "${schema_name}";
  ALTER SCHEMA "${schema_name}" OWNER TO "${group_name}";
  CREATE TABLE IF NOT EXISTS "${schema_name}"."${table_name}"(
    id serial,
    timestamp timestamp (2) default current_timestamp,
    temperature integer,
    PRIMARY KEY (id)
  );
  ALTER TABLE "${schema_name}"."${table_name}" OWNER to "${group_name}";
  GRANT ALL ON ALL TABLES IN SCHEMA "${schema_name}" TO "${group_name}";
  GRANT ALL ON ALL SEQUENCES IN SCHEMA "${schema_name}" TO "${group_name}";
  `;

// Execute the SQL commands for startup
pool
  .query(queryString)
  .then(result => {
    console.log("@" + formatTime() + " -- Schema and table initialized.");
  })
  .catch(err => console.error("Error adding table...", err.stack));

app.get("/", (req, res) => {
  res.send("hello world");
});

app.get("/temps", (req, res) => {
  const queryString = `
    SELECT * 
      FROM (SELECT * FROM ${schema_name}.${table_name} ORDER BY timestamp DESC LIMIT ${numOfTempsReturned})
      AS lastRows
      ORDER BY timestamp ASC;
    `;
  pool
    .query(queryString) // No need to connect
    .then(result => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      // Format timestamp
      result.rows.map(row => {
        row.timestamp = moment(row.timestamp).format("MM-DD HH:mm:ss");
      });
      res.send({ temperatures: result.rows });
      // res.render('index', { recipes: result['rows'] });
    })
    .catch(err => console.error("Error executing query...", err.stack));
});
```

Connect to the rabbitmq service and insert data use `client.on('message',...)`

```js
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
rabbitmq_service_name = "p-rabbitmq";
const mqttUri =
  vcapServices[rabbitmq_service_name][0].credentials.protocols.mqtt.uri;

const client = mqtt.connect(mqttUri);

// Subscribe
client.on("connect", connack => {
  client.subscribe("home/temperature", (err, granted) => {
    if (err) console.log(err);

    console.log(
      "@" + formatTime() + " -- Subscribed to the topic: home/temperature"
    );
  });
});

// Receiving data
client.on("message", (topic, message, packet) => {
  let time = formatTime();
  console.log(`@${time} -- Got data from: ${topic}`);

  // mock temperature data
  const temp = message.toString();

  const queryString =
    "INSERT INTO home.temperature(temperature) VALUES($1) RETURNING *";
  const values = [temp];

  pool
    .query(queryString, values)
    .then(result => {
      console.log("Data added: ", result["rows"][0]);
    })
    .catch(err => console.error("Error adding data...", err.stack));
});

// Return current formatted time
function formatTime() {
  const currentDate = new Date();
  return (
    currentDate.getHours() +
    ":" +
    currentDate.getMinutes() +
    ":" +
    currentDate.getSeconds()
  );
}
```

(Notice:The `rabbitmq_service_name`also need to same as WSIE-PaaS)
![Imgur](https://i.imgur.com/jmQD5L4.png)

## Docker

Dockerfile can help us download the package what we need。

Dockerfile

```docker
FROM node:8-alpine

COPY . /app
ADD . /app
WORKDIR /app
RUN npm install

EXPOSE 3000
CMD npm start
```


#### Build docker image in local

    docker build -t {image name} .
    docker build -t example-js-docker-iotpost .

#### Go to docker hub add a new **Repository**

Tag image to a docker hub  
[Docker Hub](https://hub.docker.com/)

    #docker tag {image name} {your account/dockerhub-resp name}
    docker tag example-js-docker-iotpost WISE-PaaS/example-js-docker-iotpost

#### Push it to docker hub

    #login to the docker hub
    docker login

    #docker push {your account/dockerhub-resp name}
    docker push WISE-PaaS/example-js-docker-iotpost

#### Use cf(cloud foundry) push to WISE-PaaS

![Imgur](https://i.imgur.com/JNJmxFy.png)

    #cf login -a api.{domain name} -u {WISE-PaaS/EnSaaS account} -p {WISE-PaaS/EnSaaS password}
    cf login -a api.wise-paas.io -u xxxxx@advantech.com -p xxxxxxxx

    #cf push --docker-image {your account/dockerhub-resp} --no-start
    cf push --docker-image tsian077/example-js-docker-iotpost --no-start

The **postgresql_service_name** and **iothub_service_name** must be same in WISE-PaaS Service Instance name
![Imgur](https://i.imgur.com/VVMcYO8.png)

Bind the service instance to our application，and the group we define in code must be same。

    cf bs {application name} {postgresql_service_name} -c '{\"group\":\"groupFamily\"}'
    cf bs example-js-docker-iotpost postgresql -c '{\"group\":\"groupFamily\"}'


    cf bs {application name} {iothub_service_name}
    cf bs example-js-docker-iotpost rabbitmq

    cf start {application name}
    cf start example-js-docker-iotpost

#### Push successful

Get application environment in WISE-PaaS

    #cf env {application_nmae} > env.json
    cf env example-js-docker-iot-mongo > env.json

## Publisher data to our application

#### publisher.js

```js
const mqtt = require("mqtt");

const mqttUri =
  "mqtt://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx%3Af4e2645e-469d-4d37-b3fd-cdb830e999a5:VhHlRCA9nEMOauXaKGhyv78ol@40.81.26.31:1883";
const client = mqtt.connect(mqttUri);

client.on("connect", connack => {
  setInterval(() => {
    publistMockTemp();
  }, 3000);
});

function publistMockTemp() {
  const temp = Math.floor(Math.random() * 7 + 22);

  client.publish(
    "home/temperature",
    temp.toString(),
    { qos: 2 },
    (err, packet) => {
      if (!err) console.log("Data sent to home/temperature -- " + temp);
    }
  );
}
```

#### Edit the **publisher.py** `mqttUri` to mqtt=>uri you can find in env.json

when you get it you need to change the host to externalHosts

![Imgur](https://i.imgur.com/xErDczu.png)

to

![Imgur](https://i.imgur.com/YsSUgaz.png)

- uri :"VCAP_SERVICES => p-rabbitmq => mqtt => uri"
- exnternalhost : "VCAP_SERVICES => p-rabbitmq => externalHosts"

open two terminal

    #cf logs {application name}
    cf logs example-js-docker-iothub

.

    node publisher.js

(The apllication name maybe different)
![Imgur](https://i.imgur.com/7TVqrC1.png)

#### You can watch the row data use Postgresql-pgAdmin，and the config can find in WISE-PaaS Application Environment(WISE-PaaS/EnSaaS => application List => click application => environment)

pgAdmin create server(Servers => right click => Create => Server)

- address => VCAP_SERVICES => mongodb-innoworks => 0 => external_host
- Database => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => database
- Username => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => username
- Password => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => password

![Imgur](https://i.imgur.com/cZJ6bQT.png)


(Databases => Schemas => Tables => right click => View/Edit data)

![Imgur](https://i.imgur.com/Jbj8u2c.png)
