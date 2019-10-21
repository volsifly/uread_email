// 邮件发送服务
// POST方式输入EMAIL地址，TITLE和EMAIL内容
// 返回发送成功失败
// 2018-2-12
// @volsifly

//发送邮件
const nodemailer = require('nodemailer');
// http服务
const http = require('http');
//文字转代码
const querystring = require('querystring');

const smtpConnection = {
    host: 'localhost',
    port:'25',
    // secure: true, // true for 465, false for other ports
    // auth: {
    //     user: 'smtp auth username',
    //     pass: 'smtp auth password'
    // }
};

const sentMail = function (to, subject, html,res) {//发送邮件
    nodemailer.createTestAccount(function (err, account) {
        var transporter = nodemailer.createTransport(smtpConnection);
        var mailOptions = {
            from: '"RSSREADER" <rss@hiiman.com>', // sender address
            to: to, // list of receivers
            subject: subject,
            html: html
        };
        console.log("[发送邮件]", to, subject);
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("[发送邮件失败]", to, error);
                res.end("0");
                return console.log(error);
            }
            console.log("[成功发送邮件]", JSON.stringify(info));
            res.end("1");
        });
    });
};

const port = 8016;
const server = http.createServer(function (req, res) {
    let hasbody = 'transfer-encoding' in req.headers || 'content-length' in req.headers;
    if (hasbody) {
        let buffers = [];
        req.on('data', function (chunk) {
            buffers.push(chunk);
        });
        req.on('end', function () {
            let rawBody = new Buffer.concat(buffers).toString();
            let body = querystring.parse(rawBody);
            console.log(body);
            sentMail(body.to,body.subject,body.html,res);
        });
    }
    else {
        res.writeHead(404, { "Content-Type": 'text/html' });
        res.end("error");
        return;
    }
});

server.listen(port, function () {
    console.log('Server running at '+port);
});