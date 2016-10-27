var socket = io();

$(function() {
    socket.on('new image', function(url) {
        $("#image-list").prepend('<div class="image"><img src="' + url + '"></div>').animate();
    });
});
