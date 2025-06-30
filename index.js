require("dotenv").config();
const bodyParser = require("body-parser");
const xml2js = require("xml2js");
const express = require("express");
const { ServiceBusClient } = require('@azure/service-bus');

const app = express();
const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;
const hmacKey = process.env.DOCUSIGN_HMAC_KEY;

function isValidHmacSignature(reqBody, signatureHeader) {
  const computed = crypto
    .createHmac('sha256', hmacKey)
    .update(reqBody, 'utf8')
    .digest('base64');
  return computed === signatureHeader;
}


const sbClient = new ServiceBusClient(connectionString);
const sender = sbClient.createSender(queueName);

const PORT = process.env.PORT || 3000;


// app.use(express.json());
app.use(bodyParser.text({ type: '*/xml' }));

app.post('docusign/webhook', async (req, res) => {

  const rawXml = req.body;
  const docusignSignature = req.headers['x-docusign-signature-1'];

  if (!isValidHmacSignature(rawXml, docusignSignature)) {
    console.warn('❌ Invalid HMAC Signature – rejected');
    return res.status(401).send('Unauthorized: Invalid signature');
  }

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
        console.warn("PORT THIS IS TEST");
res.send("Hello! This is Niranjan Reddy Anugu.")
});

app.get("/greet", (req, res) =>{
    console.log("PORT THIS IS TEST");
res.json({"message": "Welcome to the Node.js API!"});
});

app.listen(PORT, ()=>{
console.info(`Server is Running on PORT: ${PORT}`);
});