var CHANNEL_ACCESS_TOKEN = 'XXX';
var CHAT_BOT_ACCESS_TOKEN = 'XXX';
var userId = 'XXX';
var spreadsheet = SpreadsheetApp.openById('XXX'); // Kintal LINE bot スプレッドシート
var sheet2 = spreadsheet.getSheetByName('XXX');
var chat_endpoint = 'XXX';
var line_reply_url = 'XXX';
var flag = sheet2.getRange('B1').getValue();//状態フラグ

// ------------------------------------------------
// 「おはよう！」を送る
function createMessage() {
  message = "おはよう！";
  return push(message);
}

function push(text) {
  var url = "https://api.line.me/v2/bot/message/push";
  var headers = {
    "Content-Type" : "application/json; charset=UTF-8",
    'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
  };

  var postData = {
    "to" : userId,
    "messages" : [
      {
        'type':'text',
        'text':text,
      }
    ]
  };

  var options = {
    "method" : "post",
    "headers" : headers,
    "payload" : JSON.stringify(postData)
  };

  return UrlFetchApp.fetch(url, options);
}

// ------------------------------------------------
// ユーザーからのメッセージに対する対応

function doPost(e) {
  var events = JSON.parse(e.postData.contents).events;
  events.forEach(function(event) {
    if(event.type == "message") {
      reply(event);
    } else if(event.type == "follow") {
      follow(event); // アカウントが友だち追加またはブロック解除されたことを示すイベント
    } else if(event.type == "unfollow") {
      unFollow(event); // アカウントがブロックされたことを示すイベント
    }
 });
}

function follow(e) {
  
  var follow_message = "あなたの社員番号を教えて!!";
  postToLine(e, follow_message);
}

function reply(e) {
  
  var message_type = e.message.type
  var user_message = e.message.text
  var reply_message;

  if (flag == 0) {
    var sheets = spreadsheet.getSheets().map(function(sheet) {
      return sheet.getName();
    });
    var existsEmployeeNumber = sheets.some(function(sheet, i, sheets) {
      return (sheet === user_message);
    });

    if (existsEmployeeNumber) {
      reply_message = "スプレッドシートにあったよ！ 登録完了!!"
      writeMessageFlag(4);
    } else {
      reply_message = "あれ、ないかもしれない！他に文字は入れずに番号だけうってね 例) 00"
    }
  } else if (flag === 4) {
    
    var sheets = spreadsheet.getSheets().map(function(sheet) {
      return sheet.getName();
    });
    var existsEmployeeNumber = sheets.some(function(sheet, i, sheets) {
      return (sheet === user_message);
    });
    if (existsEmployeeNumber) {
      reply_message = "スプレッドシートにあったよ！ 登録完了!!"
      writeMessageFlag(4);
    } else {
      reply_message = "あれ、ないかもしれない！他に文字は入れずに番号だけうってね 例) 33"
    }
    if (user_message.indexOf("出社") > -1 || user_message.indexOf("出勤") > -1) {
      reply_message = "今日も頑張ろう！！ 何時から働いた??"
      writeMessageFlag(1);
    } else if (user_message.indexOf("退社") > -1 || user_message.indexOf("退勤") > -1){
      reply_message = "今日もおつかれ様！！ 何時まで働いた？？"  
      writeMessageFlag(2);
    } else if (user_message.indexOf("働いた") > -1 || user_message.indexOf("kintai") > -1){
      reply_message = "今日もお疲れ様!! 何時から何時まで働いた??"  
      writeMessageFlag(3);
    } else if (typeof user_message === 'undefined') {
      reply_message = "ゴメンナサイ、文字以外の情報には対応していません。"
    } else if (user_message.match("おしゃべり")) {
      reply_message = "おしゃべりしようしよう"
      writeMessageFlag(5);
    } else if (user_message.match("ヘルプ")) {
      reply_message = "出勤時間を記録したい時は、\n「出社」か「出勤」をテキストに入れて送ってね。\n\n退勤時間を記録は、\n「退社」か「退勤」をテキストに入れて送ってね。\n\nどっちも一気に書きたいときは、\n「kintai」とうってね。\n\nおしゃべりしたいときは、\n「おしゃべり」とうってね。";
    }else {
      reply_message = "ぼくとおしゃべりしたいときは、「おしゃべり」とうってね。 なにかわからないときは、「ヘルプ」とうってね"
    }
  } else if (flag === 1) {
    if (user_message.match(":")) {
      reply_message = "記録したで！今日も頑張れ!!" 
      writeSpreadSheet(e, user_message, flag);
      writeMessageFlag(4);
    } else {
      reply_message = "すんまへん。フォーマットはHH:MMで送っておくれ。"  
    }
  } else if (flag === 2) {
    if (user_message.match(":")) {
      reply_message = "記録したで！今日もおつかれ!!"  
      writeSpreadSheet(e, user_message, flag);
      writeMessageFlag(4);
    } else {
      reply_message = "すんまへん。フォーマットはHH:MMで送っておくれ。"  
    }
  } else if (flag === 3) {
    // 10:00~19:00
    if (user_message.match("~") && user_message.match(":")) {
      var times = user_message.split('~');
      reply_message = "そんなに働いたんか！おつかれ！！"
      writeSpreadSheet(e, times[0], 1);
      writeSpreadSheet(e, times[1], 2);
      writeMessageFlag(4);
    } else {
      reply_message = "すんまへん。フォーマットはHH:MM~HH:MMで送っておくれ。 例) 10:00~19:30" 
    }
  } else if (flag === 5) {
    if (user_message.match("ヘルプ")) {
      reply_message = "終了したいときは「終了」とうってね"
    } else if (user_message.match("終了")) {
      reply_message = "ばいばーい"   
      writeMessageFlag(4);
    } else {
      // ユーザーローカル チャットボット AI返信
      var rsponse = UrlFetchApp.fetch(chat_endpoint + '?message=' + encodeURIComponent(user_message) + '&key=' + encodeURIComponent(CHAT_BOT_ACCESS_TOKEN));
      var auto_reply = JSON.parse(rsponse).result;
      reply_message = auto_reply
    }
  }
  
  postToLine(e, reply_message);
}

