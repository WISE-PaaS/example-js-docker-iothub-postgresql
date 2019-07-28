const mqtt = require("mqtt");

const mqttUri =
  "mqtt://d409dc8f-af4d-4d68-b586-3721df301816%3Af4e2645e-469d-4d37-b3fd-cdb830e999a5:VhHlRCA9nEMOauXaKGhyv78ol@40.81.26.31:1883";
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
