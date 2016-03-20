'use strict';

//socket io
let socket;

//p5
let colorPickerSelectSatBriSketch_p5;

//scketch
let myData;
let myID;
let myColor;
let myBorderW;
let users = {};//チャットルームメンバーごとのデータ管理テーブル
let lines = [];//描画する全てのストローク保持用

//dom
let panel;
let panelInnerBox;
let selectBox;
let clearBtn;
let ttl;
let chatInfo;
let ttlChatNum;
let chatNum;
let colorPicker__selectSatBri;
let colorPicker__selectHue;
let ttlSliderAlpha;
let ttlSliderBorderW;
let sliderAlpha;
let sliderBorderW;

//色相
let pickerHue = 360;


/*--

  canvas main

------------------------------------*/
let scketch = function(p){

  let thisRenderer2dObj;

  p.setup = function(){
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

    clearBtn = p.createButton('clear');
    clearBtn.id('clearBtn');
    clearBtn.class('mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent');
    clearBtn.mouseClicked(clearCanvas);
    panelInnerBox.child(clearBtn);

    // chatInfo = p.createDiv('');
    // chatInfo.id('chatInfo');
    // panelInnerBox.child(chatInfo);

    ttlSliderAlpha = p.createP('alpha');
    ttlSliderAlpha.id('ttlSliderAlpha');
    panelInnerBox.child(ttlSliderAlpha);

    sliderAlpha = p.createSlider(0,255,100);
    sliderAlpha.id('sliderAlpha');
    sliderAlpha.class('mdl-slider mdl-js-slider');
    panelInnerBox.child(sliderAlpha);

    ttlSliderBorderW = p.createP('border width');
    ttlSliderBorderW.id('ttlSliderBorderW');
    panelInnerBox.child(ttlSliderBorderW);

    sliderBorderW = p.createSlider(1,40,1);
    sliderBorderW.id('sliderBorderW');
    sliderBorderW.class('mdl-slider mdl-js-slider');
    panelInnerBox.child(sliderBorderW);

    //色初期値
    myColor = [0,0,0,sliderAlpha.value()];




    /*--
      socket io
    ------------------------------------*/
    socket = io();

    //接続が成功すると実行される
    socket.on("connect", function(){
      myID = socket.id;
    });

    //サーバーから、チャットルームの情報を受け取る
    socket.on('chatInfoUpdate',function(chatData){
      //チャットの人数表示
      let chatNum = document.getElementById('chatNum');
      chatNum.innerHTML = chatData.length;
      //チャットルームメンバーのぼとのデータ管理テーブルをセット
      users = {};
      for(let key in chatData.sockets) {
        if(chatData.sockets.hasOwnProperty(key)) {
          key = key.substr(2);//サーバー側で取得するsocket.idは頭に/#が付くので取る
          users[key] = [];
        }
      }
    });

    //サーバーから、更新されたクライアントデータを受け取る
    //新規ストロークの追加
    socket.on('addToLines',function(id){
      users[id] = [];
      //これは空にしているのではなく新しい配列オブジェクトを作成している。
      //これは参照渡しなのでlinesにpushしたusers[id]と同じアドレス参照になる。
      //ただし新しいオブジェクトなので古いものとは違うアドレスになる。
      //つまりsetClientDataのところでは最後に生成した配列オブジェクトのみ参照しているので、
      //最新のオブジェクトだけ更新される
      lines.push(users[id]);
    });

    //サーバーから、更新されたユーザーのデータを受け取る
    //ストローク情報の更新
    socket.on('setClientData',function(userData){
      users[userData.socketId].push(userData);//addToLinesのコメントを参照
      p.redraw();
    });

    //全員のキャンバスを初期化
    // socket.on('clearCanvas',function(){
    //   lines = [];
    //   p.clear();
    // });

    //ウィンドウを閉じたらサーバーに通信切断を通知する
    socket.on('disconnect',function(){
      socket.emit('disconnect');
    });

    p.noLoop();

  }//end setup


  p.draw = function(){
    p.clear();
    drawPath();
    p.noLoop();
  }// end draw

  p.mousePressed = function(e){
    let t = e.srcElement || e.target;//for ie
    if(t == thisRenderer2dObj.canvas){
      socket.emit('pushUserStroke',myID);
    }
  }

  p.mouseDragged = function(e) {
    let t = e.srcElement || e.target;//for ie

    //canvasでドラッグした時だけ実行したい。スライダー操作の時などに反応しないようにcanvasかどうか判定して条件分岐。
    if(t == thisRenderer2dObj.canvas){

      p.cursor(p.CROSS);

      //マウス座標
      let point = {x:e.offsetX, y:e.offsetY};

      //アルファ値
      myColor[3] = sliderAlpha.value();

      //ボーダーの太さ
      myBorderW = sliderBorderW.value();

      //色
      let tempCol = [myColor[0],myColor[1],myColor[2],myColor[3]];

      //送信データをセット
      myData = {
        socketId: myID,
        clr: tempCol,
        bdW: myBorderW,
        p: point
      };

      //サーバーに送信
      socket.emit('updateUserData',myData);

    };

  };

  p.mouseReleased = function(e){}

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }


  /*----------------------

  カスタムブラシ

  -----------------------*/
  function drawPath(){
    p.strokeCap(p.ROUND);
    //p.strokeCap(p.SQUARE);
    //p.strokeCap(p.PROJECT);
    p.noFill();
    for(let i=0; i<lines.length; i++){
      let line = lines[i];
      p.push();
        p.noFill();
        p.beginShape();
          for(let j = 0; j<line.length; j++){
            let c = p.color(line[j].clr[0],line[j].clr[1],line[j].clr[2],line[j].clr[3]);
            p.stroke(c);
            p.strokeWeight(line[j].bdW);
            p.vertex(line[j].p.x,line[j].p.y);
          }
        p.endShape();
      p.pop();
    }

  }

  function clearCanvas(){
    //socket.emit('allClearCanvas');
    lines = [];
    p.clear();
  }


}
new p5(scketch);









