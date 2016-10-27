var socket = io();

$(function() {
    socket.on('new image', function(url) {
        var newitem = $('<div class="image"><img src="' + url + '"></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });
});
