(function () {
  var close = function(){
    window.open('', '_self', ''); 
    window.close();
  };
  var openHowToHBMode = function(){
    chrome.browser.openTab({
      url: 'http://hummingbirdkit.com/learning/switching-arduino-mode-hummingbird-mode'
    });
    close();
  };
  
  function initializeWindow(){
       document.getElementById("popUpButton").addEventListener('click',openHowToHBMode);
       document.getElementById("closeButton").addEventListener('click',close);
  }
  
 window.addEventListener('load', initializeWindow);
}());
