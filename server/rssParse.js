// RSS读取和解释服务
// POST方式输入URL
// 返回JSON格式的RSS内容
// 2018-2-12
// @volsifly


//rss解析
var parser = require('rss-parser');
//获取RSS源数据
var request = require('request');
// http服务
var http = require('http');
//文字转代码
var querystring = require('querystring');

var iconv = require('iconv-lite');

var port = 8015;
var server = http.createServer(function (req, res) {
    var hasbody = 'transfer-encoding' in req.headers || 'content-length' in req.headers;
    if (hasbody) {
        var buffers = [];
        req.on('data', function (chunk) {
            buffers.push(chunk)
        });
        req.on('end', function () {
            var rawBody = new Buffer.concat(buffers).toString();
            var body = querystring.parse(rawBody);

            // 读取URL
            request({
                url: body.url,
                timeout: 10000,
                encoding:null
            }, function (error, response, requestBody) {
                if (error) {
                    console.log("[地址访问超时]", body.url, error);
                    res.end(JSON.stringify({
                        error: 1,
                        errorMsg: "地址访问超时",
                        errorInfo: error
                    }));
                    return;
                }
                else {
                    console.log("[请求成功]", body.url);
                    var gbkStr = iconv.decode(requestBody, "GBK");
                    if (gbkStr.toString().split("的").length > 1 ||
                        gbkStr.toString().split("天").length > 1 ||
                        gbkStr.toString().split("时").length > 1) {
                        requestBody = gbkStr;
                    }
                    else {  
                        requestBody = requestBody.toString();
                    }

                    try {
                        parser.parseString(requestBody, function (err, parsed) {
                            if (err) {
                                console.log("[RSS解析错误]", body.url, err);
                                res.end(JSON.stringify({
                                    error: 1,
                                    errorMsg: "RSS解析错误",
                                    errorInfo: error
                                }));
                                return;
                            }
                            else {
                                res.end(JSON.stringify(parsed));
                            }

                        });
                    }
                    catch (e) {
                        console.log(requestBody);
                    }
                }
            });
        });
    }
    else {
        res.writeHead(404, { "Content-Type": 'text/html' });
        res.end("error");
        return;
    }
});

server.listen(port, function () {
    console.log('Server running at ' + port);
});