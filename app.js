require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useUnifiedTopology: true, useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const roleSchema = new mongoose.Schema({
  email: String,
  role: String
});

const eventSchema = new mongoose.Schema({
  title: String,
  body: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Role = new mongoose.model("Role", roleSchema);
const Event = new mongoose.model("Event", eventSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err){
    if(err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/events");
  });
}});
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/events", function(req, res){
  if (req.isAuthenticated()){
    Event.find({}, function(err, foundEvents){
      res.render("events",{events: foundEvents});
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      const newRole = new Role({
        email: req.body.username,
        role: req.body.role
      })
      newRole.save(function(err){
        if(err){
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/events");
          });
        }
      })
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/compose", function(req, res){
  if (req.isAuthenticated()){
    Role.findOne({email: req.user.username}, function(err, foundRole){
      if(foundRole.role === "admin"){
        Event.find({}, function(err, foundEvents){
          res.render("compose",{events: foundEvents});
        });
      } else {
        console.log("fuck off user");
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res){
  const newEvent = new Event({
    title: req.body.title,
    body: req.body.body
  });
  newEvent.save(function(err){
    if(err){
      console.log(err);
    } else {
      res.redirect("/compose");
    }
  });
});

app.post("/delete", function(req, res){
  const checkedEventId = req.body.checkbox;
  Event.findOneAndDelete({title: checkedEventId}, function(err){
    if(err){
      console.log(err);
    } else {
      res.redirect("/compose");
    }
  });
});

app.listen(process.env.LOCALHOST, function(){
  console.log("server is a go");
});
