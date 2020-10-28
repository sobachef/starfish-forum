const express = require('express')
const Datastore = require('nedb')                       // we persist data on nedb
const timeago = require('timeago.js')
const Message = require('bitcore-message');             // for verifying signatures
const cookieParser = require('cookie-parser');          // cookie handler
const CSRF = require('csurf')                           // cross site forgery handler
const csrf = CSRF({ cookie: true });
const db = new Datastore({ filename: "posts.db", autoload: true });
const app = express()
app.set('view engine', 'ejs')
app.set('views', process.cwd())
app.use(express.urlencoded({ extended: false }));
app.use(express.json({limit: '10mb'}));
app.use(cookieParser());
app.get("/", csrf, (req, res) => {
  // Find the last 100 items and display
  db.find({}).sort({ timestamp: -1 }).limit(100).exec((err, messages) => {
    messages.forEach((m) => {
      m.ts = timeago.format(m.timestamp)
    })
    res.render("index", {
      address: (req.cookies.address ? req.cookies.address : null),
      messages: messages,
      token: req.csrfToken()
    })
  })
})
app.post("/login", csrf, (req, res) => {
  /*************************************************************************************
  * In the frontend, we make Starfish sign the unique CSRF token.
  * If the signature is valid, we assume that the identity (bitcoin address) is correct.
  * Therefore sign the user in with the Bitcoin address by setting the cookie.
  **************************************************************************************/
  const sig = req.body.signature
  const message = req.body._csrf
  const address = req.body.address
  console.log(`\n[Signature check]\n\nMessage: ${message}\nSignature: ${sig}\nAddress: ${address}`)
  const isvalid = Message(message).verify(address, sig);
  console.log("valid?", isvalid)
  if (isvalid && req.body.address) {
    res.cookie('address', req.body.address)
  }
  res.redirect("/")
})
app.post("/logout", csrf, (req, res) => {
  res.clearCookie("address").redirect(301, "/");
})
app.post("/message", csrf, (req, res) => {
  db.insert({
    address: req.body.address,
    message: req.body.message,
    timestamp: Date.now()
  }, (err, doc) => {
    res.redirect("/")
  })
})
app.listen(3028, () => { console.log("listening at http://localhost:" + 3028) })
