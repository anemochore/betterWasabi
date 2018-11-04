// ==UserScript==
// @name better wasabi
// @namespace
// @description lol
// @author feelyou
// @match http://wasabisyrup.com/*
// @run-at document-end
// @grant none
// @version 2018-11-5
// @credit
// ==/UserScript==


//ad block
$('*[class*="impactify"]').remove();
document.getElementById('header-anchor').style.display = 'none';
document.getElementById('footer-anchor').style.display = 'none';


//default setting start
//*********************
let isDualViewMode    = true; //if most images have the same widths, this will be false
let isRightToLeftMode = true; //works only when isDualViewMode is true
let insertBlankFirst  = true; //works only when isDualViewMode is true
//*******************
//default setting end


//https://medium.com/snips-ai/how-to-block-third-party-scripts-with-a-few-lines-of-javascript-f0b08b9c4c0
const observer = new MutationObserver(mutations => {
  mutations.forEach(({ addedNodes }) => {
    addedNodes.forEach(node => {
      if(node.nodeType === 1 && node.className.indexOf('impactify') > -1) 
        node.parentElement.removeChild(node);
    });
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});


//msg-box for alert2()
let msgTimer;
let msg = document.createElement('div');
with(msg.style) {
  display = 'none';
  position = 'fixed';
  top = '47.5%';
  left = '45%';
  textAlign = 'center';
  width = '300px';
  padding = '0';
  border = '1px solid LightSeaGreen';
  backgroundColor = 'LawnGreen ';
  zIndex = '999999';
  overflow = 'auto';
}
document.body.appendChild(msg);

//navigation buttons
let isAtTheEdgeOfPage = false;

let [prevButton, nextButton] = (() => {
  let prevButton = document.querySelector('a.btn.btn-go-prev');
  let nextButton = document.querySelector('a.btn.btn-go-next');
  if(prevButton && !prevButton.href) prevButton = null;
  if(nextButton && !nextButton.href) nextButton = null;
  return [prevButton, nextButton];
})();

//imgs
let areImagesFixed;

let imgs = (() => {
  let targetDiv = document.getElementById('gallery_vertical');
  let imgs = [...targetDiv.querySelectorAll('img.lz-lazyloading')];
  for(let i=0, len=imgs.length; i<len; i++) {
    let img = imgs[i];
    img.src = img.getAttribute("data-src");
    img.className = 'lz-lazyloaded';
  }
  
  const MINIMUM_WIDTH = 100;
  if(imgs[imgs.length-1].naturalWidth < MINIMUM_WIDTH) {
    $(imgs[imgs.length-1]).remove();
    imgs = imgs.slice(0, imgs.length-1);
  }
  imgs = [...targetDiv.querySelectorAll('img.lz-lazyloaded')];
  return imgs;
})();

let img0 = imgs[0].cloneNode();
let width0;
img0.src = '/template/images/transparent.png';

let addedListeners = {};
let isSilentRun = true;
$(window).on("load", () => {
  function addWindowListenerIfNone(eventType, fun) {
    if(addedListeners[eventType]) return;
    addedListeners[eventType] = fun;
    window.addEventListener(eventType, fun);
  }
  addWindowListenerIfNone('resize', resizeAllimages);
  
  function addAttributesIfNone() {
    if(imgs[0].hasAttribute('page')) return;

    class Page {
      constructor(orientation = 'right') {
        this.orientation = orientation;
      }

      /*
      get next() {
        if(this.orientation === 'left') 
          return 'right';
        else 
          return 'left';
      }
      */

      turn() {
        if(this.orientation === 'left') 
          this.orientation = 'right';
        else 
          this.orientation = 'left';
        return this.orientation;
      }
    }
    
    let widths = imgs.map(img => img.naturalWidth);
    let heights = imgs.map(img => img.naturalHeight);
    let testWidths = widths.slice(1, widths.length-1);
    let testHeights = heights.slice(1, heights.length-1);
    let modeWidth = getMode(testWidths); //no need to slice
    let modeHeight = getMode(testHeights); //no need to slice
    
    let maxWidth = Math.max(...testWidths);
    let minWidth = Math.min(...testWidths);
    
    if(modeWidth > modeHeight) { //가로가 세로보다 넓은 이미지가 대다수라면 강제로 싱글 뷰 모드
      for(let i=0, len=imgs.length; i<len; i++) 
        imgs[i].setAttribute('page', 'double');
      
      areImagesFixed = true;
      isDualViewMode = false;
    }
    else {
      areImagesFixed = true;
      if(isAlmostEqual(modeWidth*2, maxWidth)) //이미지 너비 최빈값*2가 최대 너비와 거의 같다면 믹스트 모드
        areImagesFixed = false;
      
      console.log('mixed images!');  //dev
      
      //setting first blank
      width0 = modeWidth;
      
      //assuming isRightToLeftMode is false at the time of initializing
      //then, the first blank page should be left
      let currentPage = new Page('right');
      if(insertBlankFirst) {
        $(imgs[0]).before(img0);
        imgs = [img0].concat(imgs);
        widths = [width0].concat(widths);
      }
      
      if(areImagesFixed) 
        for(let i=0, len=imgs.length; i<len; i++) 
          imgs[i].setAttribute('page', currentPage.turn());
      else {
        if(isAlmostEqual(widths[0], maxWidth)) 
          imgs[0].setAttribute('page', 'double');
        else 
          imgs[0].setAttribute('page', currentPage.turn());
        
        for(let i=1, len=imgs.length; i<len; i++) 
          if(isAlmostEqual(widths[i], maxWidth)) 
            imgs[i].setAttribute('page', 'double');
          else 
            if(imgs[i-1].getAttribute('page') === 'double') {
              imgs[i].setAttribute('page', 'fixed-left');
              currentPage.orientation = 'left';
            }
            else 
              imgs[i].setAttribute('page', currentPage.turn());
      }
    }
      
    function getMode(arr) {
      return arr.sort((a,b) =>
        arr.filter(v => v===a).length - arr.filter(v => v===b).length
      ).pop();
    }
    
    function isAlmostEqual(a, b) {
      const THRESHOLD = 0.9;
      
      if(a > b) [a, b] = [b, a];  //B should be greater than A
      return a/b > THRESHOLD;
    }
  }
  addAttributesIfNone();
  
  function addKeyDownListernerIfNone() {
    if(document.onkeydown) return;
  
    document.onkeydown = evt => {
      let nearestImgIdx = findAbsMinIdx(imgs);
      let img = imgs[nearestImgIdx];
      
      let key = evt.key;
      if(evt.shiftKey) key = 'Shift+' + key;
      else if(evt.keyCode === 9) key = 'Tab';
      console.log(key + ' pressed');  //dev
      
      switch(key) {
        case '~':
          if(isSilentRun) {
            flushImages();
            img.scrollIntoView();
          }
          break;
        case 'v':
        case 'V':
          if(isDualViewMode) {
            if(isRightToLeftMode) {
              isSilentRun = true;
              document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
              isSilentRun = false;
            }
              
            if(insertBlankFirst) {
              $(img0).remove();
              imgs = imgs.slice(1);
            }
            else {
              img0.setAttribute('page', 'right');
              $(imgs[0]).before(img0);
              imgs = [img0].concat(imgs);
            }
            
            for(let i=0, len=imgs.length; i<len; i++) { 
              if(imgs[i].getAttribute('page') === 'double') break;

              if(imgs[i].getAttribute('page') === 'left')
                imgs[i].setAttribute('page', 'right');
              else if(imgs[i].getAttribute('page') === 'right')
                imgs[i].setAttribute('page', 'left');
            }
            
            if(isRightToLeftMode) {
              isSilentRun = true;
              document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
              isSilentRun = false;
            }
            
            insertBlankFirst = !insertBlankFirst;
            flushImages();
            img.scrollIntoView();
            alert2("Insert Blank First Page: " + insertBlankFirst + " (dual view mode)");
          }
          break;
        case 'Tab':
          evt.preventDefault();
          if(isDualViewMode) {
            for(let i=0, len=imgs.length; i<len-1; i++) {
              if(imgs[i].getAttribute('page') !== 'double' && imgs[i+1].getAttribute('page') !== 'double') {
                [imgs[i], imgs[i+1]] = [imgs[i+1], imgs[i]];
                i++;
              }
            }
            
            for(let i=0, len=imgs.length; i<len; i++) 
              if(imgs[i].getAttribute('page') === 'left')
                imgs[i].setAttribute('page', 'right');
              else if(imgs[i].getAttribute('page') === 'right')
                imgs[i].setAttribute('page', 'left');
              
            flushImages();
            img.scrollIntoView();
            if(!isSilentRun) {
              isRightToLeftMode = !isRightToLeftMode;
              alert2("Right-To-Left Mode: " + isRightToLeftMode + " (dual view mode)");
            }
          }
          break;
        case '1':
          if(isDualViewMode) {
            if(isRightToLeftMode) {
              isSilentRun = true;
              document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
              isSilentRun = false;
            }
            isDualViewMode = false;
            
            flushImages();
            img.scrollIntoView();
            alert2("Single View Mode");
          }
          break;
        case '2':
          if(!isDualViewMode) {
            isDualViewMode = true;
            if(isRightToLeftMode) {
              isSilentRun = true;
              document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
              isSilentRun = false;
            }
            
            flushImages();
            img.scrollIntoView();
            alert2("Dual View Mode");
          }
          break;
        case ' ':
        case 'Spacebar':
        case 'PageDown':
          evt.preventDefault();
          
          let offsetDown = 0;
          if(img.y <= 0 && nearestImgIdx < imgs.length-1) {
            offsetDown = 1;
            if(isDualViewMode && img.getAttribute('page') !== 'double' && nearestImgIdx < imgs.length-2 && imgs[nearestImgIdx+1].y === img.y)
              offsetDown = 2;
            isAtTheEdgeOfPage = false;
            imgs[nearestImgIdx+offsetDown].scrollIntoView();
          }
          else if(img.y === 0){
            if(!isAtTheEdgeOfPage) {
              isAtTheEdgeOfPage = true;
              alert2('Press PgDn again to go to the next episode.');
            }
            else 
              if(nextButton) nextButton.click();
              else alert2("No 'next episode' button detected!");
          }
          else imgs[nearestImgIdx+offsetDown].scrollIntoView();
          break;
        case 'Shift+ ':
        case 'Shift+Spacebar':
        case 'PageUp':
          evt.preventDefault();
          
          let offsetUp = 0;
          if(img.y >= 0 && nearestImgIdx > 0) {
            offsetUp = -1;
            if(isDualViewMode && img.getAttribute('page') !== 'double' && nearestImgIdx > 2 && imgs[nearestImgIdx-1].y === img.y)
              offsetUp = -2;
            isAtTheEdgeOfPage = false;
            imgs[nearestImgIdx+offsetUp].scrollIntoView();
          }
          else if(img.y === 0){
            if(!isAtTheEdgeOfPage) {
              isAtTheEdgeOfPage = true;
              alert2('Press PgUp again to go to the previous episode.');
            }
            else 
              if(prevButton) prevButton.click();
              else alert2("No 'previous episode' button detected!");
          }
          else imgs[nearestImgIdx+offsetUp].scrollIntoView();
      }
    
      function findAbsMinIdx(arr) {
        //https://codeburst.io/javascript-finding-minimum-and-maximum-values-in-an-array-of-objects-329c5c7e22a2
        let min = Math.abs(arr[0].y), minIdx = 0;

        for(let i=1, len=arr.length; i<len; i++) {
          let v = Math.abs(arr[i].y);
          if(v < min) {
            min = v;
            minIdx = i;
          }
        }

        return minIdx;
      }
      
      function flushImages() {
        if(isDualViewMode) {
          for(let i=0, len=imgs.length; i<len; i++) {
            imgs[i].style.display = 'inline';
            imgs[i].style.verticalAlign = 'top';
          }
        }
        else 
          for(let i=0, len=imgs.length; i<len; i++) 
            imgs[i].style.display = 'block';
        
        if((!insertBlankFirst && isRightToLeftMode) || !isDualViewMode) 
          img0.style.display = 'none';
        
        let div = document.getElementById('gallery_vertical');
        for(let i=0, len=imgs.length; i<len; i++) 
          div.removeChild(imgs[i]);
        
        let brs = div.querySelectorAll('br.fy-br');
        for(let i=0, len=brs.length; i<len; i++) 
          div.removeChild(brs[i]);
        
        for(let i=0, len=imgs.length; i<len; i++) 
          div.appendChild(imgs[i]);

        imgs = [...div.querySelectorAll('img.lz-lazyloaded')];
        
        if(isDualViewMode) 
          for(let i=0, len=imgs.length-1; i<len; i++) 
            if(imgs[i].getAttribute('page') === 'right' || imgs[i].getAttribute('page') === 'double' || imgs[i+1].getAttribute('page') === 'double')
              $(imgs[i]).after('<br class="fy-br">');
      }
    };
  }
  addKeyDownListernerIfNone();

  //first run
  (() => {
    alert2('isDualViewMode: '     + isDualViewMode + '<br>' +
          ' isRightToLeftMode: '  + isRightToLeftMode + '<br>' +
          ' insertBlankFirst: '   + insertBlankFirst);
    
    if(isRightToLeftMode) 
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Tab'}));
    else 
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': '~'}));
    
    isSilentRun = false;
  })();
  
  function resizeAllimages() {
    const HEIGHT = window.innerHeight;
    const MARGIN_TOP_BOTTOM = 2;
    
    for(let i=0, len=imgs.length; i<len; i++) 
      imgs[i].height = HEIGHT - MARGIN_TOP_BOTTOM;
    
    let root = document.getElementById('root');
    root.style.maxWidth = '90%';
    
    if(insertBlankFirst) {
      let lastNotDoublePage, len=imgs.length;
      for(lastNotDoublePage=len-1; lastNotDoublePage>=0; lastNotDoublePage--) 
        if(imgs[lastNotDoublePage].getAttribute('page') !== 'double') break;
      
      if(lastNotDoublePage < 0) lastNotDoublePage = len - 1;
      img0.width = imgs[lastNotDoublePage].width;
      img0.height = imgs[lastNotDoublePage].height;
    }
  }
  resizeAllimages();

  
  //utils
  function alert2(text) {
    msg.innerHTML = text;
    if(msgTimer) clearTimeout(msgTimer);
    $(msg).show();
    
    msgTimer = setTimeout(() => {
      $(msg).fadeOut();
    }, 2000);
  }
});
