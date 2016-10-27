var socket = io();

$(function() {
    socket.on('new image', function(url) {
        var newitem = $('<div class="image"><img class="img-rounded" src="' + url + '"><h4>Scary</h4></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });
});
