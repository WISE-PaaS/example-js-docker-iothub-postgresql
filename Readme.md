# Example-JS-Docker-Iothub-PostgreSQL

This example tell you how to use the WISE-PaaS rabbitmq service to receive and send message use PostgreSQL save it，we use docker package our application。

#### Environment Prepare

node.js(need include npm)

[https://nodejs.org/en/](https://nodejs.org/en/)

cf-cli

[https://docs.cloudfoundry.org/cf-cli/install-go-cli.html](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)

docker

[https://www.docker.com/](https://www.docker.com/)

#### Download this repository

    git clone https://github.com/WISE-PaaS/example-js-docker-iothub/

#### Check our the service name in `index.js`

We nedd to create our service in WISE-PaaS first，and the service name need same as WISE-PaaS platform service name

![Imgur](https://i.imgur.com/6777rmg.png)

![Imgur](https://i.imgur.com/jmQD5L4.png)

![Imgur](https://i.imgur.com/B7Zgfk1.png)

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

#### Edit the **publisher.py** `mqttUri` to mqtt=>uri you can find in env.json

when you get it you need to change the host to externalHosts

![https://github.com/WISE-PaaS/example-js-docker-iothub/blob/master/source/externalhost.PNG](https://github.com/WISE-PaaS/example-js-docker-iothub/blob/master/source/externalhost.PNG)

- uri :"VCAP_SERVICES => p-rabbitmq => mqtt => uri"
- exnternalhost : "VCAP_SERVICES => p-rabbitmq => externalHosts"

open two terminal

#cf logs {application name}
cf logs example-js-docker-iothub

.

    node publisher.js

![https://github.com/WISE-PaaS/example-js-docker-iothub-mongodb/blob/master/source/send_data_successful.PNG](https://github.com/WISE-PaaS/example-js-docker-iothub-mongodb/blob/master/source/send_data_successful.PNG)

#### you can watch the row data use Robo 3T，and the config can find in WISE-PaaS Application Environment(WISE-PaaS/EnSaaS => application List => click application => environment)

Robo 3T create server(File => connect => Create)

- address => VCAP_SERVICES => mongodb-innoworks => 0 => external_host
- Database => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => database
- Username => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => username
- Password => VCAP_SERVICES => mongodb-innoworks => 0 => credentials => password

![https://github.com/WISE-PaaS/example-js-docker-iothub-mongodb/blob/master/source/successs_save.PNG](https://github.com/WISE-PaaS/example-js-docker-iothub-mongodb/blob/master/source/successs_save.PNG)
