'use strict';

//socket io
let socket;

//p5
let colorPickerSelectSatBriSketch_p5;

//scketch
let clientsObj;
let myData;
let myColor;
let myAngle = 0;
let myDiff = 0;
let myPattern = 'path';
let myBorderW;
let myDragFlag = false;
let myHistoryPoints = [];
let myPathArr = [];
let myPath = {};
let myCurrentP = {x:-9999,y:-9999};

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

//
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
    //p.blendMode(p.ADD);
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

    sliderAlpha = p.createSlider(0,255,100);
    sliderAlpha.id('sliderAlpha');
    panelInnerBox.child(sliderAlpha);

    ttlSliderBorderW = p.createP('border width');
    ttlSliderBorderW.id('ttlSliderBorderW');
    panelInnerBox.child(ttlSliderBorderW);

    sliderBorderW = p.createSlider(1,40,1);
    sliderBorderW.id('sliderBorderW');
    panelInnerBox.child(sliderBorderW);

    myColor = [0,0,0,sliderAlpha.value()];

    myData = {
      pathArr:myPathArr,
      path:myPath,
      drag: myDragFlag
    };

    /*--
      socket io
    ------------------------------------*/
    socket = io();

    //サーバーからクライアントデータを受け取る
    socket.on('setClientData',function(clients){
      clientsObj = clients;
      p.redraw();
    });

    //サーバーからチャット情報を受け取る
    socket.on('chatInfoUpdate',function(chatData){
      let chatNum = document.getElementById('chatNum');
      chatNum.innerHTML = chatData.length;
    });

    socket.on('clearCanvas',function(){
      myPath = {};
      myPathArr = [];
      myData.pathArr = myPathArr;
      myData.path = myPath;
      p.clear();
    });

    //ウィンドウを閉じたらサーバーに通信切断を通知する
    socket.on('disconnect',function(){
      socket.emit('disconnect');
    });

    p.noLoop();

  }//end setup


  p.draw = function(){
    //p.clear();
    //p.background(0);
    //p.background(255);
    //p.fill(255,255,255,50);
    //p.rect(0,0,p.windowWidth, p.windowHeight);


    p.clear();
    for(let key in clientsObj) {
      if(clientsObj.hasOwnProperty(key)) {
        // if(clientsObj[key].drag){
        //
        // }
        drawPath(clientsObj[key]);
      }
    }

    p.noLoop();

  }// end draw

  p.mousePressed = function(e){
    let t = e.srcElement || e.target;//for ie
    if(t == thisRenderer2dObj.canvas){
      myDragFlag = true;
      myHistoryPoints = [];
    }
  }

  p.mouseDragged = function(e) {
    let t = e.srcElement || e.target;//for ie

    //canvasでドラッグした時だけ実行したい。スライダー操作の時などに反応しないようにcanvasかどうか判定して条件分岐。
    if(t == thisRenderer2dObj.canvas){

      p.cursor(p.CROSS);

      myCurrentP.x = e.offsetX;
      myCurrentP.y = e.offsetY;

      //座標ヒストリー
      let point = {x:myCurrentP.x,y:myCurrentP.y};
      myHistoryPoints.push(point);

      //アルファ値
      myColor[3] = sliderAlpha.value();

      //ボーダーの太さ
      myBorderW = sliderBorderW.value();

      //今回のストロークの色
      let tempCol = [myColor[0],myColor[1],myColor[2],myColor[3]];

      //今回のドラッグのパスデータ
      myPath = {clr:tempCol, bdW: myBorderW, points: myHistoryPoints};

      //データをセット
      myData = {
        pathArr:myPathArr,
        path:myPath,
        drag: myDragFlag
      };

      //サーバーに送信
      socket.emit('updateData',myData);

    };

  };

  p.mouseReleased = function(e){
    let t = e.srcElement || e.target;//for ie
    if(t == thisRenderer2dObj.canvas){
      myDragFlag = false;
      myData.drag = myDragFlag;
      //今回のpathをpathのストックに追加
      myPathArr.push(myPath);

    }
  }

  p.windowResized = function() {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }


  /*----------------------

  カスタムブラシ

  -----------------------*/
  function drawPath(cltObj){
    p.strokeCap(p.ROUND);
    //p.strokeCap(p.SQUARE);
    //p.strokeCap(p.PROJECT);
    p.noFill();
    p.push();
      let c = p.color(cltObj.path.clr[0],cltObj.path.clr[1],cltObj.path.clr[2],cltObj.path.clr[3]);
      p.stroke(c);
      p.strokeWeight(cltObj.path.bdW);
      p.beginShape();
      for(let i = 0; i<cltObj.path.points.length; i++){
        let h = cltObj.path.points[i];
        p.vertex(h.x,h.y);
      }
      p.endShape();
    p.pop();

    if(cltObj.pathArr.length > 0){
      for(let i = 0; i<cltObj.pathArr.length; i++){
        let thisPath = cltObj.pathArr[i];
        p.push();
          let c = p.color(thisPath.clr[0],thisPath.clr[1],thisPath.clr[2],thisPath.clr[3]);
          p.stroke(c);
          p.strokeWeight(thisPath.bdW);
          p.beginShape();
          for(let i = 0; i<thisPath.points.length; i++){
            let h = thisPath.points[i];
            p.vertex(h.x,h.y);
          }
          p.endShape();
        p.pop();
      }
    }

  }


  function clearCanvas(){
    socket.emit('allClearCanvas');
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

    //
    pickerHue = hue;
    colorPickerSelectSatBriSketch_p5.draw();

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