// 送られてきたメッセージに対応して、flag を変更
function writeMessageFlag(flag) {
  sheet2.getRange("B1").setValue(flag);
}

// スプレッドシートに書き込み
function writeSpreadSheet(e, user_message, flag) {
  var date = new Date();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var employeeNumber;
  if (sheet2.getRange("D1").getValue() == "") {
    postToLine(e, "あなたの社員番号を教えて！！")
    writeMessageFlag(0);
  } else {
    employeeNumber = sheet2.getRange("D1").getValue()
  }
  var userSheet = spreadsheet.getSheetByName(employeeNumber);
  var monthValue = userSheet.getRange("M2").getValue();
  if (monthValue === month) {
    var dayColumn = "A";
    var today = day

    var beginMessage = user_message
    var finishMessage = user_message
    var row = getRow(today, dayColumn, userSheet);
    if (flag === 1) { //出社
      userSheet.getRange(row, 4).setValue(beginMessage);
    } else if (flag == 2) { // 退社
      userSheet.getRange(row, 5).setValue(finishMessage);
    }
  }
}

// 該当のRowを取得
function getRow(today, column, sheet){
  var dateColumn = sheet.getRange(12, 1, sheet.getLastRow() - 1).getValues(); // getRange(日付が始まる列, 1行目まで, 最後の列)
  var dayRows = dateColumn.filter(function(row, index){
    if (Object.prototype.toString.call(row[0]).slice(8, -1) === 'Date') return true; // Date型だけの配列にする
  }).map(function(date) {
    return date[0].getDate();
  });
  var todayIndex = dayRows.indexOf(today) + 1
  var todayRowOfDateColumn = todayIndex + 11 // 日付以外の日付分の列を足す
  return todayRowOfDateColumn;
}

function postToLine(event, postMessage) {
  var headers = {
    "Content-Type" : "application/json; charset=UTF-8",
    'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
  };
  
  var message = {
    "replyToken" : event.replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : postMessage
      }
    ]
  };
  
  var replyData = {
    "method" : "post",
    "headers" : headers,
    "payload" : JSON.stringify(message)
  };
  return UrlFetchApp.fetch(line_reply_url, replyData);
}