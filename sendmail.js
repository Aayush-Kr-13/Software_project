const nodemailer= require("nodemailer");
const config= require('./config')

async function sendEmail(email, password) {
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.emailUser,
        pass:config.emailpassword
    }
});

let mailOptions = {
    from: config.emailUser,
    to: email,
    subject: 'Test Email',
    text:`Your otp  is: ${password}`,
};

transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
});

};

module.exports= sendEmail;