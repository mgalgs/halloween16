var socket = io();

$(function() {
    socket.on('new image', function(image) {
        var newitem = $('<div class="image"><img class="img-rounded" src="' + image.url + '"><h4>Scary thing #' + image.id + '</h4></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });
});
