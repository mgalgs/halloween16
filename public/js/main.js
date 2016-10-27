var socket = io();

$(function() {
    socket.on('new image', function(image) {
        var newitem = $('<div class="image"><a href="/thing/' + image.id + '"><img class="img-rounded" src="' + image.url + '"></a><h4>Scary thing <a class="text-red" href="/thing/' + image.id + '">#' + image.id + '</a></h4></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });
});
