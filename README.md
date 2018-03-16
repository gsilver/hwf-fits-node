# hwf-fits

Node/Angular app using the UM ESB to retrieve public chedule information on instructors and transform it to `*.ics` for import into Google Calendar.

```bash
git clone https://github.com/gsilver/hwf-fits-node
cd hwf-fits-node
npm install
```

You will need to create an app in UM ESB Test, and subscribe the app with the Instructors and the UM Schedule of classes APIs

Record your app's ID and SECRET, add a `.env` file to the root with the following values filled in

```
CLIENTID=the client app id
CLIENTSECRET=the client app secret
DEBUGLEVEL=5
```
Start the server on port `8080` with

```bash
node server.js
```
