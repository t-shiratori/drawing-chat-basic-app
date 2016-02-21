(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

//socket io

var socket = undefined;

//p5
var colorPickerSelectSatBriSketch_p5 = undefined;

//scketch
var myData = undefined;
var myID = undefined;
var myColor = undefined;
var myBorderW = undefined;
var users = {}; //チャットルームメンバーごとのデータ管理テーブル
var lines = []; //描画する全てのストローク保持用

//dom
var panel = undefined;
var panelInnerBox = undefined;
var selectBox = undefined;
var clearBtn = undefined;
var ttl = undefined;
var chatInfo = undefined;
var ttlChatNum = undefined;
var chatNum = undefined;
var colorPicker__selectSatBri = undefined;
var colorPicker__selectHue = undefined;
var ttlSliderAlpha = undefined;
var ttlSliderBorderW = undefined;
var sliderAlpha = undefined;
var sliderBorderW = undefined;

//色相
var pickerHue = 360;

/*--

  canvas main

------------------------------------*/
var scketch = function scketch(p) {

  var thisRenderer2dObj = undefined;

  p.setup = function () {
    p.frameRate(40);
    thisRenderer2dObj = p.createCanvas(p.windowWidth, p.windowHeight);
    thisRenderer2dObj.parent('mainCanvasWrapper');
    thisRenderer2dObj.id('mainCanvas');
    p.background(255);
    //p.color() で送るとサーバーから受け取るときに型がp5から普通のobjectに変わってしまうのでだめ
    //myColor = p.color(p.floor(p.random(255)),p.floor(p.random(255)),p.floor(p.random(255)),p.floor(p.random(255)));

    /*
      コンパネ作成
    --------------------------------------*/
    panel = p.createDiv('');
    panel.id('panel');

    panelInnerBox = p.createDiv('');
    panelInnerBox.id('panelInnerBox');
    panel.child(panelInnerBox);

    ttlChatNum = p.createP('number of people');
    ttlChatNum.id('ttlChatNum');
    panelInnerBox.child('ttlChatNum');

    chatNum = p.createP('');
    chatNum.id('chatNum');
    panelInnerBox.child(chatNum);

    clearBtn = p.createButton('clear canvas');
    clearBtn.id('clearBtn');
    clearBtn.class('btn btn-default');
    clearBtn.mouseClicked(clearCanvas);
    panelInnerBox.child(clearBtn);

    // chatInfo = p.createDiv('');
    // chatInfo.id('chatInfo');
    // panelInnerBox.child(chatInfo);

    ttlSliderAlpha = p.createP('alpha');
    ttlSliderAlpha.id('ttlSliderAlpha');
    panelInnerBox.child(ttlSliderAlpha);

    sliderAlpha = p.createSlider(0, 255, 100);
    sliderAlpha.id('sliderAlpha');
    panelInnerBox.child(sliderAlpha);

    ttlSliderBorderW = p.createP('border width');
    ttlSliderBorderW.id('ttlSliderBorderW');
    panelInnerBox.child(ttlSliderBorderW);

    sliderBorderW = p.createSlider(1, 40, 1);
    sliderBorderW.id('sliderBorderW');
    panelInnerBox.child(sliderBorderW);

    //色初期値
    myColor = [0, 0, 0, sliderAlpha.value()];

    /*--
      socket io
    ------------------------------------*/
    socket = io();

    //サーバーから自分のidを受け取る
    socket.on('setYourId', function (yourId) {
      myID = yourId;
    });

    //サーバーから、チャットルームの情報を受け取る
    socket.on('chatInfoUpdate', function (chatData) {
      //チャットの人数表示
      var chatNum = document.getElementById('chatNum');
      chatNum.innerHTML = chatData.length;
      //チャットルームメンバーのぼとのデータ管理テーブルをセット
      users = {};
      for (var key in chatData.sockets) {
        if (chatData.sockets.hasOwnProperty(key)) {
          users[key] = [];
        }
      }
    });

    //サーバーから、更新されたクライアントデータを受け取る
    //新規ストロークの追加
    socket.on('addToLines', function (id) {
      users[id] = [];
      lines.push(users[id]);
    });

    //サーバーから、更新されたユーザーのデータを受け取る
    //ストローク情報の更新
    socket.on('setClientData', function (userData) {
      users[userData.id].push(userData);
      p.redraw();
    });

    //全員のキャンバスを初期化
    socket.on('clearCanvas', function () {
      lines = [];
      p.clear();
    });

    //ウィンドウを閉じたらサーバーに通信切断を通知する
    socket.on('disconnect', function () {
      socket.emit('disconnect');
    });

    p.noLoop();
  }; //end setup

  p.draw = function () {
    p.clear();
    drawPath();
    p.noLoop();
  }; // end draw

  p.mousePressed = function (e) {
    var t = e.srcElement || e.target; //for ie
    if (t == thisRenderer2dObj.canvas) {
      socket.emit('pushUserStroke');
    }
  };

  p.mouseDragged = function (e) {
    var t = e.srcElement || e.target; //for ie

    //canvasでドラッグした時だけ実行したい。スライダー操作の時などに反応しないようにcanvasかどうか判定して条件分岐。
    if (t == thisRenderer2dObj.canvas) {

      p.cursor(p.CROSS);

      //マウス座標
      var point = { x: e.offsetX, y: e.offsetY };

      //アルファ値
      myColor[3] = sliderAlpha.value();

      //ボーダーの太さ
      myBorderW = sliderBorderW.value();

      //色
      var tempCol = [myColor[0], myColor[1], myColor[2], myColor[3]];

      //送信データをセット
      myData = {
        clr: tempCol,
        bdW: myBorderW,
        p: point
      };

      //サーバーに送信
      socket.emit('updateUserData', myData);
    };
  };

  p.mouseReleased = function (e) {};

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  /*----------------------
   カスタムブラシ
   -----------------------*/
  function drawPath() {
    p.strokeCap(p.ROUND);
    //p.strokeCap(p.SQUARE);
    //p.strokeCap(p.PROJECT);
    p.noFill();
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      p.push();
      p.noFill();
      p.beginShape();
      for (var j = 0; j < line.length; j++) {
        var c = p.color(line[j].clr[0], line[j].clr[1], line[j].clr[2], line[j].clr[3]);
        p.stroke(c);
        p.strokeWeight(line[j].bdW);
        p.vertex(line[j].p.x, line[j].p.y);
      }
      p.endShape();
      p.pop();
    }
  }

  function clearCanvas() {
    socket.emit('allClearCanvas');
  }
};
new p5(scketch);

