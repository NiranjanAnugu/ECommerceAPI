require("dotenv").config();
const bodyParser = require("body-parser");
const xml2js = require("xml2js");
const crypto = require("crypto");
const express = require("express");
const { ServiceBusClient } = require('@azure/service-bus');

const app = express();
const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;
const hmacKey = process.env.DOCUSIGN_HMAC_KEY;
const sbClient = new ServiceBusClient(connectionString);
const sender = sbClient.createSender(queueName);

const PORT = process.env.PORT || 3000;

const rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};

app.use(
  bodyParser.json({
    verify: rawBodySaver,
    type: "application/json",
    limit: "5mb",
  })
);
app.use(
  bodyParser.text({
    verify: rawBodySaver,
    type: ["application/xml", "text/xml"],
    limit: "5mb",
  })
);


function isValidHmacSignature(reqBody, signatureHeader) {
  const computed = crypto
    .createHmac('sha256', hmacKey)
    .update(reqBody, 'utf8')
    .digest('base64');
  return computed === signatureHeader;
}
async function sendToQueue(payload) {
  const message = {
    body: payload,
    contentType: 'application/json',
    subject: 'DocuSign Event',
  };

  try {
    await sender.sendMessages(message);
    console.log('✅ Sent to Service Bus:', JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('❌ Service Bus Error:', err);
    throw err;
  }
}


app.post('/docusign/webhook', async (req, res) => {
  const contentType = req.headers['content-type'];
  const signature = req.headers['x-docusign-signature-1'];

  console.log("📩 Content-Type:", contentType);
//  console.log("📩 Signature:", signature);

  if (contentType.includes('xml')) {
    const rawXml = req.body;

    if (!isValidHmacSignature(rawXml, signature)) {
      return res.status(401).send('Invalid signature (XML)');
    }

    xml2js.parseString(rawXml, { explicitArray: false }, async (err, result) => {
      if (err) return res.status(400).send('Invalid XML');

      const envelopeStatus = result?.DocuSignEnvelopeInformation?.EnvelopeStatus;
      if (!envelopeStatus) return res.status(400).send('Missing envelope data');

      await sendToQueue(envelopeStatus);
      return res.sendStatus(200);
    });

  } else if (contentType.includes('json')) {
    const jsonBody = req.body;
    const rawJsonString = JSON.stringify(jsonBody);

    if (!isValidHmacSignature(rawJsonString, signature)) {
      return res.status(401).send('Invalid signature (JSON)');
    }
    console.log("JSON", jsonBody);
    // Adjust this as needed based on JSON structure
    await sendToQueue(jsonBody);
    return res.sendStatus(200);

  } else {
    return res.status(415).send('Unsupported Content-Type');
  }
});


app.post('/docusign/webhook1', async (req, res) => {
  console.info("docusign webhook event call before");  
  const rawXml = req.body;
  //const docusignSignature = req.headers['x-docusign-signature-1'];
  console.info("docusign webhook event after");
  console.log(rawXml);
//   if (!isValidHmacSignature(rawXml, docusignSignature)) {
//     console.warn('❌ Invalid HMAC Signature – rejected');
//     return res.status(401).send('Unauthorized: Invalid signature');
//   }

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
        console.warn("Hellooo! This is Niranjan Reddy Anugu.");
res.send("Hellooo! This is Niranjan Reddy Anugu.")
});

app.get("/greet", (req, res) =>{
    console.info("Welcome to the Node.js API!");
res.json({"message": "Welcome to the Node.js API!"});
});

app.listen(PORT, ()=>{
console.info(`Server is Running on PORT: ${PORT}`);
});