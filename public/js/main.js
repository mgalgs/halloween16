var socket = io();

window.fbAsyncInit = function() {
    FB.init({
        appId      : '1791614747794640',
        xfbml      : true,
        version    : 'v2.8'
    });
    FB.AppEvents.logPageView();
};

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

$(function() {
    socket.on('new image', function(image) {
        var newitem = $('<div class="image"><a href="/thing/' + image.id + '"><img class="img-rounded" src="' + image.url + '"></a><h4>Scary thing <a class="text-red" href="/thing/' + image.id + '">#' + image.id + '</a></h4></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });

    socket.on('syslog', function(msg) {
        $("#syslog").append("<p>" + msg + "</p>");
        $("#syslog").scrollTop($("#syslog")[0].scrollHeight);
    });

    $("#the-fb-share-btn").on('click', function() {
        FB.ui({
            method: 'share',
            href: window.location.href,
        }, function(response){});
    });
});