/*--

  canvas colorPicker saturation brightness

------------------------------------*/
let colorPicker__selectSatBriSketch = function(p){

  let pd;
  let cvsW = 100;
  let cvsH = 100;
  let thisRenderer2dObj;

  p.setup = function(){
    p.background(0);
    p.colorMode(p.HSB, cvsW);
    pd = p.pixelDensity();

    //dom作成
    colorPicker__selectSatBri = p.createDiv('');
    colorPicker__selectSatBri.id('colorPicker__selectSatBri');
    panelInnerBox.child(colorPicker__selectSatBri);

    //canvas作成
    thisRenderer2dObj = p.createCanvas(cvsW, cvsH);
    thisRenderer2dObj.mousePressed(changeColor);//こうするとthisRenderer2dObjがクリックされた時だけ呼び出されるのでmainCanvasに影響しない。
    thisRenderer2dObj.parent("colorPicker__selectSatBri");
    p.noLoop();
  }

  p.draw = function(){
    p.colorMode(p.HSB, 100);
    drawColor();
    p.loadPixels();
  }

  p.mousePressed = function(e){
    //ここはmainCanvasもクリックを検知してしまうので注意
  }

  function changeColor(e){
    /*
    noLoopしてるとmouseXなどが全部0で返ってくる仕様らしい。なのでeで普通にclientXのほうを使う。
    https://github.com/processing/p5.js/issues/1205
    */
    p.cursor(p.CROSS);
    let mx = e.offsetX;//http://phpjavascriptroom.com/?t=js&p=event_object
    let my = e.offsetY;

    //ピクセルの色取得
    let pos = (4 * cvsW * pd * my) + (4 * mx * pd);
    let r = p.pixels[pos];//画像の場合はp.getでいけるがcanvasの塗りの場合はp.pixels[]でやる必要がある
    let g = p.pixels[pos+1];
    let b = p.pixels[pos+2];

    myColor[0] = r;
    myColor[1] = g;
    myColor[2] = b;

  }

  function drawColor(){
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        p.stroke(pickerHue, 100-j, i);
        p.point(i, j);
      }
    }
  }

}
colorPickerSelectSatBriSketch_p5 = new p5(colorPicker__selectSatBriSketch);



/*--

  canvas colorPicker hue

------------------------------------*/
let colorPicker__selectHueSkech = function(p){

  let pd;
  let cvsW = 100;
  let cvsH = 15;
  let thisRenderer2dObj;

  p.setup = function(){
    p.background(0);
    p.colorMode(p.HSB, cvsW);
    pd = p.pixelDensity();

    //dom作成
    colorPicker__selectHue = p.createDiv('');
    colorPicker__selectHue.id('colorPicker__selectHue');
    panelInnerBox.child(colorPicker__selectHue);

    //canvas作成
    thisRenderer2dObj = p.createCanvas(cvsW, cvsH);
    thisRenderer2dObj.mousePressed(changeColor);//こうするとthisRenderer2dObjがクリックされた時だけ呼び出されるのでmainCanvasに影響しない。
    thisRenderer2dObj.parent("colorPicker__selectHue");

    p.noLoop();
  }

  p.draw = function(){

    p.colorMode(p.HSB, 100);
    for (let k = 0; k < cvsW; k++) {
      for (let h = 0; h < cvsH; h++) {
        p.stroke(k, 100, 100);
        p.point(k, h);
      }
    }
    p.loadPixels();

  }

  p.mousePressed = function(e){
    //ここはmainCanvasもクリックを検知してしまうので注意
  }

  function changeColor(e){
    /*
    最新のp5だとnoLoopにした場合mouseXなどが全部0で返ってくるらしい。バグかは不明。なのでeで普通にclientXのほうを使う。
    https://github.com/processing/p5.js/issues/1205
    */
    p.cursor(p.CROSS);
    let mx = e.offsetX;//http://phpjavascriptroom.com/?t=js&p=event_object
    let my = e.offsetY;

    //ピクセルの色取得
    let pos = (4 * cvsW * pd * my) + (4 * mx * pd);
    let r = p.pixels[pos];//画像の場合はp.getでいけるがcanvasの塗りの場合はp.pixels[]でやる必要がある
    let g = p.pixels[pos+1];
    let b = p.pixels[pos+2];

    //RGBからHSBに変換 hueのみ
    let hue = getHue(r,g,b);
    hue = p.map(hue,0,360,0,100);

    //色相を更新
    pickerHue = hue;

    //彩度明度ピッカーを再描画
    colorPickerSelectSatBriSketch_p5.draw();

    //ドローイングの色を更新
    myColor[0] = r;
    myColor[1] = g;
    myColor[2] = b;

  }

  function getHue(r,g,b){
    let hue;
    let max = p.max(r,g,b);
    let min = p.min(r,g,b);

    if(max == r){
      hue = ((g-b)/(max-min)) * 60;
    }else if(max == g){
      hue = ((b-r)/(max-min)) * 60 + 120;
    }else if(max == b){
      hue = ((r-g)/(max-min)) * 60 + 240;
    }else if(r == g && g == b){
      hue = 0;
    }

    if(hue<0){
      hue += 360;
    }

    hue = p.floor(hue);

    return hue;

  }

}
new p5(colorPicker__selectHueSkech);
