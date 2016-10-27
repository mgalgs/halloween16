require("console-stamp")(console);
const util = require('util');
var mkdirp = require('mkdirp');
var redis = require("redis"),
    redisClient = redis.createClient();
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(fileUpload());
app.use(express.static('public'))

app.set('view engine', 'pug');

redisClient.on("error", function (err) {
    console.log("Error " + err);
});

io.on('connection', function(socket){
    console.log('a user connected');
});

function initEnvironment() {
    mkdirp('public/uploads', function(err) {
        if (err)
            console.error("Couldn't create uploads dir: %s", err);
    });
}

initEnvironment();

function imageFromBase(image_id) {
    return util.format('/uploads/%s.jpg', image_id);
}

function imagePath(image_id) {
    return 'public' + imageFromBase(image_id);
}

function imageURL(image_id) {
    return imageFromBase(image_id);
}

app.get('/', function (req, res) {
    console.log('Get of /')
    redisClient.lrange('ween16:image_list', 0, -1, function(err, items) {
        var images;

        if (err) {
            res.status(500).send(err);
            return;
        }
        images = items.reverse().map(imageURL);
        res.render('index', {
            images: images
        });
    });
});

app.post('/upload', function(req, res) {
    console.log('Got an upload!');

    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    redisClient.incr('ween16:image:id', function(err, image_id) {
        var file, filename;
        if (err) {
            res.status(500).send(err);
            return;
        }

        filename = imagePath(image_id);
        file = req.files.file;
        file.mv(filename, function(err) {
            if (err) {
                res.status(500).send(err);
                return;
            }
            redisClient.rpush('ween16:image_list', image_id);
            io.emit('new image', imageURL(image_id));
            res.send('File uploaded!');
        });
    });
});

http.listen(8080, function () {
    console.log('Example app listening on port 8080!');
});
