/**
 * Created by Brandon on 7/21/2015.
 */
(function () {
    var close = function(){
        window.open('', '_self', '');
        window.close();
    };
    function initializeWindow(){
        document.getElementById("cancelButton").addEventListener('click',close);
    }
    window.addEventListener('load', initializeWindow);
}());
