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

function animateBg(color) {
    $("body").animate({
        backgroundColor: $.Color(color)
    });
}

function handleLogState(state) {
    if (state === 'snapshot-in-progress') {
        animateBg("red");
    } else {
        if ($("body").css('background-color') !== origBodyBackground)
            animateBg(origBodyBackground);
    }

    if (state === 'waiting-for-frame-exit')
        $("#waiting-for-exit").slideDown();
    else
        $("#waiting-for-exit").slideUp();
}

var origBodyBackground;

$(function() {
    origBodyBackground = $("body").css('background-color');

    socket.on('new image', function(image) {
        var newitem = $('<div class="image"><a href="/thing/' + image.id + '"><img class="img-rounded" src="' + image.url + '"></a><h4>Scary thing <a class="text-red" href="/thing/' + image.id + '">#' + image.id + '</a></h4></div>').hide();
        $("#image-list").prepend(newitem);
        newitem.slideDown();
    });

    socket.on('syslog', function(messages) {
        messages.forEach(function(m) {
            $("#syslog").append("<p>" + m + "</p>");
        });
        $("#syslog").scrollTop($("#syslog")[0].scrollHeight);
    });

    socket.on('logstate', handleLogState);

    $("#the-fb-share-btn").on('click', function() {
        FB.ui({
            method: 'share',
            href: window.location.href,
        }, function(response){});
    });
});
