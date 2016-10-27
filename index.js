require("console-stamp")(console);
const util = require('util');
var mkdirp = require('mkdirp');
var mmmagic = require('mmmagic');
var magic = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);
var redis = require("redis"),
    redisClient = redis.createClient();
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
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
    if (!process.env.hasOwnProperty('API_KEY')) {
        console.error("Missing API key. Please set API_KEY in your environment.");
        process.exit(1);
    }
    mkdirp('public/uploads', function(err) {
        if (err) {
            console.error("Couldn't create uploads dir: %s", err);
            process.exit(1);
        }
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

function imageInfo(image_id) {
    return {
        url: imageURL(image_id),
        id: image_id
    }
}

function imageView(req, res, start) {
    redisClient.lrange('ween16:image_list', start, -1, function(err, items) {
        var images;

        if (err) {
            res.status(500).send(err);
            return;
        }
        images = items.reverse().map(imageInfo);
        res.render('index', {
            images: images,
            start: start,
            is_admin: is_admin(req)
        });
    });
}

function is_admin(req) {
    return req.query.token == process.env.API_KEY;
}

app.get('/', function(req, res) {
    console.log('Get of /');
    imageView(req, res, -10);
});

app.get('/browse', function(req, res) {
    console.log('Get of /browse');
    imageView(req, res, 0);
});

app.post('/delete', function(req, res) {
    console.log('Deleting %d', req.body.id)
    redisClient.lrem('ween16:image_list', 1, req.body.id, function(err, nremoved) {
        if (err) {
            res.status(500).send(err);
        }
        res.redirect('/');
    });
});

app.post('/upload', function(req, res) {
    console.log('Got an upload!');

    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }

    if (req.body.token !== process.env.API_KEY) {
        res.send('Invalid auth token');
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
            magic.detectFile(filename, function(err, result) {
                if (err) {
                    res.status(500).send(err);
                    return;
                }
                if (result !== 'image/jpeg') {
                    res.status(500).send('Invalid image format: ' + result);
                    return;
                }
                redisClient.rpush('ween16:image_list', image_id);
                io.emit('new image', imageInfo(image_id));
                res.send('File uploaded!');
            });
        });
    });
});

http.listen(8081, function () {
    console.log('halloween16 app listening on port 8081!');
});
