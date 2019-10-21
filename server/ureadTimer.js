// 定时执行订阅邮件发送任务
// 计时器无限循环调用，小时数等于0，8，16时，执行一次uread.js
// 2018年3月1日
// @volsifly

/*
修改为每天只执行一次
2019年8月14日
@volsifly
*/

const child_process = require('child_process');

let date = new Date().getDate();
setInterval(()=>{
    let now_date = new Date().getDate();
    console.log(date,now_date);
    if(now_date!=date){
        child_process.fork("uread.js");
        date = now_date;
    }
},60000)