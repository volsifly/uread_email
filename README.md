# 攸阅
攸阅(UREAD)是一个使用EMAIL发送RSS订阅的服务，类似IFTTT和MICROSOFT FLOW里RSS更新发送到邮箱的功能。

可以访问：http://hiiman.com/uread/ 使用。

现在也提供微信小程序版本，在小程序中搜索“攸阅”使用。

# 用户订阅服务
暂时不提供用户订阅服务代码

# 定期检查RSS并发送文章到指定邮箱服务

## /server/uread.js
1. 从数据库中读取所有源数据。
2. 读取源RSS数据，判断有无更新。
3. 如果有更新，获取所有订阅此源的用户。
4. 把更新文章发送到用户的邮箱中。

## /server/ureadTimer.js
    定时执行uread.js脚本，通过child_process调用。

## /server/rssPaser.js
    读取并解析rss地址的http服务。
    提交rss地址，读取地址并解析xml数据，返回json数据。

## /server/mailSender.js
    通过smtp服务器发送邮件的http服务。
    提交发送邮件的邮箱地址，主题和内容，发送成功返回1，失败返回0。

# 数据库
数据库使用mongoDb，数据分为feeds和user两个collection，具体数据格式见/database/目录下的两个json文件。