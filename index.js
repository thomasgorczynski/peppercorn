var pg = require('pg');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/times', function(request, response) {
    var result = ''
    var times = process.env.TIMES || 5
    for (i=0; i < times; i++)
      result += i + ' ';
  response.send(result);
});

app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    console.log(process.env.DATABASE_URL);
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});

app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'hello') {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});

app.post('/webhook', function (req, res) {
 var data = req.body;

 // Make sure this is a page subscription
 if (data.object === 'page') {

   // Iterate over each entry - there may be multiple if batched
   data.entry.forEach(function(entry) {
     var pageID = entry.id;
     var timeOfEvent = entry.time;

     // Iterate over each messaging event
     entry.messaging.forEach(function(event) {
       if (event.message) {
         receivedMessage(event);
       } else {
         console.log("Webhook received unknown event: ", event);
       }
     });
   });

   // Assume all went well.
   //
   // You must send back a 200, within 20 seconds, to let us know
   // you've successfully received the callback. Otherwise, the request
   // will time out and we will keep trying to resend.
   res.sendStatus(200);
 }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'generic':
        sendGenericMessage(senderID);
        break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function sendGenericMessage(recipientId, messageText) {
  // To be expanded in later sections
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}


function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAAPjiifdZBg8BABr7STcNJl6CCJuXrFpXMWuG28zendmg5bZBkQXzZBvXdnC2ImZBXiEhOZCIAkJyJxZCh22SsaSwI2riNm5pRP8pPn0xZAPtHd7ZBkmEdzTDIaASBQgG9IPvHaZBWyDwE5PMo0MP7t37iNGKfpu2iKXrnjT8ekOvfgZDZD' },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


