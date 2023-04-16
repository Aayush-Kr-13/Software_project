const express = require("express");
const path = require("path");
// const fs = require("fs");
const app = express();
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const sendEmail= require('./sendmail')
const dotenv=require('dotenv').config()
const port = process.env.PORT||3000;

app.use(express.json());
const session=require('express-session');
const cookieParser=require('cookie-parser');
const flash= require('connect-flash');
app.use(cookieParser('SecretStringForCookie'));
app.use(session({
  secret: 'my-secret-key',
  resave: false,
  cookie:{Maxage:60000},
  saveUninitialized: true,
}));
app.use(flash());
const mongoose = require('mongoose');
const { request } = require("http");
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb+srv://aayush_1302:aayush1302@cluster0.qeurofq.mongodb.net/RegisterSchema?retryWrites=true&w=majority');
  console.log("connected");
}

const RegisterSchema = new mongoose.Schema({
  name: String,
  email: String,
  Password: String
});
const otpschema = new mongoose.Schema({
  email: String,
  Password: String,
  otp:String
});

// Create a new model for the new collection
const otppass = mongoose.model('otppass', otpschema);
const Signup = mongoose.model('Signup', RegisterSchema);
// const optpass = mongoose.model('reset', otpSchema);

app.use('/static', express.static('static')) // for serving static files
app.use(express.urlencoded({ extended: true }))

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

const static_path = path.join(__dirname, "/views");
app.use(express.static(static_path))
app.set('views', path.join(__dirname, '/views'));

// endpoints
app.get('/', (req, res) => {
  const param = {}
  // req.flash('isLoggedIn', isLoggedIn);
  res.status(200).render('main.html');
})
app.get('/Signup', (req, res) => {
  const param = {}
  res.status(200).render('login2.html',{message: req.flash('message')});
})
app.get('/confirm', (req, res) => {
  const param = {}
  res.status(200).render('confirm.html',{message: req.flash('message')});
})

app.get('/subscription', (req, res) => {
  const param = {}
  res.status(200).render('subscription.html',{message: req.flash('message')});
})

app.get('/abtus', (req, res) => {
  const param = {}
  res.status(200).render('abtus.html',{message: req.flash('message')});
})

app.get('/main', (req, res) => {
  const param = {}
  res.status(200).render('main.html',{message: req.flash('message')});
})


app.get('/home', (req, res) => {
  // const param = {}
  res.status(200).render('home.html');
})

app.get('/meeting', (req, res) => {
  // const param = {}3
  res.status(200).render('meeting.html');
})

app.get('/forget', (req, res) => {
  res.status(200).render('forget.html',{message: req.flash('message')});
})
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
    } else {
       
      res.redirect('/');
    }
  });
});

// -----------------------hash password--------------------------
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error(error);
  }
}


async function comparePassword(plainPassword, hashedPassword) {
  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (error) {
    console.error(error);
  }
}


// -------------------------------post request---------------------------

app.post('/Signup', async(req, res) => {
  const email = req.body.email;
  const name = req.body.name;
  const pwd = req.body.Password;

  const useremail=  await Signup.findOne({email:email});
  if( useremail && useremail.email=== email){
      req.flash('message', ' Email already exists');
      res.redirect('/Signup');
  }
  const hashedPassword = await hashPassword(pwd);
  console.log(hashedPassword);
  
  const mydata = new Signup({
     name,email, Password:hashedPassword
  });
  mydata.save().then(() => {
    //res.render("home.html");
    res.redirect('/Signup');

  }).catch((err) => {
    console.log(err);
    res.status(400).send("This data has not been saved to the database")
  })
})
//login  ------
app.post('/login', async(req, res) => {
    try{
        const email=req.body.email;
        if(email.length==0){
          req.flash('message', ' Enter valid email details');
          res.redirect("/Signup");
        }
        else {

          const password= req.body.Password;
          const useremail=  await Signup.findOne({email:email});
          //  console.log(useremail.Password);
          console.log(password);

          console.log(useremail.Password);
          bcrypt.compare(password, useremail.Password, (err, result) => {
            if (result === true) {
              res.redirect("/home");
              console.log('Passwords match!');
            } else {
              console.log('Passwords do not match!');
              req.flash('message', ' invalid login details');
              res.redirect("/Signup");
            }
          });
        }
        }catch(error){
          req.flash('message', ' invalid login details');
          res.redirect("/Signup");
    }
})

function generateOTP(length) {
  const charset = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return otp;
}

app.post('/forget', async(req, res) =>{
      const email= req.body.Email;
      const pass= req.body.NewPassword;
      const cpass= req.body.ConfirmPassword;
      if(email.length==0|| pass.length==0|| cpass.length==0){
        req.flash('message', 'Enter details correctly');
        return res.redirect('/forget');
      }
      else{
        const user = await Signup.findOne({ email: email }).exec();
        console.log(user);
        if (!user) {
          req.flash('message', 'This email is not registered. Please try using your registered email.');
          return res.redirect('/forget');
        }
        
        try{
          if(pass!=cpass){
            req.flash('message', 'Enter password correctly');
            return res.redirect('/forget');
          }
          
          else{
            const otp = generateOTP(6); // generate a 6-digit OTP
            console.log(otp);
            
            // await Signup.updateOne({ email: email }, { $set: { Password: pass } });
            const mydata = new otppass({
              email, Password: cpass,otp
            });
            sendEmail(email, otp);
            mydata.save().then(() => {
              req.flash('message', 'Otp has set to your registered gmail');
              res.redirect("/confirm");
              
            }).catch((err) => {
              console.log(err);
              res.status(400).send("This data has not been saved to the database")
            })
            // req.flash('message', 'password changed successfully');
            // return res.redirect('/Signup');
          }
          
        }
        catch (err) {
          console.log(err);
          req.flash('message', 'An error occurred while updating your password. Please try again later.');
          res.redirect('/forget'); 
        }
      }

});
  app.post('/confirm', async(req, res) =>{
      const  uotp= req.body.otp;
      const user = await otppass.findOne({ otp: uotp });
      if(!user){
         req.flash('message', 'Enter valid otp');
         res.redirect("/confirm");
      }
      else{
        const user1 = await Signup.findOne({ email: user.email });
        if(!user1){
          req.flash('message', 'Enter valid otp');
          res.redirect("/confirm");
        }
        else{
          const hashedPassword = await hashPassword(user.Password);
          await Signup.updateOne({$set: { email: user.email, Password: hashedPassword } });
          await otppass.deleteOne({otp:uotp});
          req.flash('message', 'Password changed successfully');
          res.redirect("/signup");
        }

      }

  });
app.listen(port, () => {
  console.log(` the application is successfully started at port ${port}`);
}); 
