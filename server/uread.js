// uread定时读取源和发送到订阅的邮箱服务
// 从MANGODB读取源列表
// 通过RSS获取和解析服务获取文章
// 文章时间与源最后更新时间对比，如果更新，查找订阅源的用户
// 把文章和发送邮箱信息加入发送邮件队列中
// 发送邮件队列逐个发送邮件
// 读取源和发送邮件都完毕时,结束任务
// 2018-3-1
// @volsifly

//写LOG
var fs = require('fs');

//请求读取源服务和发送邮件服务
var request = require('request');

// 数据库链接
var MongoClient = require('mongodb').MongoClient;//mongoDb
var ObjectID = require('mongodb').ObjectID;
var mongoDb;
var mongoDbClient;
MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    console.log("Connected successfully to server");
    mongoDb = client.db('uread');
    mongoDbClient = client;
    var a = Object.create(uread);
    a.main();
});

var uread = {
    logMsg: "",
    logFileName: "log/" + new Date().getFullYear().toString() + (new Date().getMonth() + 1).toString() + new Date().getDate().toString() + new Date().getHours().toString() + new Date().getMinutes().toString() + new Date().getSeconds().toString() + ".log",
    mailQuery: [],//邮件发送队列
    mailQueryState: false,//邮件发送队列状态
    logTimer: null,//写LOG计时器，新任务开始的时候关闭
    projectState: 1,//任务进度
    main: function () {
        // this.loadData();
        var uread = this;
        // 读取所有FEEDS
        mongoDb.collection('feeds').find().toArray(function (err, feeds) {
            uread.loadFeed(feeds, 0);
        });
    },
    projectEnd: function () {
        this.log("[任务结束]");
        mongoDbClient.close();
        return;
    },
    loadFeed: function (feeds, count) {
        if (count >= feeds.length) {
            this.log("[读取结束]");
            this.projectState = 2;//所有源读取完成
            if (this.mailQueryState == false) {
                this.projectEnd();
            }
            return;
        }
        var uread = this;
        var feed = feeds[count];

        mongoDb.collection("user").count({ feeds: new ObjectID(feed._id), active: 1 }, function (err, res) {
            if (res > 0) {//订阅人数大于0才读取源
                try {
                    request.post({ url: "http://localhost:8015", form: { url: feed.feedurl } }, function (requestErr, requestRes, body) {
                        try {
                            body = JSON.parse(body);
                        }
                        catch (e) {
                            console.log(body);
                            uread.log("[解析错误]");
                            uread.loadFeed(feeds, count + 1);
                            return;
                        }
                        if (body.error == 1) {//读取错误，下一个源
                            uread.log("[请求错误]", feed.feedurl, body.errorMsg);
                            uread.loadFeed(feeds, count + 1);
                            return;
                        }


                        try {
                            uread.log("[请求成功]", body.feed.title);
                        }
                        catch (e) {
                            uread.log("[错误]", body.feed);
                        }
                        // uread.loadFeed(feeds, count+1);
                        var next = function () {
                            uread.loadFeed(feeds, count + 1);
                        };
                        uread.getSubscriptUsers(feed, body.feed, next);
                    });
                }
                catch (e) {
                    uread.log("[错误]", e, feed);
                }
            }
            else{
                uread.log("[无订阅，跳过源]", feed.feedname);
                uread.loadFeed(feeds, count + 1);
            }
        });


    },
    //获取订阅的用户列表
    getSubscriptUsers: function (feed, feedData, callback) {
        var uread = this;
        mongoDb.collection("user").find({ feeds: new ObjectID(feed._id), active: 1 }).toArray(function (err, users) {
            // 文章列表和订阅用户加入邮件队列
            var lastupdate;
            for (var i in feedData.entries) {
                var update;
                if (feedData.entries[i].pubDate) update = feedData.entries[i].pubDate;
                if (feedData.entries[i].published) update = feedData.entries[i].published;
                if (!new Date(feed.lastupdate) || new Date(update).getTime() > new Date(feed.lastupdate).getTime()) {
                    for (var j in users) {
                        uread.pushMailQuery(feedData.title, feedData.entries[i], users[j].mailbox);
                    }
                }
                if (!lastupdate || new Date(update).getTime() > new Date(lastupdate).getTime()) {
                    lastupdate = update;
                }
            }


            // 更新源信息
            try {
                uread.log("[更新源]", feed._id, feed.feedurl, feedData.title, lastupdate);
                mongoDb.collection("feeds").updateOne(
                    { "_id": new ObjectID(feed._id) },
                    {
                        $set: {
                            'feedname': feedData.title,
                            "lastupdate": lastupdate
                        }
                    }
                );
            }
            catch (e) {
                console.log(e);
            }

            callback();
        });
    },


    // 发送邮件队列=======================
    pushMailQuery: function (feedTitle, entrie, mailbox) {
        this.log("[加入发送队列]", mailbox, entrie.title);
        this.mailQuery.push({ feedTitle: feedTitle, entrie: entrie, mailbox: mailbox });
        if (!this.mailQueryState) {
            this.mailQueryNext();
        }
    },
    mailQueryNext: function () {
        if (this.mailQuery.length == 0) {
            this.mailQueryState = false;
            if (this.projectState == 2) {
                this.projectState = 3;//所有邮件发送完成
                this.projectEnd();
            }
            return;
        }
        this.mailQueryState = true;
        var mailData = this.mailQuery.shift();
        this.log("[发送邮件]", mailData.mailbox, mailData.entrie.title);
        var uread = this;
        // console.log(mailData.entrie);
        /*jshint multistr: true */
        var content = (mailData.entrie["content:encoded"]) ? mailData.entrie["content:encoded"] : mailData.entrie.content;
        var html = "\
		<html>\
		<head>\
		<meta http-equiv='Content-Type' content='text/html; charset=utf-8'> \
		<style>\
			img{\
			    max-width: 90%;\
			}\
			h1{\
				font-family: georgia;\
				font-size: 18px;\
				margin: 10px;\
			}\
			h1 a{\
				text-decoration: none;\
			}\
		</style>\
		</head>\
		<body>\
				<h1><a href = '"+ mailData.entrie.link + "'>" + mailData.entrie.title + "</a></h1>\
				<p>"+ content + "<p>\
		</body>\
		</html>\
        ";

        request.post({
            url: "http://localhost:8016", form: {
                to: mailData.mailbox,
                subject: "[" + mailData.feedTitle + "]" + mailData.entrie.title,
                html: html
            }
        }, function (requestErr, requestRes, body) {
            if (body == "1") uread.log("[发送成功]", mailData.mailbox, mailData.entrie.title);
            else uread.log("[发送失败]", mailData.mailbox, mailData.entrie.title);
            uread.mailQueryNext();
        });

    },
    //==================================

    log: function () {  //写LOG
        var l = "";
        var d = new Date();
        l += "[" + d.getFullYear() + "-" + (d.getMonth() * 1 + 1) + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + "]";
        for (var i in arguments) {
            if (typeof (arguments[i]) != "string") {
                l += " " + JSON.stringify(arguments[i]);
            }
            else l += " " + arguments[i];
        }
        this.logMsg += l + "\r\n";
        console.log(l);
        fs.writeFile(this.logFileName, this.logMsg,function(err){
        });
    }
};
