const mqtt = require("mqtt");
const express = require("express");
const moment = require("moment");
const { Pool } = require("pg");

const app = express();
const numOfTempsReturned = 30;

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(` -- Server started on port ${port}!`);
});

// -- Get env variables for rabbitmq service
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