/*--

  canvas colorPicker saturation brightness

------------------------------------*/
var colorPicker__selectSatBriSketch = function colorPicker__selectSatBriSketch(p) {

  var pd = undefined;
  var cvsW = 100;
  var cvsH = 100;
  var thisRenderer2dObj = undefined;

  p.setup = function () {
    p.background(0);
    p.colorMode(p.HSB, cvsW);
    pd = p.pixelDensity();

    //dom作成
    colorPicker__selectSatBri = p.createDiv('');
    colorPicker__selectSatBri.id('colorPicker__selectSatBri');
    panelInnerBox.child(colorPicker__selectSatBri);

    //canvas作成
    thisRenderer2dObj = p.createCanvas(cvsW, cvsH);
    thisRenderer2dObj.mousePressed(changeColor); //こうするとthisRenderer2dObjがクリックされた時だけ呼び出されるのでmainCanvasに影響しない。
    thisRenderer2dObj.parent("colorPicker__selectSatBri");
    p.noLoop();
  };

  p.draw = function () {
    p.colorMode(p.HSB, 100);
    drawColor();
    p.loadPixels();
  };

  p.mousePressed = function (e) {
    //ここはmainCanvasもクリックを検知してしまうので注意
  };

  function changeColor(e) {
    /*
    noLoopしてるとmouseXなどが全部0で返ってくる仕様らしい。なのでeで普通にclientXのほうを使う。
    https://github.com/processing/p5.js/issues/1205
    */
    p.cursor(p.CROSS);
    var mx = e.offsetX; //http://phpjavascriptroom.com/?t=js&p=event_object
    var my = e.offsetY;

    //ピクセルの色取得
    var pos = 4 * cvsW * pd * my + 4 * mx * pd;
    var r = p.pixels[pos]; //画像の場合はp.getでいけるがcanvasの塗りの場合はp.pixels[]でやる必要がある
    var g = p.pixels[pos + 1];
    var b = p.pixels[pos + 2];

    myColor[0] = r;
    myColor[1] = g;
    myColor[2] = b;
  }

  function drawColor() {
    for (var i = 0; i < 100; i++) {
      for (var j = 0; j < 100; j++) {
        p.stroke(pickerHue, 100 - j, i);
        p.point(i, j);
      }
    }
  }
};
colorPickerSelectSatBriSketch_p5 = new p5(colorPicker__selectSatBriSketch);

