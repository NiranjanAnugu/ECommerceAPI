require("dotenv").config();
const bodyParser = require("body-parser");
const xml2js = require("xml2js");
const express = require("express");
const { ServiceBusClient } = require('@azure/service-bus');

const app = express();
const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;
const sbClient = new ServiceBusClient(connectionString);
const sender = sbClient.createSender(queueName);

const PORT = process.env.PORT || 3000;


// app.use(express.json());
app.use(bodyParser.text({ type: '*/xml' }));

app.post('docusign/webhook', async (req, res) => {
  xml2js.parseString(req.body, { explicitArray: false }, async (err, result) => {
    if (err) return res.status(400).send('Invalid XML');

    const envelopeStatus = result?.DocuSignEnvelopeInformation?.EnvelopeStatus;
    if (!envelopeStatus) return res.status(400).send('Missing envelope data');

    const message = {
      body: envelopeStatus,
      contentType: 'application/json',
      subject: 'DocuSign Envelope Event',
    };

    try {
      await sender.sendMessages(message);
      console.log('Message sent to Service Bus:', envelopeStatus.EnvelopeID);
      res.sendStatus(200);
    } catch (sendErr) {
      console.error('Service Bus Error:', sendErr);
      res.sendStatus(500);
    }
  });
});
app.get("/", (req, res) =>{
res.send("Hello! This is Niranjan Reddy Anugu.")
});

app.get("/greet", (req, res) =>{
res.json({"message": "Welcome to the Node.js API!"});
});

app.listen(PORT, ()=>{
console.info(`Server is Running on PORT: ${PORT}`);
});