/*--

  canvas colorPicker hue

------------------------------------*/
var colorPicker__selectHueSkech = function colorPicker__selectHueSkech(p) {

  var pd = undefined;
  var cvsW = 100;
  var cvsH = 15;
  var thisRenderer2dObj = undefined;

  p.setup = function () {
    p.background(0);
    p.colorMode(p.HSB, cvsW);
    pd = p.pixelDensity();

    //dom作成
    colorPicker__selectHue = p.createDiv('');
    colorPicker__selectHue.id('colorPicker__selectHue');
    panelInnerBox.child(colorPicker__selectHue);

    //canvas作成
    thisRenderer2dObj = p.createCanvas(cvsW, cvsH);
    thisRenderer2dObj.mousePressed(changeColor); //こうするとthisRenderer2dObjがクリックされた時だけ呼び出されるのでmainCanvasに影響しない。
    thisRenderer2dObj.parent("colorPicker__selectHue");

    p.noLoop();
  };

  p.draw = function () {

    p.colorMode(p.HSB, 100);
    for (var k = 0; k < cvsW; k++) {
      for (var h = 0; h < cvsH; h++) {
        p.stroke(k, 100, 100);
        p.point(k, h);
      }
    }
    p.loadPixels();
  };

  p.mousePressed = function (e) {
    //ここはmainCanvasもクリックを検知してしまうので注意
  };

  function changeColor(e) {
    /*
    最新のp5だとnoLoopにした場合mouseXなどが全部0で返ってくるらしい。バグかは不明。なのでeで普通にclientXのほうを使う。
    https://github.com/processing/p5.js/issues/1205
    */
    p.cursor(p.CROSS);
    var mx = e.offsetX; //http://phpjavascriptroom.com/?t=js&p=event_object
    var my = e.offsetY;

    //ピクセルの色取得
    var pos = 4 * cvsW * pd * my + 4 * mx * pd;
    var r = p.pixels[pos]; //画像の場合はp.getでいけるがcanvasの塗りの場合はp.pixels[]でやる必要がある
    var g = p.pixels[pos + 1];
    var b = p.pixels[pos + 2];

    //RGBからHSBに変換 hueのみ
    var hue = getHue(r, g, b);
    hue = p.map(hue, 0, 360, 0, 100);

    //
    pickerHue = hue;
    colorPickerSelectSatBriSketch_p5.draw();

    myColor[0] = r;
    myColor[1] = g;
    myColor[2] = b;
  }

  function getHue(r, g, b) {
    var hue = undefined;
    var max = p.max(r, g, b);
    var min = p.min(r, g, b);

    if (max == r) {
      hue = (g - b) / (max - min) * 60;
    } else if (max == g) {
      hue = (b - r) / (max - min) * 60 + 120;
    } else if (max == b) {
      hue = (r - g) / (max - min) * 60 + 240;
    } else if (r == g && g == b) {
      hue = 0;
    }

    if (hue < 0) {
      hue += 360;
    }

    hue = p.floor(hue);

    return hue;
  }
};
new p5(colorPicker__selectHueSkech);

},{}]},{},[1]);
